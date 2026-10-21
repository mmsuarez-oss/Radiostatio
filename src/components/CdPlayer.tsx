import { useEffect, useRef } from "react";
import { playDiscSpin } from "../sfx";
import { useRotaryDrag } from "./useRotaryDrag";
import "./CdPlayer.css";

interface CdPlayerProps {
  albumArt: string;
  trackName: string;
  artist: string;
  trackUri: string;
  isPaused: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
}

export function CdPlayer({
  albumArt,
  trackName,
  artist,
  trackUri,
  isPaused,
  onNext,
  onPrevious,
  onTogglePlay,
}: CdPlayerProps) {
  const { ref, dragging, pulse, rotation, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 45 });

  // El motor acelerando cada vez que cambia la pista, no en la primera.
  const previousUri = useRef(trackUri);
  useEffect(() => {
    const previous = previousUri.current;
    previousUri.current = trackUri;
    if (previous && previous !== trackUri) playDiscSpin();
  }, [trackUri]);

  const spinning = !dragging && !isPaused;

  return (
    <div className="cd-player">
      <div className="cd-player__body">
        <div className="cd-player__lcd">
          <span className="cd-player__lcd-track">{trackName || "NO DISC"}</span>
          <span className="cd-player__lcd-artist">{artist || "—"}</span>
        </div>

        <div
          ref={ref}
          className={`cd-player__disc ${dragging ? "cd-player__disc--dragging" : ""} ${spinning ? "cd-player__disc--spinning" : ""}`}
          style={spinning ? undefined : { transform: `rotate(${rotation}deg)` }}
          {...handlers}
        >
          {pulse > 0 && <span key={pulse} className="cd-player__pulse" />}
          {albumArt && <img src={albumArt} alt="" draggable={false} />}
          <span className="cd-player__sheen" aria-hidden="true" />
          <span className="cd-player__hub" aria-hidden="true" />
        </div>

        <div className="cd-player__controls">
          <button className="cd-player__button" onClick={onPrevious} aria-label="Pista anterior">
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M6 5h2v14H6zm3 7 11-7v14z" fill="currentColor" />
            </svg>
          </button>
          <button
            className="cd-player__button cd-player__button--play"
            onClick={onTogglePlay}
            aria-label="Reproducir / Pausar"
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M8 5l12 7-12 7z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16">
                <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" fill="currentColor" />
              </svg>
            )}
          </button>
          <button className="cd-player__button" onClick={onNext} aria-label="Pista siguiente">
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <span className="cd-player__badge" aria-hidden="true">
          COMPACT DISC · DIGITAL AUDIO
        </span>
      </div>
    </div>
  );
}
