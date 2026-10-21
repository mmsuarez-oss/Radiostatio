import { useEffect, useRef, useState } from "react";
import { formatRemaining } from "../format";
import { playSfx } from "../sfx";
import { useRotaryDrag } from "./useRotaryDrag";
import "./Turntable.css";

interface TurntableProps {
  albumArt: string;
  isPaused: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  spinTrigger: number;
  remainingMs: number;
}

export function Turntable({
  albumArt,
  isPaused,
  onNext,
  onPrevious,
  onTogglePlay,
  spinTrigger,
  remainingMs,
}: TurntableProps) {
  const { ref, dragging, pulse, rotation, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 45 });
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (spinTrigger === 0) return;
    playSfx("vinyl-stop", { volume: 0.5 });
    setSelecting(true);
    const t = setTimeout(() => setSelecting(false), 700);
    return () => clearTimeout(t);
  }, [spinTrigger]);

  // El frenazo del plato suena solo al pausar: ni al montar ni al reanudar.
  const wasPaused = useRef(isPaused);
  useEffect(() => {
    if (isPaused && !wasPaused.current) playSfx("vinyl-stop", { volume: 0.45 });
    wasPaused.current = isPaused;
  }, [isPaused]);

  return (
    <div className="turntable">
      <span className="turntable__brand" aria-hidden="true">
        radiostatio
      </span>

      <div className="turntable__platter">
        <div
          ref={ref}
          className={`turntable__record ${dragging ? "turntable__record--dragging" : ""} ${selecting ? "turntable__record--selecting" : ""} ${!selecting && !dragging && !isPaused ? "turntable__record--spinning" : ""}`}
          style={selecting || (!dragging && !isPaused) ? undefined : { transform: `rotate(${rotation}deg)` }}
          {...handlers}
        >
          {pulse > 0 && <span key={pulse} className="turntable__pulse" />}
          {albumArt && <img src={albumArt} alt="" draggable={false} />}
          <div className="turntable__grooves" aria-hidden="true" />
          {/* Grabado a mano en el lacre, como en los vinilos de verdad */}
          <span className="turntable__etching" aria-hidden="true">
            GRACE
          </span>
          <span className="turntable__spindle" aria-hidden="true" />
        </div>
      </div>

      <div className={`turntable__arm ${!isPaused ? "turntable__arm--playing" : ""}`} aria-hidden="true">
        <div className="turntable__arm-tube">
          <span className="turntable__counterweight" />
          <span className="turntable__headshell" />
        </div>
      </div>

      <div className="turntable__controls">
        <span className="turntable__time">{formatRemaining(remainingMs)}</span>
        <button className="turntable__play" onClick={onTogglePlay} aria-label="Reproducir / Pausar">
          {isPaused ? (
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M8 5l12 7-12 7z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14">
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      <span className="turntable__power" aria-hidden="true" />
    </div>
  );
}
