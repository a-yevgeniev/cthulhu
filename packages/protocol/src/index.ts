import type { Difficulty, DiceRollResult, SanityRollResult, SkillRollResult } from 'coc7-engine';

/** Socket.IO event names shared by client and server. */
export const SOCKET_EVENTS = {
  createRoom: 'room:create',
  joinRoom: 'room:join',
  playersChanged: 'room:players',
  rollSkill: 'roll:skill',
  rollNotation: 'roll:notation',
  rollSanity: 'roll:sanity',
  rollBroadcast: 'roll:new',
  requestRoll: 'roll:request',
  rollPrompt: 'roll:prompt',
} as const;

export interface Player {
  id: string;
  name: string;
  isKeeper: boolean;
  connected: boolean;
}

export type RollKind = 'skill' | 'notation' | 'sanity';

/** One row of the room's append-only ledger. */
export interface LedgerEntry {
  id: string;
  playerId: string;
  playerName: string;
  timestamp: number;
  kind: RollKind;
  /** Freeform description — a skill name, weapon name, or notation string. */
  label: string;
  /** Visible only to the keeper and the roller; other players never receive it. */
  secret: boolean;
  result: SkillRollResult | DiceRollResult | SanityRollResult;
}

// ---------------------------------------------------------------- room:create

export interface CreateRoomRequest {
  name: string;
}
export type CreateRoomResponse =
  | { ok: true; roomCode: string; playerId: string; isKeeper: true; players: Player[]; ledger: LedgerEntry[] }
  | { ok: false; error: string };

// ------------------------------------------------------------------ room:join

export interface JoinRoomRequest {
  roomCode: string;
  name: string;
}
export type JoinRoomResponse =
  | { ok: true; roomCode: string; playerId: string; isKeeper: boolean; players: Player[]; ledger: LedgerEntry[] }
  | { ok: false; error: string };

// ------------------------------------------------------------------- rolling

export interface SkillRollRequest {
  roomCode: string;
  playerId: string;
  skill: number;
  label?: string;
  difficulty?: Difficulty;
  modifierDice?: number;
  secret?: boolean;
}

export interface NotationRollRequest {
  roomCode: string;
  playerId: string;
  notation: string;
  label?: string;
  secret?: boolean;
}

export interface SanityRollRequest {
  roomCode: string;
  playerId: string;
  sanity: number;
  startingSanity?: number;
  lostThisSession?: number;
  loss: string;
  secret?: boolean;
}

export type RollAck = { ok: true; entry: LedgerEntry } | { ok: false; error: string };

// ------------------------------------------------------- keeper -> player prompt

export interface RollRequestPayload {
  roomCode: string;
  targetPlayerId: string;
  skillLabel: string;
  difficulty?: Difficulty;
  modifierDice?: number;
}

export interface RollPrompt {
  id: string;
  fromKeeperName: string;
  skillLabel: string;
  difficulty?: Difficulty;
  modifierDice?: number;
}
