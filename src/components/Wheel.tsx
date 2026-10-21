import { useRotaryDrag } from "./useRotaryDrag";
import "./Wheel.css";

interface WheelProps {
  onNext: () => void;
  onPrevious: () => void;
  isPaused: boolean;
  onTogglePlay: () => void;
  trackName: string;
  artist: string;
}

export function Wheel({ onNext, onPrevious, isPaused, onTogglePlay, trackName, artist }: WheelProps) {
  const { ref, dragging, pulse, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 40 });

  return (
    <div className="ipod">
      <div className="ipod__screen">
        <p className="ipod__brand">Radiostatio</p>
        <p className="ipod__track">{trackName || "Conecta Spotify"}</p>
        <p className="ipod__artist">{artist || "y dale play"}</p>
      </div>

      <div ref={ref} className={`wheel ${dragging ? "wheel--dragging" : ""}`} {...handlers}>
        {pulse > 0 && <span key={pulse} className="wheel__pulse" />}
        <div className="wheel__ticks" aria-hidden="true" />
        <span className="wheel__label wheel__label--top">MENU</span>
        <span className="wheel__label wheel__label--left">⏮</span>
        <span className="wheel__label wheel__label--right">⏭</span>
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
