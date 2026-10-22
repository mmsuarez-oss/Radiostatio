import { useRef, useState } from "react";
import { angleFromCenter } from "./knobMath";

interface RotaryDragOptions {
  onNext: () => void;
  onPrevious: () => void;
  triggerDegrees?: number;
  /** Muesca mecánica: suena bastante más seguido que el cambio de canción. */
  onDetent?: () => void;
  detentDegrees?: number;
}

export function useRotaryDrag({
  onNext,
  onPrevious,
  triggerDegrees = 40,
  onDetent,
  detentDegrees = 10,
}: RotaryDragOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [rotation, setRotation] = useState(0);
  // El dedo que manda. En el teléfono es fácil que caiga un segundo dedo (o el
  // borde de la mano) sobre la rueda: sin esto, sus eventos se mezclan con los
  // del primero, los ángulos saltan y la canción cambia sola.
  const activePointer = useRef<number | null>(null);
  const lastAngle = useRef(0);
  const totalDelta = useRef(0);
  const firedSinceStart = useRef(0);
  const detentsSinceStart = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || activePointer.current !== null) return;
    activePointer.current = e.pointerId;
    const rect = el.getBoundingClientRect();
    lastAngle.current = angleFromCenter(rect.left + rect.width / 2, rect.top + rect.height / 2, e.clientX, e.clientY);
    totalDelta.current = 0;
    firedSinceStart.current = 0;
    detentsSinceStart.current = 0;
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerId !== activePointer.current) return;
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

    if (onDetent) {
      const detents = Math.trunc(totalDelta.current / detentDegrees);
      if (detents !== detentsSinceStart.current) {
        detentsSinceStart.current = detents;
        onDetent();
      }
    }

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

  // También con pointercancel: el navegador se queda con el gesto cuando lo
  // confunde con uno del sistema, y si no soltamos acá el arrastre queda colgado.
  function endDrag(e: React.PointerEvent) {
    if (e.pointerId !== activePointer.current) return;
    activePointer.current = null;
    setDragging(false);
    setRotation(0);
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
  }

  return {
    ref,
    dragging,
    pulse,
    rotation,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
