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

/** '' means the player last chose a free table with no scenario. */
export const rememberedScenario = () => read(SCENARIO_KEY);
export const rememberScenario = (scenario: string) => write(SCENARIO_KEY, scenario);
