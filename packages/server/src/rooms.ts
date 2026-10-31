import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { HandoutState, MusicState, Player } from 'coc7-protocol';
import { createRoom, roomExists } from './db.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud

function generateCode(length = 5): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

/** In-memory record of who is currently connected to a room — the DB holds durable history,
 * this holds live socket routing. Rebuilt from scratch on server restart (players reconnect
 * and re-join), which is fine: the ledger itself survives in SQLite regardless. */
interface LiveRoom {
  code: string;
  players: Map<string, Player>;
  /** playerId -> socket id, for targeted keeper->player prompts. */
  sockets: Map<string, string>;
  /** playerId -> the secret handed to that player when they entered, which is what lets them
   * `room:resume` after a reload. Ids are visible to the whole room; tokens never are. */
  tokens: Map<string, string>;
  /** What the Keeper has playing, replayed to anyone who joins. In-memory only, like the room. */
  music: MusicState | null;
  /** Which prepared scenario the room was opened for, if any (e.g. "haunting"). */
  scenario: string | null;
  /** The handout images the Keeper is currently showing the table. */
  handout: HandoutState;
}

const liveRooms = new Map<string, LiveRoom>();

export function makeRoomCode(): string {
  let code = generateCode();
  while (roomExists(code) || liveRooms.has(code)) code = generateCode();
  return code;
}

export function makePlayerId(): string {
  return randomUUID();
}

export function openRoom(code: string, scenario: string | null = null): LiveRoom {
  createRoom(code);
  const room: LiveRoom = {
    code,
    players: new Map(),
    sockets: new Map(),
    tokens: new Map(),
    music: null,
    scenario,
    handout: { shown: [] },
  };
  liveRooms.set(code, room);
  return room;
}

export function getRoom(code: string): LiveRoom | undefined {
  return liveRooms.get(code);
}

export function addPlayer(room: LiveRoom, player: Player, socketId: string): void {
  room.players.set(player.id, player);
  room.sockets.set(player.id, socketId);
}

/** Gives a newly entered player their resume token. */
export function issueToken(room: LiveRoom, playerId: string): string {
  const token = randomBytes(24).toString('base64url');
  room.tokens.set(playerId, token);
  return token;
}

export function tokenMatches(room: LiveRoom, playerId: string, token: unknown): boolean {
  const expected = room.tokens.get(playerId);
  if (!expected || typeof token !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A known player is back on a new socket. */
export function reconnectPlayer(room: LiveRoom, playerId: string, socketId: string): void {
  const player = room.players.get(playerId);
  if (player) room.players.set(playerId, { ...player, connected: true });
  room.sockets.set(playerId, socketId);
}

export function removePlayerSocket(room: LiveRoom, playerId: string): void {
  const player = room.players.get(playerId);
  if (player) room.players.set(playerId, { ...player, connected: false });
  room.sockets.delete(playerId);
}

/** The connected player currently at the table as this investigator, if any. A holder who has
 * dropped off doesn't keep the investigator: someone else (often the same person on another
 * device) can take it, and `dropPlayer` clears the stale entry. */
export function connectedHolder(room: LiveRoom, characterKey: string): Player | undefined {
  return Array.from(room.players.values()).find((p) => p.connected && p.characterKey === characterKey);
}

export function takenCharacterKeys(room: LiveRoom): string[] {
  return Array.from(room.players.values()).flatMap((p) => (p.connected && p.characterKey ? [p.characterKey] : []));
}

/** Removes a player (a stale, disconnected holder of an investigator someone else is now taking). */
export function dropPlayer(room: LiveRoom, playerId: string): void {
  room.players.delete(playerId);
  room.sockets.delete(playerId);
  room.tokens.delete(playerId);
}

export function playersList(room: LiveRoom): Player[] {
  return Array.from(room.players.values());
}

export function keeperOf(room: LiveRoom): Player | undefined {
  return Array.from(room.players.values()).find((p) => p.isKeeper);
}

export type { LiveRoom };
