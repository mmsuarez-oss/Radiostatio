import { useEffect, useState } from "react";
import { useRotaryDrag } from "./useRotaryDrag";
import "./Turntable.css";

interface TurntableProps {
  albumArt: string;
  isPaused: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  spinTrigger: number;
}

export function Turntable({ albumArt, isPaused, onNext, onPrevious, onTogglePlay, spinTrigger }: TurntableProps) {
  const { ref, dragging, pulse, rotation, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 45 });
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (spinTrigger === 0) return;
    setSelecting(true);
    const t = setTimeout(() => setSelecting(false), 700);
    return () => clearTimeout(t);
  }, [spinTrigger]);

  return (
    <div className="turntable">
      <div
        ref={ref}
        className={`turntable__record ${dragging ? "turntable__record--dragging" : ""} ${selecting ? "turntable__record--selecting" : ""} ${!selecting && !dragging && !isPaused ? "turntable__record--spinning" : ""}`}
        style={selecting || (!dragging && !isPaused) ? undefined : { transform: `rotate(${rotation}deg)` }}
        {...handlers}
      >
        {pulse > 0 && <span key={pulse} className="turntable__pulse" />}
        {albumArt && <img src={albumArt} alt="" draggable={false} />}
        <div className="turntable__grooves" aria-hidden="true" />
        <button
          className="turntable__spindle"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
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
      </div>
      <div className="turntable__arm" aria-hidden="true">
        <div className="turntable__arm-head" />
      </div>
    </div>
  );
}
