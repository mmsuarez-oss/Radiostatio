import { useEffect, useState } from "react";
import { addToQueue, getQueue, QUEUE_CHANGED, type QueueTrack } from "../spotify/player";
import { TitleBar } from "./Compu";
import "./Queue.css";

// Spotify devuelve hasta 20; en la columna entran bien unos pocos.
const VISIBLE = 8;

/** Lo que sigue, como la lista de temas escrita a mano en la tapa del casete. */
export function Queue({ trackUri }: { trackUri: string }) {
  const [tracks, setTracks] = useState<QueueTrack[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      getQueue()
        .then((queue) => {
          if (cancelled) return;
          setTracks(queue);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    }
    load();
    window.addEventListener(QUEUE_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(QUEUE_CHANGED, load);
    };
  }, [trackUri]);

  return (
    <section className="queue" aria-label="Lo que sigue">
      <h2 className="rack__label">Sigue</h2>
      <TitleBar title="Sigue" />
      <div className="queue__card">
        {failed && <p className="queue__note">No se pudo leer la cola</p>}
        {!failed && tracks.length === 0 && <p className="queue__note">Nada en fila. Agrega temas con el +</p>}
        <ol className="queue__list">
          {tracks.slice(0, VISIBLE).map((track, i) => (
            <li key={`${track.uri}-${i}`} className="queue__item">
              {track.image ? <img className="queue__art" src={track.image} alt="" /> : <span className="queue__art" />}
              <span className="queue__info">
                <span className="queue__name">{track.name}</span>
                <span className="queue__artist">{track.artists}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** El + al lado de cada canción: la manda al final de la cola. */
export function AddToQueueButton({ uri }: { uri: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      className={`add-to-queue add-to-queue--${state}`}
      onClick={() =>
        addToQueue(uri)
          .then(() => setState("done"))
          .catch(() => setState("error"))
      }
      aria-label="Agregar a la cola"
      title={state === "error" ? "No se pudo: ¿hay algo sonando?" : "Agregar a la cola"}
    >
      {state === "done" ? "✓" : state === "error" ? "!" : "+"}
    </button>
  );
}
