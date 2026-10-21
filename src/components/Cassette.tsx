import { useEffect, useRef, useState } from "react";
import "./Cassette.css";

interface CassetteProps {
  isPaused: boolean;
  albumName: string;
  insertTrigger: number;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
}

const EJECT_MS = 350;
const INSERT_MS = 750;

export function Cassette({ isPaused, albumName, insertTrigger, onNext, onPrevious, onTogglePlay }: CassetteProps) {
  const [displayed, setDisplayed] = useState(albumName);
  const [phase, setPhase] = useState<"idle" | "ejecting" | "inserting">("idle");
  const lastInsertTrigger = useRef(insertTrigger);

  // A shelf selection arrives with a fresh albumName AND a bumped insertTrigger in the
  // same update, so both must be handled together: eject with the *old* label still
  // showing, only swap to the new one once the old tape has slid out.
  useEffect(() => {
    const isShelfSelection = insertTrigger !== lastInsertTrigger.current;
    lastInsertTrigger.current = insertTrigger;

    if (!isShelfSelection) {
      setDisplayed(albumName);
      return;
    }

    setPhase("ejecting");
    const t1 = setTimeout(() => {
      setDisplayed(albumName);
      setPhase("inserting");
    }, EJECT_MS);
    const t2 = setTimeout(() => setPhase("idle"), EJECT_MS + INSERT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [albumName, insertTrigger]);

  const shellClass =
    phase === "ejecting" ? "cassette__shell--ejecting" : phase === "inserting" ? "cassette__shell--inserting" : "";

  return (
    <div className="cassette">
      <div className={`cassette__shell ${shellClass}`}>
        <div className="cassette__label-wrap">
          <span className="cassette__label-banner" aria-hidden="true" />
          <p className="cassette__label">{displayed || "Mixtape"}</p>
        </div>
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
