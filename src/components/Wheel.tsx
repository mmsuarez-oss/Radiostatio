import { useRotaryDrag } from "./useRotaryDrag";
import "./Wheel.css";

interface WheelProps {
  onNext: () => void;
  onPrevious: () => void;
  isPaused: boolean;
  onTogglePlay: () => void;
}

export function Wheel({ onNext, onPrevious, isPaused, onTogglePlay }: WheelProps) {
  const { ref, dragging, pulse, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 40 });

  return (
    <div ref={ref} className={`wheel ${dragging ? "wheel--dragging" : ""}`} {...handlers}>
      {pulse > 0 && <span key={pulse} className="wheel__pulse" />}
      <div className="wheel__ticks" aria-hidden="true" />
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
  );
}
