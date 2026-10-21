import { useRef, useState } from "react";
import { angleFromCenter } from "./knobMath";
import "./RotaryKnob.css";

interface RotaryKnobProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
  label: string;
}

const SWEEP_DEGREES = 135; // knob travels from -135deg (0%) to +135deg (100%)

export function RotaryKnob({ value, onChange, label }: RotaryKnobProps) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rotation = value * SWEEP_DEGREES * 2 - SWEEP_DEGREES;

  function updateFromPointer(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let visual = angleFromCenter(cx, cy, e.clientX, e.clientY) + 90;
    if (visual > 180) visual -= 360;
    if (visual < -180) visual += 360;

    const clamped = Math.max(-SWEEP_DEGREES, Math.min(SWEEP_DEGREES, visual));
    onChange((clamped + SWEEP_DEGREES) / (SWEEP_DEGREES * 2));
  }

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    ref.current?.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    updateFromPointer(e);
  }

  function handlePointerUp(e: React.PointerEvent) {
    setDragging(false);
    ref.current?.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="rotary-knob">
      <div
        ref={ref}
        className={`rotary-knob__dial ${dragging ? "rotary-knob__dial--dragging" : ""}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="rotary-knob__mark" />
      </div>
      <span className="rotary-knob__label">{label}</span>
    </div>
  );
}
