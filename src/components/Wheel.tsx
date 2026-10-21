import { formatRemaining, formatTime } from "../format";
import { playTick } from "../sfx";
import { useRotaryDrag } from "./useRotaryDrag";
import "./Wheel.css";

interface WheelProps {
  onNext: () => void;
  onPrevious: () => void;
  isPaused: boolean;
  onTogglePlay: () => void;
  trackName: string;
  artist: string;
  progressMs: number;
  durationMs: number;
}

export function Wheel({
  onNext,
  onPrevious,
  isPaused,
  onTogglePlay,
  trackName,
  artist,
  progressMs,
  durationMs,
}: WheelProps) {
  const played = durationMs ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  const { ref, dragging, pulse, handlers } = useRotaryDrag({
    onNext,
    onPrevious,
    triggerDegrees: 40,
    onDetent: playTick,
  });

  return (
    <div className="ipod">
      <div className="ipod__screen">
        <p className="ipod__brand">Radiostatio</p>
        <p className="ipod__track">{trackName || "Conecta Spotify"}</p>
        <p className="ipod__artist">{artist || "y dale play"}</p>
        <div className="ipod__progress">
          <span className="ipod__elapsed">{formatTime(progressMs)}</span>
          <span className="ipod__bar">
            <span className="ipod__bar-fill" style={{ width: `${played}%` }} />
          </span>
          <span className="ipod__remaining">{formatRemaining(durationMs - progressMs)}</span>
        </div>
      </div>

      <div ref={ref} className={`wheel ${dragging ? "wheel--dragging" : ""}`} {...handlers}>
        {pulse > 0 && <span key={pulse} className="wheel__pulse" />}
        <div className="wheel__ticks" aria-hidden="true" />
        <span className="wheel__label wheel__label--top">MENU</span>
        <button
          className="wheel__label wheel__label--left"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Canción anterior"
        >
          ⏮
        </button>
        <button
          className="wheel__label wheel__label--right"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Siguiente canción"
        >
          ⏭
        </button>
        <button
          className="wheel__label wheel__label--bottom"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Reproducir / Pausar"
        >
          ▶❚❚
        </button>
        <button
          className="wheel__play"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Reproducir / Pausar"
        >
          {isPaused ? (
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M8 5l12 7-12 7z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
