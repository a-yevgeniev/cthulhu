import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MusicState } from 'coc7-protocol';
import { useLocale } from '../i18n/LocaleContext';
import { useTable } from './TableContext';
import Section from './Section';
import { BRASS_BTN, FIELD, GHOST_BTN, LABEL } from './styles';
import {
  BUILT_IN_TRACKS,
  MUSIC_PLAYLIST_ID,
  MUSIC_PLAYLIST_URL,
  YT_STATE,
  MAX_OWN_TRACKS,
  fetchTrackTitles,
  loadOwnTracks,
  loadTrackLevels,
  loadYouTubeApi,
  lookUpVideo,
  parseYouTubeId,
  saveOwnTracks,
  saveTrackLevels,
  type MusicTrack,
  type YTPlayer,
} from './youtube';

const DEFAULT_VOLUME = 60;
/** How long to wait for a play request to start before assuming the browser blocked it. */
const AUTOPLAY_CHECK_MS = 1500;

interface RoomPlayerOptions {
  hostRef: RefObject<HTMLDivElement | null>;
  music: MusicState | null;
  /** This device only — never sent to the room. */
  muted: boolean;
  /** This device's own level, 0–1, applied on top of the Keeper's volume. Never sent to the room. */
  gain?: number;
  /** The Keeper's player cues the whole playlist so the track list can be read from it. */
  withPlaylist: boolean;
}

/**
 * Runs one YouTube player and keeps it in step with the room's MusicState. The Keeper and every
 * listener use the same logic — the Keeper's player is just the visible one that also reads the
 * track list. Playback position isn't synced (ambience loops), so a track that ends restarts
 * itself and a listener who joins late simply starts from the top.
 */
function useRoomPlayer({ hostRef, music, muted, gain = 1, withPlaylist }: RoomPlayerOptions) {
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
  const volume = Math.round((music?.volume ?? DEFAULT_VOLUME) * gain);
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

  // Phones won't start sound until the page has had a tap. While the room's music should be
  // playing and isn't, the next tap anywhere starts it — the player needn't hunt for a button.
  useEffect(() => {
    if (!ready || !playing) return;
    function unlock() {
      const state = playerRef.current?.getPlayerState();
      if (state !== YT_STATE.PLAYING && state !== YT_STATE.BUFFERING) playerRef.current?.playVideo();
    }
    document.addEventListener('pointerdown', unlock, true);
    return () => document.removeEventListener('pointerdown', unlock, true);
  }, [ready, playing]);

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
  // Tracks this Keeper added from YouTube links, kept on this device. They play like any other:
  // the room is only ever sent the video id.
  const [own, setOwn] = useState<MusicTrack[]>(loadOwnTracks);
  // Each track keeps the volume it was last set to, so a quiet recording and a loud one both sound
  // right every time without the Keeper riding the slider.
  const [levels, setLevels] = useState<Record<string, number>>(loadTrackLevels);
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const { playlist, loadError, trackError } = useRoomPlayer({ hostRef, music, muted, withPlaylist: true });
  // The playlist's tracks, then the built-in ones it doesn't already have.
  const listed = [...tracks, ...BUILT_IN_TRACKS.filter((b) => !tracks.some((x) => x.id === b.id))];

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
    const track = own.find((x) => x.id === id) ?? listed.find((x) => x.id === id);
    if (track) playTrack(track);
  }

  /** Starts a track at its own remembered level (or the current one, if it has none yet). */
  function playTrack(track: MusicTrack) {
    const level = levels[track.id] ?? volume;
    setVolume(level);
    setMusic({ videoId: track.id, title: track.title, playing: true, volume: level });
  }

  async function addTrack() {
    const id = parseYouTubeId(link);
    if (!id) {
      setAddError(t.table.musicAddBad);
      return;
    }
    // Already there (in the playlist or the Keeper's own list): just select it.
    const known = own.find((x) => x.id === id) ?? listed.find((x) => x.id === id);
    if (known) {
      playTrack(known);
      setLink('');
      setAddError(null);
      return;
    }
    if (own.length >= MAX_OWN_TRACKS) {
      setAddError(t.table.musicAddFull);
      return;
    }
    setAdding(true);
    setAddError(null);
    const found = await lookUpVideo(id);
    setAdding(false);
    if (!found.ok) {
      setAddError(found.reason === 'offline' ? t.table.musicAddOffline : t.table.musicAddUnavailable);
      return;
    }
    const next = [{ id, title: found.title }, ...own];
    setOwn(next);
    saveOwnTracks(next);
    setLink('');
    // Starts at once, exactly as picking a track from the list does.
    playTrack({ id, title: found.title });
  }

  function removeTrack(id: string) {
    const next = own.filter((x) => x.id !== id);
    setOwn(next);
    saveOwnTracks(next);
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (!music) return;
    setMusic({ ...music, volume: next });
    const nextLevels = { ...levels, [music.videoId]: next };
    setLevels(nextLevels);
    saveTrackLevels(nextLevels);
  }

  const loading = !loadError && tracks.length === 0 && own.length === 0;
  const playingOwn = music ? own.some((x) => x.id === music.videoId) : false;

  return (
    <Section
      id="music"
      title={t.table.music}
      summary={music ? `${music.playing ? '▶ ' : '❚❚ '}${music.title || t.table.musicNothing}` : undefined}
      keepMounted
      collapsedExtra={
        <div className="flex items-center gap-3 border-t border-ink-line/60 px-4 py-1">
          <button
            type="button"
            disabled={!music}
            onClick={() => music && setMusic({ ...music, playing: !music.playing })}
            aria-label={music?.playing ? t.table.musicStop : t.table.musicPlay}
            className={`${BRASS_BTN} grid h-11 w-11 shrink-0 place-items-center text-sm`}
          >
            {music?.playing ? '❚❚' : '▶'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            disabled={!music}
            aria-label={t.table.musicVolume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="h-1 min-w-0 flex-1 accent-brass disabled:opacity-40"
          />
          <span className="w-7 text-right text-xs tabular-nums text-paper-dim">{volume}</span>
        </div>
      }
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
        disabled={listed.length === 0 && own.length === 0}
        className={`${FIELD} px-3 py-2 text-sm`}
      >
        <option value="">{loading ? t.table.musicLoading : t.table.musicPickTrack}</option>
        {own.length > 0 && (
          <optgroup label={t.table.musicOwnGroup}>
            {own.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </optgroup>
        )}
        {listed.length > 0 && (
          <optgroup label={t.table.musicPlaylistGroup}>
            {listed.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="url"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && link.trim() && !adding) void addTrack();
          }}
          placeholder={t.table.musicAddPlaceholder}
          aria-label={t.table.musicAddPlaceholder}
          className={`${FIELD} min-w-0 flex-1 px-3 py-2 text-sm`}
        />
        <button
          type="button"
          disabled={!link.trim() || adding}
          onClick={() => void addTrack()}
          className={`${BRASS_BTN} shrink-0 px-4 text-xs font-semibold uppercase tracking-wider`}
        >
          {adding ? '…' : t.table.musicAdd}
        </button>
      </div>
      {addError && <p className="text-sm text-oxblood">{addError}</p>}
      {playingOwn && music && (
        <button
          type="button"
          onClick={() => removeTrack(music.videoId)}
          className="self-start text-[11px] uppercase tracking-wider text-oxblood/80 transition-colors hover:text-oxblood"
        >
          {t.table.musicRemove}
        </button>
      )}

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
      <p className="-mt-1 text-[11px] text-paper-dim">{t.table.musicLevelNote}</p>

      {loadError &&<p className="text-sm text-oxblood">{t.table.musicLoadError}</p>}
      {trackError && <p className="text-sm text-oxblood">{t.table.musicTrackError}</p>}
    </Section>
  );
}

const LOCAL_MIX_KEY = 'coc7-music-local';

/** How this device hears the room's music: its own mute and level (a share of the Keeper's volume).
 * Remembered between visits, because a player who muted it doesn't want it back after a reload. */
function useLocalMix() {
  const [mix, setMix] = useState<{ muted: boolean; gain: number }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_MIX_KEY) ?? 'null') as { muted?: unknown; gain?: unknown } | null;
      const gain = Number(saved?.gain);
      return { muted: saved?.muted === true, gain: Number.isFinite(gain) ? Math.min(100, Math.max(0, gain)) : 100 };
    } catch {
      return { muted: false, gain: 100 };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_MIX_KEY, JSON.stringify(mix));
    } catch {
      // not remembered; harmless
    }
  }, [mix]);
  return [mix, setMix] as const;
}

function ListenerMusicBar({ music }: { music: MusicState }) {
  const { t } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const [mix, setMix] = useLocalMix();
  const { blocked, resume } = useRoomPlayer({ hostRef, music, muted: mix.muted, gain: mix.gain / 100, withPlaylist: false });

  return (
    <div className="flex flex-col gap-2 border border-ink-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0" aria-live="polite">
          <h2 className={`${LABEL} ${music.playing ? 'text-brass' : ''}`}>
            {t.table.music} · {music.playing ? t.table.musicPlaying : t.table.musicStopped}
          </h2>
          <div className={`truncate text-sm ${music.playing ? 'text-paper' : 'text-paper-dim'}`}>
            {music.title || t.table.musicNothing}
          </div>
        </div>
        <MuteButton muted={mix.muted} onToggle={() => setMix((m) => ({ ...m, muted: !m.muted }))} />
      </div>
      <label className="flex items-center gap-3">
        <span className={LABEL}>{t.table.musicVolume}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={mix.gain}
          onChange={(e) => setMix((m) => ({ ...m, gain: Number(e.target.value) }))}
          className="h-1 min-w-0 flex-1 accent-brass"
        />
        <span className="w-8 text-right text-xs tabular-nums text-paper-dim">{mix.gain}</span>
      </label>
      {blocked && music.playing && (
        <button type="button" onClick={resume} className={`${BRASS_BTN} min-h-11 py-2 text-xs uppercase tracking-widest`}>
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
