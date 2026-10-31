import type { Difficulty, DiceRollResult, SanityRollResult, SkillRollResult } from 'coc7-engine';

/** Socket.IO event names shared by client and server. */
export const SOCKET_EVENTS = {
  createRoom: 'room:create',
  joinRoom: 'room:join',
  resumeRoom: 'room:resume',
  takenCharacters: 'room:taken',
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
  handoutChange: 'handout:change',
} as const;

export interface Player {
  id: string;
  name: string;
  isKeeper: boolean;
  connected: boolean;
  /** Which investigator this player is at the table (a ready-made one's key, or the id of one they
   * made). Only one connected player may hold a given investigator. Absent for the Keeper. */
  characterKey?: string;
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

/** An image the Keeper brought themselves (say, a map cropped from their own copy of a
 * scenario). It only ever exists on the Keeper's device and, while it's on display, in the room's
 * memory — the server never keeps one that isn't being shown. */
export interface HandoutImage {
  /** Keeper's own label for it; used as the image's alt text, never as a visible caption. */
  title: string;
  /** A `data:image/(jpeg|png|webp);base64,…` URL, already shrunk by the Keeper's client. */
  dataUrl: string;
}

/** One image on display: a bundled handout (`id` is its slug, `upload` is null — the image is part
 * of the web app, not sent over the wire) or a Keeper-uploaded one (`id` is the Keeper's own id for
 * it, `upload` carries the picture). */
export interface ShownHandout {
  id: string;
  upload: HandoutImage | null;
}

/**
 * Everything the Keeper is currently showing the table, in the order they were put up. Any number
 * can be up at once (the server caps it). Late joiners are sent this too, and nobody but the
 * Keeper can change it.
 */
export interface HandoutState {
  shown: ShownHandout[];
}

/** One step in the Keeper's handout display: put one up (showing one that's already up leaves it
 * where it is), take one down, or take everything down. The server checks it, applies it, and
 * relays the same shape to the room as `handout:change`. */
export type HandoutChange =
  | { type: 'show'; item: ShownHandout }
  | { type: 'hide'; id: string }
  | { type: 'clear' };

export interface SetHandoutRequest {
  roomCode: string;
  playerId: string;
  change: HandoutChange;
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
      /** Secret that lets this player come back to the room as themself (see `room:resume`). */
      resumeToken: string;
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
  /** The investigator's name. */
  name: string;
  /** Which investigator is being played (see `Player.characterKey`). Required: there's no playing
   * as a guest, and the server refuses one that another connected player already holds. */
  characterKey: string;
}

/** Which investigators are already taken in a room, so a join form can grey them out before
 * anyone tries. */
export interface TakenCharactersRequest {
  roomCode: string;
}
export type TakenCharactersResponse = { ok: true; taken: string[] } | { ok: false; error: string };
export type JoinRoomResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
      isKeeper: boolean;
      /** Secret that lets this player come back to the room as themself (see `room:resume`). */
      resumeToken: string;
      players: Player[];
      ledger: LedgerEntry[];
      music: MusicState | null;
      scenario: string | null;
      handout: HandoutState;
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------- room:resume

/** Come back to a room after a reload or a dropped connection, as the same player (same id, same
 * role, same view of the ledger). `token` is the `resumeToken` from the original create/join —
 * player ids are visible to the whole room, so the id alone must never be enough. Answered with
 * the same payload as a join. */
export interface ResumeRoomRequest {
  roomCode: string;
  playerId: string;
  token: string;
}
export type ResumeRoomResponse = JoinRoomResponse;

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
