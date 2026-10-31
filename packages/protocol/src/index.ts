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
  musicSet: 'music:set',
  musicState: 'music:state',
  handoutSet: 'handout:set',
  handoutState: 'handout:state',
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

// ---------------------------------------------------------------- background music

/**
 * What the room is listening to, set by the Keeper and followed by every client. The audio
 * itself is a YouTube embed each client runs locally — the server only relays this small state,
 * never any audio. There is no playback position: ambience loops, so a client that joins late
 * (or starts a moment after the others) just starts the track from the top.
 */
export interface MusicState {
  /** YouTube video id (11 characters of [A-Za-z0-9_-]). */
  videoId: string;
  /** Display name for the "now playing" line; purely cosmetic. */
  title: string;
  playing: boolean;
  /** Master volume, 0-100. Some platforms (iOS) ignore it and use the hardware volume. */
  volume: number;
}

export interface SetMusicRequest {
  roomCode: string;
  playerId: string;
  music: MusicState;
}

export type SetMusicAck = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------- handouts

/**
 * The image the Keeper is currently showing the table, or none. Images aren't sent over the
 * wire: the web app bundles a library of handouts per scenario and this is just which one (by
 * its id) is on display, so a late joiner sees it too and nobody but the Keeper can change it.
 */
export interface HandoutState {
  imageId: string | null;
}

export interface SetHandoutRequest {
  roomCode: string;
  playerId: string;
  imageId: string | null;
}

export type SetHandoutAck = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------- room:create

export interface CreateRoomRequest {
  name: string;
  /** Which prepared scenario this room is for (e.g. "haunting"); omitted for an open table. */
  scenario?: string;
}
export type CreateRoomResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
      isKeeper: true;
      players: Player[];
      ledger: LedgerEntry[];
      music: MusicState | null;
      scenario: string | null;
      handout: HandoutState;
    }
  | { ok: false; error: string };

// ------------------------------------------------------------------ room:join

export interface JoinRoomRequest {
  roomCode: string;
  name: string;
}
export type JoinRoomResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
      isKeeper: boolean;
      players: Player[];
      ledger: LedgerEntry[];
      music: MusicState | null;
      scenario: string | null;
      handout: HandoutState;
    }
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
