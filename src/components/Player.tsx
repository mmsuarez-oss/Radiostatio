import { useEffect, useRef, useState } from "react";
import { createPlayer, type NowPlaying } from "../spotify/player";
import { Wheel } from "./Wheel";
import { Turntable } from "./Turntable";
import { RadioFace } from "./RadioFace";
import { Cassette } from "./Cassette";
import { VolumeSlider } from "./VolumeSlider";
import { StyleSwitcher, type PlayerStyle } from "./StyleSwitcher";
import { LibraryShelf } from "./LibraryShelf";
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
  const controlsRef = useRef<Awaited<ReturnType<typeof createPlayer>> | null>(null);
  const trackRef = useRef<NowPlaying | null>(null);
  const anchorRef = useRef({ position: 0, timestamp: Date.now() });

  useEffect(() => {
    let cancelled = false;
    createPlayer((state) => !cancelled && setTrack(state)).then((controls) => {
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

  function playAlbum(uri: string) {
    controlsRef.current?.playAlbum(uri);
    if (style === "turntable") setSpinTrigger((s) => s + 1);
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

  return (
    <div className="player">
      <StyleSwitcher style={style} onChange={onStyleChange} />

      {style === "turntable" ? (
        <div className="player__info">
          <p className="player__title">{track?.name ?? "Conecta Spotify"}</p>
          <p className="player__artist">{track?.artists ?? "y dale play desde cualquier dispositivo"}</p>
        </div>
      ) : (
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
        <Wheel onNext={nextTrack} onPrevious={previousTrack} isPaused={isPaused} onTogglePlay={togglePlay} />
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
        <Cassette onNext={nextTrack} onPrevious={previousTrack} isPaused={isPaused} onTogglePlay={togglePlay} />
      )}

      <p className="player__hint">{HINTS[style]}</p>

      {style !== "radio" && <VolumeSlider value={volume} onChange={applyVolume} />}

      <LibraryShelf style={style} onSelect={playAlbum} />
    </div>
  );
}
