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
