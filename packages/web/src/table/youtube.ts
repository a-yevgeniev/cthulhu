/** The Table's background-music playlist: a public YouTube playlist of Call of Cthulhu ambience
 * by Forsaken Tunes. Nothing is hosted or re-encoded here — every client plays it through
 * YouTube's own embedded player. */
export const MUSIC_PLAYLIST_ID = 'PLeZv1JEy2s8dmJguTQZRWmnY5-azK70EB';
export const MUSIC_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${MUSIC_PLAYLIST_ID}`;

/** Only the slice of the IFrame Player API this app uses (there's no first-party types package). */
export interface YTPlayer {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  getPlaylist(): string[] | null;
  destroy(): void;
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;

interface YTPlayerOptions {
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
    onAutoplayBlocked?: () => void;
  };
}

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YTPlayerConstructor = NonNullable<Window['YT']>['Player'];

let apiPromise: Promise<YTPlayerConstructor> | null = null;

/** Loads YouTube's iframe_api script once and resolves with its Player class. Safe to call from
 * several components at once; a failed load (offline, blocked) can be retried by calling again. */
export function loadYouTubeApi(): Promise<YTPlayerConstructor> {
  if (window.YT?.Player) return Promise.resolve(window.YT.Player);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTPlayerConstructor>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT.Player);
      else reject(new Error('YouTube API loaded without a Player class.'));
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error('Could not load the YouTube player.'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export interface MusicTrack {
  id: string;
  title: string;
}

const titleCache = new Map<string, string>();

/** The playlist's videos are titled "Name | Call of Cthulhu Ambient Music Vol.N" — the track
 * name is the part before the first pipe. */
export function shortTitle(title: string): string {
  return title.split(' | ')[0].trim() || title;
}

/** Looks a video's title up through YouTube's oEmbed endpoint (CORS-enabled, no API key). The
 * IFrame API only reveals the title of whatever is loaded, not the rest of the playlist. */
async function fetchTitle(videoId: string, fallback: string): Promise<string> {
  const cached = titleCache.get(videoId);
  if (cached) return cached;
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { title?: string };
    const title = data.title ? shortTitle(data.title) : fallback;
    titleCache.set(videoId, title);
    return title;
  } catch {
    return fallback;
  }
}

export function fetchTrackTitles(ids: string[]): Promise<MusicTrack[]> {
  return Promise.all(ids.map(async (id, i) => ({ id, title: await fetchTitle(id, `#${i + 1}`) })));
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id in whatever a Keeper pastes: a watch / short / embed / youtu.be / music.youtube.com
 * link (any extra parameters, such as a playlist or a start time, are ignored), or the bare
 * 11-character id. Null if it isn't one. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, second] = url.pathname.split('/');
    id = kind === 'watch' ? url.searchParams.get('v') : kind === 'shorts' || kind === 'embed' || kind === 'live' ? (second ?? null) : null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

export type VideoLookup = { ok: true; title: string } | { ok: false; reason: 'unavailable' | 'offline' };

/** Asks YouTube whether a video exists and may be played in an embedded player (oEmbed answers
 * with an error for private, removed and embedding-disabled videos), and what it's called. */
export async function lookUpVideo(videoId: string): Promise<VideoLookup> {
  let res: Response;
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    res = await fetch(url);
  } catch {
    return { ok: false, reason: 'offline' };
  }
  if (!res.ok) return { ok: false, reason: 'unavailable' };
  try {
    const data = (await res.json()) as { title?: string };
    const title = data.title ? shortTitle(data.title) : videoId;
    titleCache.set(videoId, title);
    return { ok: true, title };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

const OWN_TRACKS_KEY = 'coc7-music-tracks';
export const MAX_OWN_TRACKS = 50;

/** Tracks the Keeper has added themselves, kept on this device between sessions. */
export function loadOwnTracks(): MusicTrack[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWN_TRACKS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is MusicTrack => !!t && typeof t.id === 'string' && VIDEO_ID.test(t.id) && typeof t.title === 'string')
      .slice(0, MAX_OWN_TRACKS);
  } catch {
    return [];
  }
}

export function saveOwnTracks(tracks: MusicTrack[]): void {
  try {
    localStorage.setItem(OWN_TRACKS_KEY, JSON.stringify(tracks.slice(0, MAX_OWN_TRACKS)));
  } catch {
    // not remembered; harmless
  }
}
