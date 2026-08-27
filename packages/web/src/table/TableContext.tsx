import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type LedgerEntry,
  type Player,
  type RollAck,
  type RollPrompt,
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
}

interface TableContextValue extends TableState {
  createRoom: (name: string) => void;
  joinRoom: (roomCode: string, name: string) => void;
  leaveRoom: () => void;
  rollSkill: (args: { skill: number; label?: string; difficulty?: Difficulty; modifierDice?: number; secret?: boolean }) => void;
  rollNotation: (args: { notation: string; label?: string; secret?: boolean }) => void;
  rollSanity: (args: { sanity: number; startingSanity?: number; lostThisSession?: number; loss: string; secret?: boolean }) => void;
  requestRoll: (args: { targetPlayerId: string; skillLabel: string; difficulty?: Difficulty; modifierDice?: number }) => void;
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
};

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
    socket.on('connect_error', () => {
      setState((s) => ({ ...s, status: 'disconnected', error: `Could not reach the table server at ${SERVER_URL}.` }));
    });
    socketRef.current = socket;
    return socket;
  }

  useEffect(() => () => void socketRef.current?.disconnect(), []);

  const createRoom = useCallback((name: string) => {
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    const socket = ensureSocket();
    socket.emit(SOCKET_EVENTS.createRoom, { name }, (res: CreateRoomResponse) => {
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
      }));
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState(initialState);
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

  const dismissPrompt = useCallback(() => setState((s) => ({ ...s, prompt: null })), []);
  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return (
    <TableContext.Provider
      value={{
        ...state,
        createRoom,
        joinRoom,
        leaveRoom,
        rollSkill,
        rollNotation,
        rollSanity,
        requestRoll,
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
