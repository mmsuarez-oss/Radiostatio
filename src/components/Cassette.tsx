import { useEffect, useState } from "react";
import "./Cassette.css";

interface CassetteProps {
  isPaused: boolean;
  albumName: string;
  insertTrigger: number;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
}

export function Cassette({ isPaused, albumName, insertTrigger, onNext, onPrevious, onTogglePlay }: CassetteProps) {
  const [inserting, setInserting] = useState(false);

  useEffect(() => {
    if (insertTrigger === 0) return;
    setInserting(true);
    const t = setTimeout(() => setInserting(false), 750);
    return () => clearTimeout(t);
  }, [insertTrigger]);

  return (
    <div className="cassette">
      <div className={`cassette__shell ${inserting ? "cassette__shell--inserting" : ""}`}>
        <p className="cassette__label">{albumName || "Mixtape"}</p>
        <div className="cassette__reels">
          <div className={`cassette__reel ${!isPaused ? "cassette__reel--spinning" : ""}`} />
          <div className={`cassette__reel ${!isPaused ? "cassette__reel--spinning" : ""}`} />
        </div>
      </div>

      <div className="cassette__buttons">
        <button className="cassette__button" onClick={onPrevious} aria-label="Canción anterior">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M6 5h2v14H6zm3 7 11-7v14z" fill="currentColor" />
          </svg>
        </button>
        <button className="cassette__button cassette__button--accent" onClick={onTogglePlay} aria-label="Reproducir / Pausar">
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
        <button className="cassette__button" onClick={onNext} aria-label="Siguiente canción">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
