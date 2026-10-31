import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { rollNotation, sanityCheck, skillRoll } from 'coc7-engine';
import {
  SOCKET_EVENTS,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type JoinRoomRequest,
  type JoinRoomResponse,
  type LedgerEntry,
  type MusicState,
  type NotationRollRequest,
  type Player,
  type RollAck,
  type RollPrompt,
  type RollRequestPayload,
  type SanityRollRequest,
  type SetHandoutAck,
  type SetHandoutRequest,
  type SetMusicAck,
  type SetMusicRequest,
  type SkillRollRequest,
} from 'coc7-protocol';
import { insertLedgerEntry, insertPlayer, ledgerFor } from './db.js';
import { addPlayer, getRoom, keeperOf, makePlayerId, makeRoomCode, openRoom, playersList, removePlayerSocket, type LiveRoom } from './rooms.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });
app.get('/health', async () => ({ ok: true }));

// Defense in depth alongside safeAck(): one bad message from one client should never take the
// whole table down for every room. Logs and keeps serving rather than exiting.
process.on('uncaughtException', (err) => {
  app.log.error(err, 'uncaughtException — continuing');
});
process.on('unhandledRejection', (err) => {
  app.log.error(err, 'unhandledRejection — continuing');
});

const io = new SocketIOServer(app.server, {
  cors: { origin: process.env.COC7_CORS_ORIGIN ?? '*' },
});

interface SocketData {
  roomCode: string;
  playerId: string;
}

function socketData(socket: Socket): SocketData | undefined {
  return socket.data as SocketData | undefined;
}

/** Socket.IO omits the ack argument entirely when the caller doesn't request one — calling an
 * unconditional `ack(...)` in that case throws "ack is not a function" and, being an uncaught
 * exception inside an event handler, takes the whole process down. Every handler below wraps
 * its ack in this so a client that forgets to pass one can never crash the server. */
function safeAck<T>(ack: unknown): (res: T) => void {
  return typeof ack === 'function' ? (ack as (res: T) => void) : () => {};
}

function broadcastPlayers(room: LiveRoom) {
  io.to(room.code).emit(SOCKET_EVENTS.playersChanged, playersList(room));
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_TITLE_LENGTH = 120;
/** Scenario and handout ids are short slugs the web app defines ("haunting", "the-eye-sign").
 * The server has no copy of that list — it only insists on the shape, so a client can't park
 * arbitrary text in a room's state for everyone else to receive. */
const SLUG = /^[a-z0-9-]{1,48}$/;

/** The Keeper's music message crosses a trust boundary like any other client input, and every
 * client in the room will act on it (load that video id into an embedded player), so rebuild it
 * field by field instead of storing whatever arrived: a strict id shape, a bounded title, a
 * clamped volume. Returns null if it isn't a usable state. */
function sanitizeMusic(raw: unknown): MusicState | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<MusicState>;
  if (typeof m.videoId !== 'string' || !YOUTUBE_ID.test(m.videoId)) return null;
  const volume = Number(m.volume);
  if (!Number.isFinite(volume)) return null;
  return {
    videoId: m.videoId,
    title: typeof m.title === 'string' ? m.title.trim().slice(0, MAX_TITLE_LENGTH) : '',
    playing: m.playing === true,
    volume: Math.min(100, Math.max(0, Math.round(volume))),
  };
}

/** Send a ledger entry to whoever is allowed to see it: everyone if public, only the roller
 * and the keeper if secret. */
function broadcastEntry(room: LiveRoom, entry: LedgerEntry) {
  if (!entry.secret) {
    io.to(room.code).emit(SOCKET_EVENTS.rollBroadcast, entry);
    return;
  }
  const rollerSocket = room.sockets.get(entry.playerId);
  if (rollerSocket) io.to(rollerSocket).emit(SOCKET_EVENTS.rollBroadcast, entry);
  const keeper = keeperOf(room);
  if (keeper && keeper.id !== entry.playerId) {
    const keeperSocket = room.sockets.get(keeper.id);
    if (keeperSocket) io.to(keeperSocket).emit(SOCKET_EVENTS.rollBroadcast, entry);
  }
}

function recordEntry(room: LiveRoom, playerId: string, playerName: string, kind: LedgerEntry['kind'], label: string, secret: boolean, result: LedgerEntry['result']): LedgerEntry {
  const entry: LedgerEntry = {
    id: randomUUID(),
    playerId,
    playerName,
    timestamp: Date.now(),
    kind,
    label,
    secret,
    result,
  };
  insertLedgerEntry(room.code, entry);
  broadcastEntry(room, entry);
  return entry;
}

io.on('connection', (socket: Socket) => {
  socket.on(SOCKET_EVENTS.createRoom, (payload: CreateRoomRequest, ackArg: unknown) => {
    const ack = safeAck<CreateRoomResponse>(ackArg);
    const name = payload.name.trim();
    if (!name) {
      ack({ ok: false, error: 'Name is required.' });
      return;
    }
    const code = makeRoomCode();
    const room = openRoom(code, typeof payload.scenario === 'string' && SLUG.test(payload.scenario) ? payload.scenario : null);
    const playerId = makePlayerId();
    const player: Player = { id: playerId, name, isKeeper: true, connected: true };
    addPlayer(room, player, socket.id);
    insertPlayer({ ...player, roomCode: code });
    socket.join(code);
    socket.data = { roomCode: code, playerId } satisfies SocketData;
    ack({
      ok: true,
      roomCode: code,
      playerId,
      isKeeper: true,
      players: playersList(room),
      ledger: [],
      music: room.music,
      scenario: room.scenario,
      handout: room.handout,
    });
  });

  socket.on(SOCKET_EVENTS.joinRoom, (payload: JoinRoomRequest, ackArg: unknown) => {
    const ack = safeAck<JoinRoomResponse>(ackArg);
    const name = payload.name.trim();
    const code = payload.roomCode.trim().toUpperCase();
    if (!name) {
      ack({ ok: false, error: 'Name is required.' });
      return;
    }
    const room = getRoom(code);
    if (!room) {
      ack({ ok: false, error: 'Room not found. Check the code, or ask the Keeper to re-share it after a server restart.' });
      return;
    }
    const playerId = makePlayerId();
    const player: Player = { id: playerId, name, isKeeper: false, connected: true };
    addPlayer(room, player, socket.id);
    insertPlayer({ ...player, roomCode: code });
    socket.join(code);
    socket.data = { roomCode: code, playerId } satisfies SocketData;
    ack({
      ok: true,
      roomCode: code,
      playerId,
      isKeeper: false,
      players: playersList(room),
      ledger: ledgerFor(code, playerId),
      music: room.music,
      scenario: room.scenario,
      handout: room.handout,
    });
    broadcastPlayers(room);
  });

  socket.on(SOCKET_EVENTS.handoutSet, (payload: SetHandoutRequest, ackArg: unknown) => {
    const ack = safeAck<SetHandoutAck>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.playerId !== payload?.playerId || data.roomCode !== payload?.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    if (!room.players.get(data.playerId)?.isKeeper) {
      ack({ ok: false, error: 'Only the Keeper can show or hide handouts.' });
      return;
    }
    const imageId = payload.imageId;
    if (imageId !== null && !(typeof imageId === 'string' && SLUG.test(imageId))) {
      ack({ ok: false, error: 'Invalid handout.' });
      return;
    }
    room.handout = { imageId };
    io.to(room.code).emit(SOCKET_EVENTS.handoutState, room.handout);
    ack({ ok: true });
  });

  socket.on(SOCKET_EVENTS.musicSet, (payload: SetMusicRequest, ackArg: unknown) => {
    const ack = safeAck<SetMusicAck>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.playerId !== payload?.playerId || data.roomCode !== payload?.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    if (!room.players.get(data.playerId)?.isKeeper) {
      ack({ ok: false, error: 'Only the Keeper can control the music.' });
      return;
    }
    const music = sanitizeMusic(payload.music);
    if (!music) {
      ack({ ok: false, error: 'Invalid music state.' });
      return;
    }
    room.music = music;
    io.to(room.code).emit(SOCKET_EVENTS.musicState, music);
    ack({ ok: true });
  });

  socket.on(SOCKET_EVENTS.rollSkill, (payload: SkillRollRequest, ackArg: unknown) => {
    const ack = safeAck<RollAck>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.playerId !== payload.playerId || data.roomCode !== payload.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    const player = room.players.get(payload.playerId);
    if (!player) {
      ack({ ok: false, error: 'Unknown player.' });
      return;
    }
    const result = skillRoll(payload.skill, {
      difficulty: payload.difficulty,
      modifierDice: payload.modifierDice,
    });
    const entry = recordEntry(room, player.id, player.name, 'skill', payload.label ?? `skill ${payload.skill}`, payload.secret ?? false, result);
    ack({ ok: true, entry });
  });

  socket.on(SOCKET_EVENTS.rollNotation, (payload: NotationRollRequest, ackArg: unknown) => {
    const ack = safeAck<RollAck>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.playerId !== payload.playerId || data.roomCode !== payload.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    const player = room.players.get(payload.playerId);
    if (!player) {
      ack({ ok: false, error: 'Unknown player.' });
      return;
    }
    let result;
    try {
      result = rollNotation(payload.notation);
    } catch (err) {
      ack({ ok: false, error: err instanceof Error ? err.message : 'Invalid notation.' });
      return;
    }
    const entry = recordEntry(room, player.id, player.name, 'notation', payload.label ?? payload.notation, payload.secret ?? false, result);
    ack({ ok: true, entry });
  });

  socket.on(SOCKET_EVENTS.rollSanity, (payload: SanityRollRequest, ackArg: unknown) => {
    const ack = safeAck<RollAck>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.playerId !== payload.playerId || data.roomCode !== payload.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    const player = room.players.get(payload.playerId);
    if (!player) {
      ack({ ok: false, error: 'Unknown player.' });
      return;
    }
    let result;
    try {
      result = sanityCheck({
        sanity: payload.sanity,
        startingSanity: payload.startingSanity,
        lostThisSession: payload.lostThisSession,
        loss: payload.loss,
      });
    } catch (err) {
      ack({ ok: false, error: err instanceof Error ? err.message : 'Invalid Sanity check.' });
      return;
    }
    // Sanity results default to keeper-only visibility unless the player opts to share —
    // matches the plan's "see hidden Sanity results the player does not" Keeper feature.
    const entry = recordEntry(room, player.id, player.name, 'sanity', 'Sanity check', payload.secret ?? true, result);
    ack({ ok: true, entry });
  });

  socket.on(SOCKET_EVENTS.requestRoll, (payload: RollRequestPayload, ackArg: unknown) => {
    const ack = safeAck<{ ok: boolean; error?: string }>(ackArg);
    const data = socketData(socket);
    const room = data && getRoom(data.roomCode);
    if (!data || !room || data.roomCode !== payload.roomCode) {
      ack({ ok: false, error: 'Not connected to this room.' });
      return;
    }
    const keeper = room.players.get(data.playerId);
    if (!keeper?.isKeeper) {
      ack({ ok: false, error: 'Only the Keeper can request a roll.' });
      return;
    }
    const targetSocketId = room.sockets.get(payload.targetPlayerId);
    if (!targetSocketId) {
      ack({ ok: false, error: 'That player is not connected.' });
      return;
    }
    const prompt: RollPrompt = {
      id: randomUUID(),
      fromKeeperName: keeper.name,
      skillLabel: payload.skillLabel,
      difficulty: payload.difficulty,
      modifierDice: payload.modifierDice,
    };
    io.to(targetSocketId).emit(SOCKET_EVENTS.rollPrompt, prompt);
    ack({ ok: true });
  });

  socket.on('disconnect', () => {
    const data = socketData(socket);
    if (!data) return;
    const room = getRoom(data.roomCode);
    if (!room) return;
    removePlayerSocket(room, data.playerId);
    broadcastPlayers(room);
  });
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`coc7-server listening on ${PORT}`);
});
