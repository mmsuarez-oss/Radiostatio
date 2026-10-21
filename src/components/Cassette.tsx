import { useEffect, useRef, useState } from "react";
import { playSfx } from "../sfx";
import "./Cassette.css";

interface CassetteProps {
  isPaused: boolean;
  albumName: string;
  albumArt: string;
  albumUri: string;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
}

type Phase = "idle" | "opening" | "ejecting" | "inserting" | "closing";

// La secuencia mecánica: se abre la tapa, sale el casete viejo, entra el nuevo,
// se cierra la tapa. Los ms coinciden con las animaciones de Cassette.css.
const OPEN_MS = 300;
const EJECT_MS = 380;
const INSERT_MS = 560;
const CLOSE_MS = 320;

export function Cassette({
  isPaused,
  albumName,
  albumArt,
  albumUri,
  onNext,
  onPrevious,
  onTogglePlay,
}: CassetteProps) {
  const [tape, setTape] = useState({ name: albumName, art: albumArt });
  const [phase, setPhase] = useState<Phase>("idle");
  const previousUri = useRef(albumUri);

  // El cambio de casete se dispara del álbum que ya llegó, no del click: así la
  // animación y la portada nueva van siempre juntas, aunque la red tarde.
  useEffect(() => {
    const previous = previousUri.current;
    previousUri.current = albumUri;

    // Primer álbum de la sesión, o el mismo con datos frescos: entra sin ceremonia.
    if (!previous || previous === albumUri) {
      setTape({ name: albumName, art: albumArt });
      return;
    }

    setPhase("opening");
    playSfx("cassette-eject");

    const timers = [
      setTimeout(() => setPhase("ejecting"), OPEN_MS),
      setTimeout(() => {
        setTape({ name: albumName, art: albumArt });
        setPhase("inserting");
        playSfx("cassette-insert");
      }, OPEN_MS + EJECT_MS),
      setTimeout(() => {
        setPhase("closing");
        playSfx("cassette-close");
      }, OPEN_MS + EJECT_MS + INSERT_MS),
      setTimeout(() => setPhase("idle"), OPEN_MS + EJECT_MS + INSERT_MS + CLOSE_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [albumUri, albumName, albumArt]);

  const lidOpen = phase === "opening" || phase === "ejecting" || phase === "inserting";
  const reelsSpinning = !isPaused && phase === "idle";

  return (
    <div className="cassette">
      <div className="cassette__deck">
        <div className={`cassette__bay ${lidOpen ? "cassette__bay--open" : ""}`}>
          <div className={`cassette__tape cassette__tape--${phase}`}>
            <div className="cassette__tape-label">
              {tape.art ? (
                <img src={tape.art} alt="" draggable={false} />
              ) : (
                <span className="cassette__tape-art-empty" aria-hidden="true" />
              )}
              <p className="cassette__tape-title">{tape.name || "Mixtape"}</p>
            </div>

            <div className="cassette__tape-window">
              <div className={`cassette__reel ${reelsSpinning ? "cassette__reel--spinning" : ""}`} />
              <span className="cassette__tape-span" aria-hidden="true" />
              <div className={`cassette__reel ${reelsSpinning ? "cassette__reel--spinning" : ""}`} />
            </div>
            <span className="cassette__tape-head" aria-hidden="true" />
          </div>

          <div className="cassette__lid" aria-hidden="true">
            <span className="cassette__lid-grip" />
          </div>
        </div>

        <div className="cassette__speaker" aria-hidden="true" />

        <div className="cassette__keys">
          <button className="cassette__key" onClick={onPrevious} aria-label="Canción anterior">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path d="M6 5h2v14H6zm3 7 11-7v14z" fill="currentColor" />
            </svg>
          </button>
          <button className="cassette__key cassette__key--play" onClick={onTogglePlay} aria-label="Reproducir / Pausar">
            {isPaused ? (
              <svg viewBox="0 0 24 24" width="17" height="17">
                <path d="M8 5l12 7-12 7z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="17" height="17">
                <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" fill="currentColor" />
              </svg>
            )}
          </button>
          <button className="cassette__key" onClick={onNext} aria-label="Siguiente canción">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
