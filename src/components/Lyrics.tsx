import { useEffect, useRef, useState } from "react";
import { fetchLyrics, type Lyrics as LyricsData } from "../lyrics";
import { makeLyricsCard } from "../shareCard";
import { TitleBar } from "./Compu";
import "./Lyrics.css";

export interface LyricsProps {
  trackUri: string;
  trackName: string;
  artists: string;
  albumArt: string;
  durationMs: number;
  progressMs: number;
}

type Status = "idle" | "loading" | "ready" | "missing" | "error";

const MENU = ["Archivo", "Edición", "Ver", "Insertar", "Formato", "Herramientas", "Tabla", "Ventana", "?"];

// Como en Spotify: unas pocas líneas, que en la tarjeta se lean grandes.
const MAX_PICK = 5;

/** La hoja de letras que venía adentro del disco, con la línea que suena marcada con resaltador. */
export function Lyrics({ trackUri, trackName, artists, albumArt, durationMs, progressMs }: LyricsProps) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [making, setMaking] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);
  const [card, setCard] = useState<Blob | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!trackUri || !trackName) return;
    const controller = new AbortController();
    setLyrics(null);
    setStatus("loading");
    setSelecting(false);
    setPicked([]);
    fetchLyrics({ name: trackName, artists, durationMs }, controller.signal)
      .then((found) => {
        setLyrics(found);
        setStatus(found ? "ready" : "missing");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
    // Son textos: cambian juntos con la canción, no con cada actualización del estado.
  }, [trackUri, trackName, artists, durationMs]);

  const synced = lyrics?.synced;
  const current = synced ? synced.findLastIndex((line) => line.time <= progressMs) : -1;
  // Las líneas para elegir: con tiempos o sin ellos, se comparten igual.
  const lines = synced ? synced.map((line) => line.text) : (lyrics?.plain?.split("\n") ?? []);
  const canShare = !lyrics?.instrumental && lines.some((line) => line.trim());

  // Solo se mueve la hoja, no la página: scrollIntoView arrastraría todo el rack.
  // Mientras se eligen líneas se queda quieta, para no sacarlas de abajo del dedo.
  useEffect(() => {
    const sheet = sheetRef.current;
    const line = currentRef.current;
    if (!sheet || !line || selecting) return;
    sheet.scrollTo({ top: line.offsetTop - sheet.clientHeight / 2 + line.clientHeight / 2, behavior: "smooth" });
  }, [current, selecting]);

  function toggle(i: number) {
    setPicked((prev) => (prev.includes(i) ? prev.filter((p) => p !== i) : prev.length < MAX_PICK ? [...prev, i] : prev));
  }

  function stopSelecting() {
    setSelecting(false);
    setPicked([]);
    setCardFailed(false);
  }

  async function createCard() {
    setMaking(true);
    setCardFailed(false);
    try {
      const chosen = [...picked].sort((a, b) => a - b).map((i) => lines[i]);
      setCard(await makeLyricsCard({ lines: chosen, title: trackName, artists, albumArt }));
    } catch {
      setCardFailed(true);
    } finally {
      setMaking(false);
    }
  }

  // Mientras se elige, cada línea con texto se toca (o se marca con Enter) para sumarla o sacarla.
  function lineProps(i: number, text: string, base: string) {
    const isPicked = picked.includes(i);
    const className = `${base} ${isPicked ? "lyrics__line--picked" : ""}`;
    if (!selecting || !text.trim()) return { className };
    return {
      className,
      role: "button",
      tabIndex: 0,
      "aria-pressed": isPicked,
      onClick: () => toggle(i),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(i);
        }
      },
    };
  }

  let body;
  if (status === "loading") body = <p className="lyrics__note">Buscando la hoja de letras…</p>;
  else if (status === "error") body = <p className="lyrics__note">No se pudo traer la letra. Prueba en la próxima canción.</p>;
  else if (status === "missing") {
    body = (
      <p className="lyrics__note">
        Esta canción no trae hoja de letras.{" "}
        <a href={`https://www.google.com/search?q=${encodeURIComponent(`${trackName} ${artists} letra`)}`} target="_blank" rel="noreferrer">
          Buscarla en la web
        </a>
      </p>
    );
  }
  else if (lyrics?.instrumental) body = <p className="lyrics__note">Instrumental: acá no se canta.</p>;
  else if (synced?.length) {
    body = synced.map((line, i) => (
      <p
        key={`${line.time}-${i}`}
        ref={i === current ? currentRef : undefined}
        {...lineProps(
          i,
          line.text,
          `lyrics__line ${i === current ? "lyrics__line--current" : ""} ${i < current ? "lyrics__line--past" : ""}`,
        )}
      >
        {/* Las líneas vacías marcan pausas: un punto medio para que no colapsen. */}
        <span>{line.text || "·"}</span>
      </p>
    ));
  } else if (lyrics?.plain) {
    body = (
      <div className="lyrics__plain">
        {lines.map((text, i) => (
          <p key={i} {...lineProps(i, text, "lyrics__plain-line")}>
            <span>{text}</span>
          </p>
        ))}
      </div>
    );
  }
  else body = <p className="lyrics__note">Pon algo y acá aparece la letra.</p>;

  return (
    <section className={`lyrics ${selecting ? "lyrics--selecting" : ""}`} aria-label="Letra">
      <h2 className="rack__label">Letra</h2>
      {/* El marco de ventana solo se ve con el estilo Compu 2000 (compu.css) */}
      <div className="lyrics__window">
        <TitleBar title={trackName ? `${trackName}.doc` : "Documento1"} />
        <div className="lyrics__menubar" aria-hidden="true">
          {MENU.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="lyrics__toolbar" aria-hidden="true">
          <span className="lyrics__combo">Normal</span>
          <span className="lyrics__combo">Tahoma</span>
          <span className="lyrics__combo lyrics__combo--small">13</span>
          <b>N</b>
          <i>K</i>
          <u>S</u>
        </div>
        <div className="lyrics__ruler" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        {canShare && (
          <div className="lyrics__share-bar">
            {selecting ? (
              <>
                <span className="lyrics__share-hint" aria-live="polite">
                  {cardFailed
                    ? "No se pudo armar la tarjeta"
                    : picked.length
                      ? `${picked.length} de ${MAX_PICK} líneas`
                      : `Toca hasta ${MAX_PICK} líneas`}
                </span>
                <button className="lyrics__share-button" onClick={stopSelecting}>
                  Cancelar
                </button>
                <button
                  className="lyrics__share-button lyrics__share-button--main"
                  disabled={!picked.length || making}
                  onClick={createCard}
                >
                  {making ? "Armando…" : "Crear tarjeta"}
                </button>
              </>
            ) : (
              <button className="lyrics__share-button" onClick={() => setSelecting(true)}>
                Compartir letra
              </button>
            )}
          </div>
        )}
        <div className="lyrics__sheet" ref={sheetRef}>
          {body}
        </div>
        <div className="lyrics__statusbar" aria-hidden="true">
          <span>Pág. 1</span>
          <span>Sec. 1</span>
          <span>Lín. {current + 1 || "—"}</span>
          <span>Col. 1</span>
          <span className="lyrics__status-off">GRB MCA EXT SOB</span>
        </div>
      </div>
      {lyrics && !synced && lyrics.plain && <p className="lyrics__footnote">Esta letra no viene sincronizada</p>}
      {card && (
        <ShareDialog
          card={card}
          title={trackName}
          artists={artists}
          onClose={() => {
            setCard(null);
            stopSelecting();
          }}
        />
      )}
    </section>
  );
}

interface ShareDialogProps {
  card: Blob;
  title: string;
  artists: string;
  onClose: () => void;
}

/** La tarjeta lista: se ve antes de mandarla, y se comparte o se descarga. */
function ShareDialog({ card, title, artists, onClose }: ShareDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [url] = useState(() => URL.createObjectURL(card));
  const name = `${title.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40) || "letra"}.png`;
  const file = new File([card], name, { type: "image/png" });
  // En la compu muchas veces no se puede compartir un archivo: ahí queda Descargar.
  const canShareFile = !!navigator.canShare?.({ files: [file] });

  useEffect(() => {
    ref.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <dialog ref={ref} className="share-card" onClose={onClose} aria-label="Compartir letra">
      <TitleBar title="Compartir letra" />
      <img className="share-card__image" src={url} alt={`Tarjeta con unas líneas de ${title}, de ${artists}`} />
      <div className="share-card__actions">
        {canShareFile && (
          <button
            className="lyrics__share-button lyrics__share-button--main"
            // Si se cierra el menú de compartir sin elegir nada, no pasa nada.
            onClick={() => navigator.share({ files: [file], text: `${title} — ${artists}` }).catch(() => {})}
          >
            Compartir
          </button>
        )}
        <a className="lyrics__share-button" href={url} download={name}>
          Descargar
        </a>
        <button className="lyrics__share-button" onClick={() => ref.current?.close()}>
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
