/** Small helpers that make getting into a Table room quick: an invite link a player can just
 * tap, and the last name / scenario remembered on this device. */

// The server's codes are 5 characters from an unambiguous alphabet; accept a little slack so a
// future change to the length doesn't silently break old links.
const ROOM_CODE = /^[A-Za-z0-9]{4,8}$/;

/** The room code from an invite link (`?room=ABCDE`), if this page was opened from one. */
export function inviteCodeFromUrl(): string | null {
  const raw = new URLSearchParams(window.location.search).get('room');
  return raw && ROOM_CODE.test(raw) ? raw.toUpperCase() : null;
}

/** A link to this same app that opens straight to the join form for `code`. Built from the
 * current location so it stays correct under GitHub Pages' /cthulhu/ base path and on localhost. */
export function inviteUrl(code: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

const NAME_KEY = 'coc7-table-name';
const SCENARIO_KEY = 'coc7-table-scenario';

/** localStorage can be missing or throw (private windows, blocked site data), and none of this
 * is worth failing over — it only saves a few taps. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not remembered; harmless
  }
}

export const rememberedName = () => read(NAME_KEY) ?? '';
export const rememberName = (name: string) => write(NAME_KEY, name);

/** Where this device last was in a room, so a reload (or a phone coming back from sleep) puts the
 * player back in it as the same person instead of at the join form. `token` is the secret the
 * server issued on entry; it never leaves this device except to the server. */
export interface TableSession {
  roomCode: string;
  playerId: string;
  token: string;
}

const SESSION_KEY = 'coc7-table-session';

export function savedSession(): TableSession | null {
  const raw = read(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<TableSession>;
    return typeof s.roomCode === 'string' && typeof s.playerId === 'string' && typeof s.token === 'string'
      ? { roomCode: s.roomCode, playerId: s.playerId, token: s.token }
      : null;
  } catch {
    return null;
  }
}

export const saveSession = (session: TableSession) => write(SESSION_KEY, JSON.stringify(session));

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing stored, or storage unavailable
  }
}

/** Which investigator this device plays at the table; survives leaving a room and reloads. */
const CHARACTER_KEY = 'coc7-table-character';
export const rememberedCharacterId = () => read(CHARACTER_KEY) || null;
export function rememberCharacterId(id: string | null): void {
  if (id) write(CHARACTER_KEY, id);
  else
    try {
      localStorage.removeItem(CHARACTER_KEY);
    } catch {
      // not remembered; harmless
    }
}

/** Whether a collapsible section of the room page was left open. */
export function rememberedSectionOpen(id: string, fallback: boolean): boolean {
  const stored = read(`coc7-table-section-${id}`);
  return stored === null ? fallback : stored === '1';
}
export const rememberSectionOpen = (id: string, open: boolean) => write(`coc7-table-section-${id}`, open ? '1' : '0');

/** '' means the player last chose a free table with no scenario. */
export const rememberedScenario = () => read(SCENARIO_KEY);
export const rememberScenario = (scenario: string) => write(SCENARIO_KEY, scenario);
