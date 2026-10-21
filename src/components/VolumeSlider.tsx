import { useRef, useState } from "react";
import "./VolumeSlider.css";

interface VolumeSliderProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
}

export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  function updateFromPointer(e: React.PointerEvent) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onChange(Math.min(1, Math.max(0, ratio)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    trackRef.current?.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    updateFromPointer(e);
  }

  function handlePointerUp(e: React.PointerEvent) {
    setDragging(false);
    trackRef.current?.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="volume">
      <svg viewBox="0 0 24 24" width="16" height="16" className="volume__icon">
        <path
          fill="currentColor"
          d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z"
        />
      </svg>
      <div
        ref={trackRef}
        className={`volume__track ${dragging ? "volume__track--dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="volume__fill" style={{ width: `${value * 100}%` }} />
        <div className="volume__thumb" style={{ left: `${value * 100}%` }} />
      </div>
    </div>
  );
}
