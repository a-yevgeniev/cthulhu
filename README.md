# coc7-engine

Rules engine for a Call of Cthulhu 7th edition dice roller. Pure TypeScript, zero runtime
dependencies, no DOM. Runs identically in a browser and on a server, which is what makes
server-authoritative rolls possible later without duplicating logic.

```bash
npm install
npm test          # 100 tests
npm run typecheck
```

## Quick start

```ts
import { skillRoll, sanityCheck, rollNotation, opposedRoll } from './src';

skillRoll(60, { modifierDice: 1, difficulty: 'hard' });
// { roll: 24, level: 'hard', succeeded: true,
//   thresholds: { regular: 60, hard: 30, extreme: 12 },
//   candidates: [84, 24], raw: { units: 4, tens: [80, 20] }, ... }

sanityCheck({ sanity: 55, loss: '1/1D6' });
rollNotation('1d6+1d4+2');
opposedRoll({ skill: 70 }, { skill: 45, modifierDice: -1 });
```

## What's covered

| Area | Functions |
|---|---|
| Success levels | `classify`, `thresholdsFor`, `meets` |
| d100 with bonus/penalty | `rollD100`, `skillRoll` |
| Pushing | `pushRoll` |
| Luck | `luckCost`, `cheapestLuckSpend`, `spendLuck` |
| Sanity | `parseSanityLoss`, `sanityCheck`, `maxSanity`, insanity durations |
| Opposed | `opposedRoll`, `resolveOpposed` |
| Notation | `rollNotation`, `isValidNotation` |
| Investigator | `derivedStats`, `buildAndDamageBonus`, `rollDamageBonus`, `moveRate`, `majorWoundThreshold`, `improvementCheck` |
| Randomness | `cryptoRng`, `seededRng`, `sequenceRng`, `rollDie` |

## Design decisions worth knowing

**Bonus and penalty dice compare completed totals, never tens digits.** A tens die showing 0
beside a units die showing 0 reads as 100 — the worst possible result, not the best. Comparing
tens digits inverts this roughly 1 roll in 100. There is a named test for it
(`compares completed totals, so a bonus die beats a 00 with 90`).

**One units die, many tens dice.** The units die is shared across all candidates. Rolling a
separate units die per candidate changes the distribution and is a common homebrew error.

**Randomness is injectable.** Every function takes an optional `Rng`. Production uses
`cryptoRng` (`crypto.getRandomValues` with rejection sampling to eliminate modulo bias). Tests
use `sequenceRng`, which replays die faces as a player would read them — `10` means the "0"
face — and throws if a test rolls more dice than it scripted.

**Results are plain serialisable objects, and nothing mutates.** `spendLuck` returns a new
result rather than editing the old one, so a roll log can hold every intermediate state.

**Failure modes throw rather than returning a fallback.** An unparseable expression, a pushed
success, or an illegal Luck spend raises. Callers surface the message; the engine never
silently invents a number that lands in someone's game.

## Rule interpretations

Some points are ambiguous or table-dependent in the rulebook. Current choices:

- `01` is a critical at any skill value, including 0. `100` is always a fumble.
- The 96–99 fumble band applies only when skill is below 50.
- Indefinite insanity triggers at one fifth of *starting* Sanity lost within one session
  (caller supplies `lostThisSession`); temporary insanity at 5+ from a single check.
- Characteristic rolls are made by passing the already-multiplied value — the engine does not
  assume ×5, since tables differ on this.
- Bonus/penalty dice stack to a maximum of 3 either way (`MAX_MODIFIER_DICE`).

If your table rules differently, these are all localised to `skill.ts` and `sanity.ts`.

## Not yet implemented

Chases, combat manoeuvres and grapples, firearms malfunction and range bands, spell casting
costs, character generation and occupation skill points. Each is additive and none require
changes to what's here.

## Next step

Wire `skillRoll` to a UI. The result object already carries everything a result panel needs:
the number, the level, the thresholds to display, and every candidate die for a "show the
dice" view.
