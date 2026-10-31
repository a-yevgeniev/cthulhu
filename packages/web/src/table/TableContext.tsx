import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type HandoutState,
  type LedgerEntry,
  type MusicState,
  type Player,
  type RollAck,
  type RollPrompt,
  type SetHandoutAck,
  type SetMusicAck,
} from 'coc7-protocol';
import type { Difficulty } from 'coc7-engine';

// The shared-table server is a separate long-running process from this static site — it
// cannot run on GitHub Pages. Point this at wherever coc7-server is actually deployed; for
// local development it defaults to the server running on your machine.
const SERVER_URL = import.meta.env.VITE_COC7_SERVER_URL ?? 'http://localhost:4000';

type Status = 'disconnected' | 'connecting' | 'connected';

interface TableState {
  status: Status;
  roomCode: string | null;
  playerId: string | null;
  isKeeper: boolean;
  players: Player[];
  ledger: LedgerEntry[];
  error: string | null;
  prompt: RollPrompt | null;
  /** What the Keeper has playing, or null before they've picked anything. */
  music: MusicState | null;
  /** The prepared scenario this room was opened for (e.g. "haunting"), if any. */
  scenario: string | null;
  /** Id of the handout image the Keeper is showing the table right now, if any. */
  handoutId: string | null;
  /** Which local Investigator (CharacterContext) this player is playing at the table, if any —
   * purely a client-side convenience so the roll composer can offer that character's own
   * skills/weapons instead of manual entry every time. The server only ever sees a name. */
  selectedCharacterId: string | null;
}

interface TableContextValue extends TableState {
  createRoom: (name: string, scenario?: string) => void;
  joinRoom: (roomCode: string, name: string) => void;
  leaveRoom: () => void;
  selectCharacter: (id: string | null) => void;
  rollSkill: (args: { skill: number; label?: string; difficulty?: Difficulty; modifierDice?: number; secret?: boolean }) => void;
  rollNotation: (args: { notation: string; label?: string; secret?: boolean }) => void;
  rollSanity: (args: { sanity: number; startingSanity?: number; lostThisSession?: number; loss: string; secret?: boolean }) => void;
  requestRoll: (args: { targetPlayerId: string; skillLabel: string; difficulty?: Difficulty; modifierDice?: number }) => void;
  /** Keeper only (the server rejects anyone else). Applies locally at once so the controls feel
   * instant, and relays to the room at a throttled rate so dragging a volume slider doesn't
   * flood the socket. */
  setMusic: (music: MusicState) => void;
  /** Keeper only (the server rejects anyone else): show a handout to everyone, or null to hide. */
  setHandout: (imageId: string | null) => void;
  dismissPrompt: () => void;
  clearError: () => void;
}

const TableContext = createContext<TableContextValue | null>(null);

const initialState: TableState = {
  status: 'disconnected',
  roomCode: null,
  playerId: null,
  isKeeper: false,
  players: [],
  ledger: [],
  error: null,
  prompt: null,
  music: null,
  scenario: null,
  handoutId: null,
  selectedCharacterId: null,
};

/** Minimum gap between music updates sent to the server while a control is being dragged. */
const MUSIC_EMIT_INTERVAL_MS = 120;

export function TableProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TableState>(initialState);
  const socketRef = useRef<Socket | null>(null);

  function ensureSocket(): Socket {
    if (socketRef.current) return socketRef.current;
    const socket = io(SERVER_URL, { autoConnect: true });
    socket.on(SOCKET_EVENTS.playersChanged, (players: Player[]) => {
      setState((s) => ({ ...s, players }));
    });
    socket.on(SOCKET_EVENTS.rollBroadcast, (entry: LedgerEntry) => {
      setState((s) => ({ ...s, ledger: [...s.ledger, entry] }));
    });
    socket.on(SOCKET_EVENTS.rollPrompt, (prompt: RollPrompt) => {
      setState((s) => ({ ...s, prompt }));
    });
    socket.on(SOCKET_EVENTS.musicState, (music: MusicState) => {
      setState((s) => ({ ...s, music }));
    });
    socket.on(SOCKET_EVENTS.handoutState, (handout: HandoutState) => {
      setState((s) => ({ ...s, handoutId: handout.imageId }));
    });
    socket.on('connect_error', () => {
      setState((s) => ({ ...s, status: 'disconnected', error: `Could not reach the table server at ${SERVER_URL}.` }));
    });
    socketRef.current = socket;
    return socket;
  }

  useEffect(() => () => void socketRef.current?.disconnect(), []);

  const createRoom = useCallback((name: string, scenario?: string) => {
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    const socket = ensureSocket();
    socket.emit(SOCKET_EVENTS.createRoom, { name, scenario }, (res: CreateRoomResponse) => {
      if (!res.ok) {
        setState((s) => ({ ...s, status: 'disconnected', error: res.error }));
        return;
      }
      setState((s) => ({
        ...s,
        status: 'connected',
        roomCode: res.roomCode,
        playerId: res.playerId,
        isKeeper: true,
        players: res.players,
        ledger: res.ledger,
        music: res.music,
        scenario: res.scenario,
        handoutId: res.handout.imageId,
      }));
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, name: string) => {
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    const socket = ensureSocket();
    socket.emit(SOCKET_EVENTS.joinRoom, { roomCode, name }, (res: JoinRoomResponse) => {
      if (!res.ok) {
        setState((s) => ({ ...s, status: 'disconnected', error: res.error }));
        return;
      }
      setState((s) => ({
        ...s,
        status: 'connected',
        roomCode: res.roomCode,
        playerId: res.playerId,
        isKeeper: res.isKeeper,
        players: res.players,
        ledger: res.ledger,
        music: res.music,
        scenario: res.scenario,
        handoutId: res.handout.imageId,
      }));
    });
  }, []);

  const musicEmit = useRef<{ timer: number | null; lastSent: number; pending: MusicState | null }>({
    timer: null,
    lastSent: 0,
    pending: null,
  });

  const leaveRoom = useCallback(() => {
    if (musicEmit.current.timer !== null) window.clearTimeout(musicEmit.current.timer);
    musicEmit.current = { timer: null, lastSent: 0, pending: null };
    socketRef.current?.disconnect();
    socketRef.current = null;
    // Keep the character selection — the player is still the same person, likely to rejoin
    // (this room or another) as the same investigator.
    setState((s) => ({ ...initialState, selectedCharacterId: s.selectedCharacterId }));
  }, []);

  const selectCharacter = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedCharacterId: id }));
  }, []);

  function guardedEmit<T>(event: string, payload: Record<string, unknown>, onAck?: (res: T) => void) {
    const socket = socketRef.current;
    if (!socket || !state.roomCode || !state.playerId) return;
    socket.emit(event, { ...payload, roomCode: state.roomCode, playerId: state.playerId }, onAck);
  }

  const rollSkill = useCallback<TableContextValue['rollSkill']>(
    (args) => guardedEmit<RollAck>(SOCKET_EVENTS.rollSkill, args, (res) => {
      if (!res.ok) setState((s) => ({ ...s, error: res.error }));
    }),
    [state.roomCode, state.playerId],
  );

  const rollNotation = useCallback<TableContextValue['rollNotation']>(
    (args) => guardedEmit<RollAck>(SOCKET_EVENTS.rollNotation, args, (res) => {
      if (!res.ok) setState((s) => ({ ...s, error: res.error }));
    }),
    [state.roomCode, state.playerId],
  );

  const rollSanity = useCallback<TableContextValue['rollSanity']>(
    (args) => guardedEmit<RollAck>(SOCKET_EVENTS.rollSanity, args, (res) => {
      if (!res.ok) setState((s) => ({ ...s, error: res.error }));
    }),
    [state.roomCode, state.playerId],
  );

  const requestRoll = useCallback<TableContextValue['requestRoll']>(
    (args) => guardedEmit(SOCKET_EVENTS.requestRoll, args),
    [state.roomCode, state.playerId],
  );

  const setMusic = useCallback<TableContextValue['setMusic']>(
    (music) => {
      setState((s) => ({ ...s, music }));
      const emit = musicEmit.current;
      emit.pending = music;
      const send = () => {
        emit.timer = null;
        if (!emit.pending) return;
        const next = emit.pending;
        emit.pending = null;
        emit.lastSent = Date.now();
        guardedEmit<SetMusicAck>(SOCKET_EVENTS.musicSet, { music: next }, (res) => {
          if (!res.ok) setState((s) => ({ ...s, error: res.error }));
        });
      };
      const wait = MUSIC_EMIT_INTERVAL_MS - (Date.now() - emit.lastSent);
      // Leading edge sends at once; anything arriving inside the window is coalesced into one
      // trailing send carrying the latest value, so the room always ends up on the final state.
      if (wait <= 0) send();
      else if (emit.timer === null) emit.timer = window.setTimeout(send, wait);
    },
    [state.roomCode, state.playerId],
  );

  const setHandout = useCallback<TableContextValue['setHandout']>(
    (imageId) => {
      setState((s) => ({ ...s, handoutId: imageId }));
      guardedEmit<SetHandoutAck>(SOCKET_EVENTS.handoutSet, { imageId }, (res) => {
        if (!res.ok) setState((s) => ({ ...s, error: res.error }));
      });
    },
    [state.roomCode, state.playerId],
  );

  const dismissPrompt = useCallback(() => setState((s) => ({ ...s, prompt: null })), []);
  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return (
    <TableContext.Provider
      value={{
        ...state,
        createRoom,
        joinRoom,
        leaveRoom,
        selectCharacter,
        rollSkill,
        rollNotation,
        rollSanity,
        requestRoll,
        setMusic,
        setHandout,
        dismissPrompt,
        clearError,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used within a TableProvider');
  return ctx;
}
