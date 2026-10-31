import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MusicState } from 'coc7-protocol';
import { useLocale } from '../i18n/LocaleContext';
import { useTable } from './TableContext';
import Section from './Section';
import { BRASS_BTN, FIELD, GHOST_BTN, LABEL } from './styles';
import {
  MUSIC_PLAYLIST_ID,
  MUSIC_PLAYLIST_URL,
  YT_STATE,
  fetchTrackTitles,
  loadYouTubeApi,
  type MusicTrack,
  type YTPlayer,
} from './youtube';

const DEFAULT_VOLUME = 60;
/** How long to wait for a play request to start before assuming the browser blocked it. */
const AUTOPLAY_CHECK_MS = 4000;

interface RoomPlayerOptions {
  hostRef: RefObject<HTMLDivElement | null>;
  music: MusicState | null;
  /** This device only — never sent to the room. */
  muted: boolean;
  /** The Keeper's player cues the whole playlist so the track list can be read from it. */
  withPlaylist: boolean;
}

/**
 * Runs one YouTube player and keeps it in step with the room's MusicState. The Keeper and every
 * listener use the same logic — the Keeper's player is just the visible one that also reads the
 * track list. Playback position isn't synced (ambience loops), so a track that ends restarts
 * itself and a listener who joins late simply starts from the top.
 */
function useRoomPlayer({ hostRef, music, muted, withPlaylist }: RoomPlayerOptions) {
  const playerRef = useRef<YTPlayer | null>(null);
  const loadedVideoId = useRef<string | null>(null);
  const playingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [playlist, setPlaylist] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [trackError, setTrackError] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Primitives, so the effects below depend on exactly what they use.
  const videoId = music?.videoId ?? null;
  const playing = music?.playing ?? false;
  const volume = music?.volume ?? DEFAULT_VOLUME;
  playingRef.current = playing;

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    let pollTimer: number | undefined;

    function pollPlaylist(attempt = 0) {
      const ids = player?.getPlaylist();
      if (ids && ids.length > 0) setPlaylist(ids);
      else if (attempt < 40) pollTimer = window.setTimeout(() => pollPlaylist(attempt + 1), 250);
      else setLoadError(true);
    }

    loadYouTubeApi()
      .then((Player) => {
        if (cancelled) return;
        // YouTube swaps the element it's given for an iframe, so hand it a throwaway child
        // instead of a node React owns.
        const mount = document.createElement('div');
        container.appendChild(mount);
        player = new Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: {
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
            ...(withPlaylist ? { listType: 'playlist', list: MUSIC_PLAYLIST_ID } : {}),
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setReady(true);
              if (withPlaylist) pollPlaylist();
            },
            onStateChange: (event) => {
              if (event.data === YT_STATE.PLAYING) {
                setBlocked(false);
                setTrackError(false);
              } else if (event.data === YT_STATE.ENDED && playingRef.current) {
                player?.seekTo(0, true);
                player?.playVideo();
              }
            },
            onError: () => setTrackError(true),
            onAutoplayBlocked: () => setBlocked(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      playerRef.current = null;
      loadedVideoId.current = null;
      setReady(false);
      player?.destroy();
      container.replaceChildren();
    };
  }, [hostRef, withPlaylist]);

  // Volume and mute go first so a track never starts at the player's default 100%.
  useEffect(() => {
    if (ready) playerRef.current?.setVolume(volume);
  }, [ready, volume]);

  useEffect(() => {
    if (!ready) return;
    if (muted) playerRef.current?.mute();
    else playerRef.current?.unMute();
  }, [ready, muted]);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || !videoId) return;
    if (loadedVideoId.current !== videoId) {
      loadedVideoId.current = videoId;
      setTrackError(false);
      if (playing) player.loadVideoById(videoId);
      else player.cueVideoById(videoId);
    } else if (playing) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
    if (!playing) {
      setBlocked(false);
      return;
    }
    // onAutoplayBlocked isn't fired everywhere, so also check that playback really began.
    const timer = window.setTimeout(() => {
      const state = playerRef.current?.getPlayerState();
      if (state !== YT_STATE.PLAYING && state !== YT_STATE.BUFFERING) setBlocked(true);
    }, AUTOPLAY_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [ready, videoId, playing]);

  /** Call from a tap: browsers only let a page start audio after a user gesture. */
  function resume() {
    playerRef.current?.playVideo();
    setBlocked(false);
    window.setTimeout(() => {
      const state = playerRef.current?.getPlayerState();
      if (state !== YT_STATE.PLAYING && state !== YT_STATE.BUFFERING) setBlocked(true);
    }, 2500);
  }

  return { ready, playlist, loadError, trackError, blocked, resume };
}

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={muted}
      className={`px-3 py-2 text-[11px] uppercase tracking-wider ${muted ? 'border border-brass text-brass' : GHOST_BTN}`}
    >
      {muted ? t.table.musicUnmute : t.table.musicMute}
    </button>
  );
}

function KeeperMusic() {
  const { t } = useLocale();
  const { music, setMusic } = useTable();
  const hostRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(music?.volume ?? DEFAULT_VOLUME);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const { playlist, loadError, trackError } = useRoomPlayer({ hostRef, music, muted, withPlaylist: true });

  useEffect(() => {
    if (!playlist) return;
    let cancelled = false;
    void fetchTrackTitles(playlist).then((result) => {
      if (!cancelled) setTracks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [playlist]);

  function pickTrack(id: string) {
    const track = tracks.find((x) => x.id === id);
    if (track) setMusic({ videoId: track.id, title: track.title, playing: true, volume });
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (music) setMusic({ ...music, volume: next });
  }

  const loading = !loadError && tracks.length === 0;

  return (
    <Section
      id="music"
      title={t.table.music}
      summary={music ? `${music.playing ? '▶ ' : '❚❚ '}${music.title || t.table.musicNothing}` : undefined}
      keepMounted
    >
      <a
        href={MUSIC_PLAYLIST_URL}
        target="_blank"
        rel="noreferrer"
        className="self-end text-[10px] uppercase tracking-wider text-paper-dim transition-colors hover:text-brass"
      >
        {t.table.musicPlaylistLink}
      </a>

      <div ref={hostRef} className="aspect-video w-full overflow-hidden bg-ink-raised [&_iframe]:h-full [&_iframe]:w-full" />

      <select
        value={music?.videoId ?? ''}
        onChange={(e) => pickTrack(e.target.value)}
        disabled={tracks.length === 0}
        className={`${FIELD} px-3 py-2 text-sm`}
      >
        <option value="">{loading ? t.table.musicLoading : t.table.musicPickTrack}</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.title}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!music}
          onClick={() => music && setMusic({ ...music, playing: !music.playing })}
          className={`${BRASS_BTN} flex-1 py-2 text-xs font-semibold uppercase tracking-widest`}
        >
          {music?.playing ? t.table.musicStop : t.table.musicPlay}
        </button>
        <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} />
      </div>

      <label className="flex items-center gap-3">
        <span className={LABEL}>{t.table.musicVolume}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          className="h-1 flex-1 accent-brass"
        />
        <span className="w-8 text-right text-xs tabular-nums text-paper-dim">{volume}</span>
      </label>

      {loadError && <p className="text-sm text-oxblood">{t.table.musicLoadError}</p>}
      {trackError && <p className="text-sm text-oxblood">{t.table.musicTrackError}</p>}
    </Section>
  );
}

function ListenerMusicBar({ music }: { music: MusicState }) {
  const { t } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const { blocked, resume } = useRoomPlayer({ hostRef, music, muted, withPlaylist: false });

  return (
    <div className="flex flex-col gap-2 border border-ink-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className={LABEL}>{t.table.music}</h2>
          <div className={`truncate text-sm ${music.playing ? 'text-paper' : 'text-paper-dim'}`}>
            {music.title || t.table.musicNothing}
          </div>
        </div>
        <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} />
      </div>
      {blocked && music.playing && (
        <button type="button" onClick={resume} className={`${BRASS_BTN} py-2 text-xs uppercase tracking-widest`}>
          {t.table.musicTapForSound}
        </button>
      )}
      {/* Listeners hear the Keeper's music but don't get a player: it's kept out of sight. */}
      <div
        ref={hostRef}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 h-[200px] w-[200px] overflow-hidden"
      />
    </div>
  );
}

export default function MusicPanel() {
  const { isKeeper, music } = useTable();
  if (isKeeper) return <KeeperMusic />;
  // Mounted only once the Keeper has chosen something, so a table that never uses music never
  // loads YouTube's player script at all.
  return music ? <ListenerMusicBar music={music} /> : null;
}
