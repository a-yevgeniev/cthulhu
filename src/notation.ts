/**
 * Dice notation: parsing and evaluation.
 *
 * Grammar (case-insensitive, whitespace ignored):
 *
 *   expr   := term (("+" | "-") term)*
 *   term   := factor (("*" | "/") factor)*
 *   factor := "-"? atom
 *   atom   := dice | number | "(" expr ")"
 *   dice   := count? ("d" | "D") sides keep?
 *   sides  := number | "%"          // "%" means 100
 *   keep   := ("kh" | "kl") number?
 *
 * Division truncates toward zero, matching how tables actually resolve
 * "half damage" (CoC rounds down).
 *
 * Examples: 1d6+1d4, 3d6*5, 2d10+4, d%, 4d6kh3, (1d6+2)*2
 */

import { DiceGroup, DiceRollResult } from './types';
import { Rng, cryptoRng, rollDie } from './rng';

// ---------------------------------------------------------------- tokenizer

type TokenType = 'num' | 'dice' | 'op' | 'lparen' | 'rparen';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const DICE_RE = /^(\d*)[dD](\d+|%)(?:(kh|kl|KH|KL)(\d*))?/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch, pos: i++ });
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch, pos: i++ });
      continue;
    }
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i++ });
      continue;
    }
    const rest = input.slice(i);
    const dice = DICE_RE.exec(rest);
    if (dice) {
      tokens.push({ type: 'dice', value: dice[0], pos: i });
      i += dice[0].length;
      continue;
    }
    const num = /^\d+/.exec(rest);
    if (num) {
      tokens.push({ type: 'num', value: num[0], pos: i });
      i += num[0].length;
      continue;
    }
    throw new SyntaxError(`Unexpected character '${ch}' at position ${i} in "${input}"`);
  }
  return tokens;
}

// ------------------------------------------------------------------- parser

interface ParseContext {
  tokens: Token[];
  index: number;
  groups: DiceGroup[];
  rng: Rng;
  diceRolled: number;
}

const MAX_DICE_PER_EXPRESSION = 1000;
const MAX_DIE_SIDES = 1_000_000;

function peek(ctx: ParseContext): Token | undefined {
  return ctx.tokens[ctx.index];
}

function evalDiceToken(ctx: ParseContext, token: Token): number {
  const m = DICE_RE.exec(token.value)!;
  const count = m[1] === '' ? 1 : parseInt(m[1], 10);
  const sides = m[2] === '%' ? 100 : parseInt(m[2], 10);
  const keepMode = m[3] ? (m[3].toLowerCase() as 'kh' | 'kl') : undefined;
  const keepCount = keepMode ? (m[4] === '' || m[4] === undefined ? 1 : parseInt(m[4], 10)) : undefined;

  if (count < 1) throw new RangeError(`Dice count must be at least 1 in "${token.value}"`);
  if (sides < 1) throw new RangeError(`Die must have at least 1 side in "${token.value}"`);
  if (sides > MAX_DIE_SIDES) throw new RangeError(`Die size d${sides} is unreasonably large`);

  ctx.diceRolled += count;
  if (ctx.diceRolled > MAX_DICE_PER_EXPRESSION) {
    throw new RangeError(`Expression rolls more than ${MAX_DICE_PER_EXPRESSION} dice`);
  }

  const rolls: number[] = [];
  for (let n = 0; n < count; n++) rolls.push(rollDie(sides, ctx.rng));

  const dropped: number[] = [];
  if (keepMode && keepCount !== undefined && keepCount < count) {
    const order = rolls
      .map((value, index) => ({ value, index }))
      .sort((x, y) => (keepMode === 'kh' ? y.value - x.value : x.value - y.value));
    for (const { index } of order.slice(keepCount)) dropped.push(index);
    dropped.sort((x, y) => x - y);
  }

  const subtotal = rolls.reduce(
    (sum, value, index) => (dropped.includes(index) ? sum : sum + value),
    0,
  );

  ctx.groups.push({ spec: token.value, sides, rolls, dropped, subtotal });
  return subtotal;
}

function parseAtom(ctx: ParseContext): number {
  const token = peek(ctx);
  if (!token) throw new SyntaxError('Unexpected end of expression');

  if (token.type === 'lparen') {
    ctx.index++;
    const value = parseExpr(ctx);
    const close = peek(ctx);
    if (!close || close.type !== 'rparen') {
      throw new SyntaxError(`Unclosed '(' at position ${token.pos}`);
    }
    ctx.index++;
    return value;
  }
  if (token.type === 'dice') {
    ctx.index++;
    return evalDiceToken(ctx, token);
  }
  if (token.type === 'num') {
    ctx.index++;
    return parseInt(token.value, 10);
  }
  throw new SyntaxError(`Unexpected '${token.value}' at position ${token.pos}`);
}

function parseFactor(ctx: ParseContext): number {
  const token = peek(ctx);
  if (token && token.type === 'op' && token.value === '-') {
    ctx.index++;
    return -parseFactor(ctx);
  }
  if (token && token.type === 'op' && token.value === '+') {
    ctx.index++;
    return parseFactor(ctx);
  }
  return parseAtom(ctx);
}

function parseTerm(ctx: ParseContext): number {
  let value = parseFactor(ctx);
  for (;;) {
    const token = peek(ctx);
    if (!token || token.type !== 'op' || (token.value !== '*' && token.value !== '/')) break;
    ctx.index++;
    const rhs = parseFactor(ctx);
    if (token.value === '*') {
      value *= rhs;
    } else {
      if (rhs === 0) throw new RangeError('Division by zero');
      value = Math.trunc(value / rhs);
    }
  }
  return value;
}

function parseExpr(ctx: ParseContext): number {
  let value = parseTerm(ctx);
  for (;;) {
    const token = peek(ctx);
    if (!token || token.type !== 'op' || (token.value !== '+' && token.value !== '-')) break;
    ctx.index++;
    const rhs = parseTerm(ctx);
    value = token.value === '+' ? value + rhs : value - rhs;
  }
  return value;
}

// -------------------------------------------------------------- public API

/**
 * Evaluate a dice expression, rolling any dice it contains.
 * Throws SyntaxError / RangeError on malformed or abusive input.
 */
export function rollNotation(notation: string, rng: Rng = cryptoRng): DiceRollResult {
  const trimmed = notation.trim();
  if (trimmed === '') throw new SyntaxError('Empty dice expression');

  const ctx: ParseContext = {
    tokens: tokenize(trimmed),
    index: 0,
    groups: [],
    rng,
    diceRolled: 0,
  };
  const total = parseExpr(ctx);
  const leftover = peek(ctx);
  if (leftover) {
    throw new SyntaxError(`Unexpected '${leftover.value}' at position ${leftover.pos}`);
  }
  return { notation: trimmed, total, groups: ctx.groups };
}

/** True if the expression parses. Useful for live-validating an input field. */
export function isValidNotation(notation: string): boolean {
  try {
    rollNotation(notation, seededProbe());
    return true;
  } catch {
    return false;
  }
}

// A cheap deterministic RNG for validation-only parses.
function seededProbe(): Rng {
  return { nextInt: () => 0 };
}
