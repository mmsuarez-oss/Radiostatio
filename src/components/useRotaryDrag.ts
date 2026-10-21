import { useRef, useState } from "react";
import { angleFromCenter } from "./knobMath";

interface RotaryDragOptions {
  onNext: () => void;
  onPrevious: () => void;
  triggerDegrees?: number;
}

export function useRotaryDrag({ onNext, onPrevious, triggerDegrees = 40 }: RotaryDragOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [rotation, setRotation] = useState(0);
  const lastAngle = useRef(0);
  const totalDelta = useRef(0);
  const firedSinceStart = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    lastAngle.current = angleFromCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, e.clientX, e.clientY);
    totalDelta.current = 0;
    firedSinceStart.current = 0;
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const current = angleFromCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, e.clientX, e.clientY);

    let step = current - lastAngle.current;
    if (step > 180) step -= 360;
    if (step < -180) step += 360;
    lastAngle.current = current;
    totalDelta.current += step;
    setRotation(totalDelta.current);

    const steps = Math.trunc(totalDelta.current / triggerDegrees);
    let diff = steps - firedSinceStart.current;
    while (diff !== 0) {
      if (diff > 0) {
        onNext();
        diff -= 1;
      } else {
        onPrevious();
        diff += 1;
      }
      setPulse((p) => p + 1);
    }
    firedSinceStart.current = steps;
  }

  function handlePointerUp(e: React.PointerEvent) {
    setDragging(false);
    setRotation(0);
    ref.current?.releasePointerCapture(e.pointerId);
  }

  return {
    ref,
    dragging,
    pulse,
    rotation,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
