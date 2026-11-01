import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type ResumeRoomResponse,
  type HandoutChange,
  type LedgerEntry,
  type MusicState,
  type Player,
  type RollAck,
  type RollPrompt,
  type ShownHandout,
  type SetHandoutAck,
  type SetMusicAck,
  type TakenCharactersResponse,
} from 'coc7-protocol';
import type { Difficulty } from 'coc7-engine';
import {
  clearSession,
  inviteCodeFromUrl,
  rememberCharacterId,
  rememberedCharacterId,
  saveSession,
  savedSession,
  type TableSession,
} from './session';

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
  /** The handout images the Keeper has up for the table right now, in the order shown. */
  handouts: ShownHandout[];
  /** Which local Investigator (CharacterContext) this player is playing at the table, if any —
   * purely a client-side convenience so the roll composer can offer that character's own
   * skills/weapons instead of manual entry every time. The server only ever sees a name. */
  selectedCharacterId: string | null;
  /** The room this device is being put back into after a reload, while that's in flight. */
  resumeCode: string | null;
  /** In a room whose connection dropped and is being retried; the room stays on screen. */
  reconnecting: boolean;
  /** The last attempt to get back into a room failed because the room is gone (say, the server
   * restarted): the join form explains why it's showing. */
  resumeFailed: boolean;
}

interface TableContextValue extends TableState {
  createRoom: (name: string, scenario?: string) => void;
  joinRoom: (roomCode: string, name: string, characterKey: string) => void;
  /** Which investigators are already at that room's table (null if it can't be asked). */
  fetchTakenCharacters: (roomCode: string) => Promise<string[] | null>;
  leaveRoom: () => void;
  selectCharacter: (id: string | null) => void;
  rollSkill: (args: { skill: number; label?: string; difficulty?: Difficulty; modifierDice?: number; secret?: boolean }) => void;
  /** `onEntry` gets the recorded roll once the server has made it, for callers that act on the
   * result (say, setting an NPC's armour from a roll). */
  rollNotation: (
    args: { notation: string; label?: string; secret?: boolean },
    onEntry?: (entry: LedgerEntry) => void,
  ) => void;
  rollSanity: (args: { sanity: number; startingSanity?: number; lostThisSession?: number; loss: string; secret?: boolean }) => void;
  requestRoll: (args: { targetPlayerId: string; skillLabel: string; difficulty?: Difficulty; modifierDice?: number }) => void;
  /** Keeper only (the server rejects anyone else). Applies locally at once so the controls feel
   * instant, and relays to the room at a throttled rate so dragging a volume slider doesn't
   * flood the socket. */
  setMusic: (music: MusicState) => void;
  /** Keeper only (the server rejects anyone else): put a handout up for everyone (a bundled one by
   * id, or an upload with its picture), take one down, or take them all down. Applies locally at
   * once. */
  changeHandouts: (change: HandoutChange) => void;
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
  handouts: [],
  selectedCharacterId: null,
  resumeCode: null,
  reconnecting: false,
  resumeFailed: false,
};

/** The same step the server applies, so the Keeper's own screen and everyone else's agree. */
function applyHandoutChange(shown: ShownHandout[], change: HandoutChange): ShownHandout[] {
  if (change.type === 'clear') return [];
  if (change.type === 'hide') return shown.filter((h) => h.id !== change.id);
  const at = shown.findIndex((h) => h.id === change.item.id);
  if (at < 0) return [...shown, change.item];
  return shown.map((h, i) => (i === at ? change.item : h));
}

/** Minimum gap between music updates sent to the server while a control is being dragged. */
const MUSIC_EMIT_INTERVAL_MS = 120;

type Entered = Extract<JoinRoomResponse, { ok: true }>;

export function TableProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TableState>(() => ({ ...initialState, selectedCharacterId: rememberedCharacterId() }));
  const socketRef = useRef<Socket | null>(null);
  /** Who this device is in the room it's in (or was just in): what to present to the server to be
   * put back after a reload or a dropped connection. Null when not in a room. */
  const sessionRef = useRef<TableSession | null>(null);

  /** The server let us in (created, joined, or resumed): take its picture of the room as ours and
   * remember how to get back. */
  function enterRoom(res: Entered) {
    sessionRef.current = { roomCode: res.roomCode, playerId: res.playerId, token: res.resumeToken };
    saveSession(sessionRef.current);
    setState((s) => ({
      ...s,
      status: 'connected',
      reconnecting: false,
      resumeCode: null,
      resumeFailed: false,
      error: null,
      roomCode: res.roomCode,
      playerId: res.playerId,
      isKeeper: res.isKeeper,
      players: res.players,
      ledger: res.ledger,
      music: res.music,
      scenario: res.scenario,
      handouts: res.handout.shown,
    }));
  }

  /** The server doesn't know us any more (it restarted, or the room is gone). */
  function dropSession() {
    sessionRef.current = null;
    clearSession();
    setState((s) => ({ ...initialState, selectedCharacterId: s.selectedCharacterId, resumeFailed: true }));
  }

  function ensureSocket(): Socket {
    if (socketRef.current) return socketRef.current;
    const socket = io(SERVER_URL, { autoConnect: true });
    // Fires on the first connection and on every automatic reconnection (a phone waking up, the
    // network coming back). A fresh socket knows nobody, so if we were in a room, say who we are.
    socket.on('connect', () => {
      const session = sessionRef.current;
      if (!session) return;
      socket.emit(SOCKET_EVENTS.resumeRoom, session, (res: ResumeRoomResponse) => {
        if (res.ok) enterRoom(res);
        else dropSession();
      });
    });
    socket.on('disconnect', (reason) => {
      // A deliberate leave (client disconnect) is handled by leaveRoom; anything else is a drop
      // that socket.io is already retrying.
      if (sessionRef.current && reason !== 'io client disconnect') setState((s) => ({ ...s, reconnecting: true }));
    });
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
    socket.on(SOCKET_EVENTS.handoutChange, (change: HandoutChange) => {
      setState((s) => ({ ...s, handouts: applyHandoutChange(s.handouts, change) }));
    });
    socket.on('connect_error', () => {
      // In a room (or on the way back into one) the connection is simply being retried — keep the
      // room on screen with a "reconnecting" note instead of throwing the player back to the form.
      if (sessionRef.current) {
        setState((s) => ({ ...s, reconnecting: true }));
        return;
      }
      setState((s) => ({ ...s, status: 'disconnected', error: `Could not reach the table server at ${SERVER_URL}.` }));
    });
    socketRef.current = socket;
    return socket;
  }

  // On load, go back to the room this device was last in. An invite link to a *different* room
  // means the player came here to join that one instead, so leave the old session alone.
  useEffect(() => {
    const saved = savedSession();
    const invite = inviteCodeFromUrl();
    if (saved && (!invite || invite === saved.roomCode)) {
      sessionRef.current = saved;
      setState((s) => ({ ...s, status: 'connecting', resumeCode: saved.roomCode }));
      ensureSocket();
    }
    return () => {
      socketRef.current?.disconnect();
      // StrictMode runs this cleanup and then the effect again: the next run needs a live socket.
      socketRef.current = null;
    };
  }, []);

  const createRoom = useCallback((name: string, scenario?: string) => {
    setState((s) => ({ ...s, status: 'connecting', error: null, resumeFailed: false }));
    const socket = ensureSocket();
    socket.emit(SOCKET_EVENTS.createRoom, { name, scenario }, (res: CreateRoomResponse) => {
      if (!res.ok) {
        setState((s) => ({ ...s, status: 'disconnected', error: res.error }));
        return;
      }
      enterRoom(res);
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, name: string, characterKey: string) => {
    setState((s) => ({ ...s, status: 'connecting', error: null, resumeFailed: false }));
    const socket = ensureSocket();
    socket.emit(SOCKET_EVENTS.joinRoom, { roomCode, name, characterKey }, (res: JoinRoomResponse) => {
      if (!res.ok) {
        setState((s) => ({ ...s, status: 'disconnected', error: res.error }));
        return;
      }
      enterRoom(res);
    });
  }, []);

  const fetchTakenCharacters = useCallback(
    (roomCode: string) =>
      new Promise<string[] | null>((resolve) => {
        const socket = ensureSocket();
        // Never leave the join form waiting: no answer is as good as "unknown".
        const timer = window.setTimeout(() => resolve(null), 4000);
        socket.emit(SOCKET_EVENTS.takenCharacters, { roomCode }, (res: TakenCharactersResponse) => {
          window.clearTimeout(timer);
          resolve(res.ok ? res.taken : null);
        });
      }),
    [],
  );

  const musicEmit = useRef<{ timer: number | null; lastSent: number; pending: MusicState | null }>({
    timer: null,
    lastSent: 0,
    pending: null,
  });

  const leaveRoom = useCallback(() => {
    if (musicEmit.current.timer !== null) window.clearTimeout(musicEmit.current.timer);
    musicEmit.current = { timer: null, lastSent: 0, pending: null };
    // Leaving on purpose: forget the room so a reload doesn't pull the player back into it.
    sessionRef.current = null;
    clearSession();
    socketRef.current?.disconnect();
    socketRef.current = null;
    // Keep the character selection — the player is still the same person, likely to rejoin
    // (this room or another) as the same investigator.
    setState((s) => ({ ...initialState, selectedCharacterId: s.selectedCharacterId }));
  }, []);

  const selectCharacter = useCallback((id: string | null) => {
    rememberCharacterId(id);
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
    (args, onEntry) => guardedEmit<RollAck>(SOCKET_EVENTS.rollNotation, args, (res) => {
      if (res.ok) onEntry?.(res.entry);
      else setState((s) => ({ ...s, error: res.error }));
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

  const changeHandouts = useCallback<TableContextValue['changeHandouts']>(
    (change) => {
      setState((s) => ({ ...s, handouts: applyHandoutChange(s.handouts, change) }));
      guardedEmit<SetHandoutAck>(SOCKET_EVENTS.handoutSet, { change }, (res) => {
        if (!res.ok) {
          // The server refused (say, too many up already), so the screen mustn't keep claiming it.
          const undo: HandoutChange | null =
            change.type === 'show' ? { type: 'hide', id: change.item.id } : null;
          setState((s) => ({ ...s, error: res.error, handouts: undo ? applyHandoutChange(s.handouts, undo) : s.handouts }));
        }
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
        fetchTakenCharacters,
        leaveRoom,
        selectCharacter,
        rollSkill,
        rollNotation,
        rollSanity,
        requestRoll,
        setMusic,
        changeHandouts,
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
