import { useEffect, useRef, useState } from "react";
import { createPlayer, type NowPlaying } from "../spotify/player";
import { Wheel } from "./Wheel";
import { Turntable } from "./Turntable";
import { RadioFace } from "./RadioFace";
import { Cassette } from "./Cassette";
import { VolumeSlider } from "./VolumeSlider";
import { StyleSwitcher, type PlayerStyle } from "./StyleSwitcher";
import { LibraryPanel } from "./LibraryPanel";
import "./Player.css";

const VOLUME_STEP = 0.1;

const HINTS: Record<PlayerStyle, string> = {
  wheel: "Gira para cambiar de canción",
  turntable: "Gira el disco para cambiar de canción",
  radio: "Gira la perilla para sintonizar",
  cassette: "Usa los botones para avanzar",
};

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface PlayerProps {
  style: PlayerStyle;
  onStyleChange: (style: PlayerStyle) => void;
}

export function Player({ style, onStyleChange }: PlayerProps) {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [progressMs, setProgressMs] = useState(0);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [insertTrigger, setInsertTrigger] = useState(0);
  const controlsRef = useRef<Awaited<ReturnType<typeof createPlayer>> | null>(null);
  const trackRef = useRef<NowPlaying | null>(null);
  const anchorRef = useRef({ position: 0, timestamp: Date.now() });
  const pendingAnimRef = useRef<PlayerStyle | null>(null);
  const selectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    createPlayer((state) => {
      if (cancelled) return;
      // Fire the selection animation only once the real track data has actually
      // arrived, instead of on the click itself — otherwise on a slow connection
      // the animation finishes before the art updates and looks broken. Bumping
      // the trigger here, in the same callback as setTrack, keeps both updates
      // in one React batch so the new art and the animation land together.
      setTrack(state);
      if (pendingAnimRef.current) {
        if (pendingAnimRef.current === "turntable") setSpinTrigger((s) => s + 1);
        if (pendingAnimRef.current === "cassette") setInsertTrigger((s) => s + 1);
        pendingAnimRef.current = null;
      }
    }).then((controls) => {
      if (!cancelled) controlsRef.current = controls;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    trackRef.current = track;
    if (track) {
      anchorRef.current = { position: track.position, timestamp: Date.now() };
      setProgressMs(track.position);
    }
  }, [track]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = trackRef.current;
      if (!t) return;
      if (t.isPaused) {
        setProgressMs(anchorRef.current.position);
        return;
      }
      setProgressMs(Math.min(t.duration, anchorRef.current.position + (Date.now() - anchorRef.current.timestamp)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  function nextTrack() {
    controlsRef.current?.nextTrack();
  }

  function previousTrack() {
    controlsRef.current?.previousTrack();
  }

  function togglePlay() {
    controlsRef.current?.togglePlay();
  }

  // On mobile, tapping two covers in quick succession (or a fat-finger hitting the
  // neighboring one) fired two overlapping /play requests — the device bounced between
  // both contexts, flashing through several tracks before settling. One in flight at a time,
  // for track picks as well as album picks.
  async function withSelectionLock(run: () => Promise<void> | undefined) {
    if (selectingRef.current) return;
    selectingRef.current = true;
    try {
      await run();
    } finally {
      selectingRef.current = false;
    }
  }

  function playAlbum(uri: string) {
    return withSelectionLock(async () => {
      await controlsRef.current?.playAlbum(uri);
      if (style === "turntable" || style === "cassette") pendingAnimRef.current = style;
    });
  }

  function playTrack(trackUri: string) {
    const albumUri = trackRef.current?.albumUri;
    if (!albumUri) return;
    return withSelectionLock(() => controlsRef.current?.playTrack(albumUri, trackUri));
  }

  function applyVolume(next: number) {
    controlsRef.current?.setVolume(next);
    setVolume(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextTrack();
      else if (e.key === "ArrowLeft") previousTrack();
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        applyVolume(Math.min(1, volume + VOLUME_STEP));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyVolume(Math.max(0, volume - VOLUME_STEP));
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [volume]);

  const progressPct = track?.duration ? Math.min(100, (progressMs / track.duration) * 100) : 0;
  const isPaused = track?.isPaused ?? true;
  const shuffle = track?.shuffle ?? false;

  return (
    <div className="player">
      <StyleSwitcher style={style} onChange={onStyleChange} />

      {style === "turntable" && (
        <div className="player__info">
          <p className="player__title">{track?.name ?? "Conecta Spotify"}</p>
          <p className="player__artist">{track?.artists ?? "y dale play desde cualquier dispositivo"}</p>
        </div>
      )}
      {style !== "turntable" && style !== "wheel" && (
        <div className="player__now-playing">
          <div className="player__art">
            {track?.albumArt ? (
              <img src={track.albumArt} alt="" />
            ) : (
              <div className="player__art-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="player__info player__info--left">
            <p className="player__title">{track?.name ?? "Conecta Spotify"}</p>
            <p className="player__artist">{track?.artists ?? "y dale play desde cualquier dispositivo"}</p>
          </div>
        </div>
      )}

      <div className="player__progress">
        <div className="player__progress-track">
          <div className="player__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="player__progress-labels">
          <span>{formatTime(progressMs)}</span>
          <span>{track ? formatTime(track.duration) : "0:00"}</span>
        </div>
      </div>

      {style === "wheel" && (
        <Wheel
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          trackName={track?.name ?? ""}
          artist={track?.artists ?? ""}
        />
      )}
      {style === "turntable" && (
        <Turntable
          albumArt={track?.albumArt ?? ""}
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          spinTrigger={spinTrigger}
        />
      )}
      {style === "radio" && (
        <RadioFace
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          volume={volume}
          onVolumeChange={applyVolume}
        />
      )}
      {style === "cassette" && (
        <Cassette
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          albumName={track?.albumName ?? ""}
          insertTrigger={insertTrigger}
        />
      )}

      <p className="player__hint">{HINTS[style]}</p>

      <button
        className={`player__shuffle ${shuffle ? "player__shuffle--on" : ""}`}
        onClick={() => controlsRef.current?.setShuffle(!shuffle)}
        aria-pressed={shuffle}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
            fill="currentColor"
          />
        </svg>
        Aleatorio
      </button>

      {style !== "radio" && <VolumeSlider value={volume} onChange={applyVolume} />}

      <LibraryPanel
        style={style}
        albumUri={track?.albumUri ?? ""}
        albumName={track?.albumName ?? ""}
        currentTrackUri={track?.trackUri ?? ""}
        onSelectAlbum={playAlbum}
        onSelectTrack={playTrack}
      />
    </div>
  );
}
