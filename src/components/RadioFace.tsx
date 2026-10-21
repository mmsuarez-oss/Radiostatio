import { useRotaryDrag } from "./useRotaryDrag";
import { RotaryKnob } from "./RotaryKnob";
import "./RadioFace.css";

interface RadioFaceProps {
  isPaused: boolean;
  volume: number;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
}

export function RadioFace({ isPaused, volume, onNext, onPrevious, onTogglePlay, onVolumeChange }: RadioFaceProps) {
  const { ref, dragging, pulse, rotation, handlers } = useRotaryDrag({ onNext, onPrevious, triggerDegrees: 45 });

  return (
    <div className="radio-face">
      <div className="radio-face__grille" aria-hidden="true">
        <span className="radio-face__station">RADIOSTATIO · 98.7 FM</span>
      </div>

      <div className="radio-face__controls">
        <div className="rotary-knob">
          <div
            ref={ref}
            className={`rotary-knob__dial ${dragging ? "rotary-knob__dial--dragging" : ""}`}
            style={{ transform: `rotate(${rotation}deg)` }}
            {...handlers}
          >
            {pulse > 0 && <span key={pulse} className="radio-face__pulse" />}
            <span className="rotary-knob__mark" />
          </div>
          <span className="rotary-knob__label">SINTONÍA</span>
        </div>

        <button className="radio-face__power" onClick={onTogglePlay} aria-label="Reproducir / Pausar">
          {isPaused ? (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M8 5l12 7-12 7z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          )}
        </button>

        <RotaryKnob value={volume} onChange={onVolumeChange} label="VOLUMEN" />
      </div>
    </div>
  );
}
