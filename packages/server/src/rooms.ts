import { randomBytes, randomUUID } from 'node:crypto';
import type { Player } from 'coc7-protocol';
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

export function openRoom(code: string): LiveRoom {
  createRoom(code);
  const room: LiveRoom = { code, players: new Map(), sockets: new Map() };
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

export function removePlayerSocket(room: LiveRoom, playerId: string): void {
  const player = room.players.get(playerId);
  if (player) room.players.set(playerId, { ...player, connected: false });
  room.sockets.delete(playerId);
}

export function playersList(room: LiveRoom): Player[] {
  return Array.from(room.players.values());
}

export function keeperOf(room: LiveRoom): Player | undefined {
  return Array.from(room.players.values()).find((p) => p.isKeeper);
}

export type { LiveRoom };
