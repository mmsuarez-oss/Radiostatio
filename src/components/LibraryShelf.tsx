import { useEffect, useState } from "react";
import { getLibraryItems, type LibraryItem } from "../spotify/library";
import { redirectToLogin } from "../spotify/auth";
import type { PlayerStyle } from "./StyleSwitcher";
import "./LibraryShelf.css";

interface LibraryShelfProps {
  style: PlayerStyle;
  onSelect: (uri: string) => void;
  /** Si viene, se muestran estos (búsqueda) en vez de la biblioteca guardada. */
  items?: LibraryItem[];
}

type KindFilter = "all" | LibraryItem["kind"];

const KINDS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "album", label: "Álbumes" },
  { value: "playlist", label: "Playlists" },
];

// Sin tildes ni mayúsculas: "cancion" tiene que encontrar "Canción".
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function LibraryShelf({ style, onSelect, items: given }: LibraryShelfProps) {
  const [saved, setSaved] = useState<LibraryItem[]>([]);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  useEffect(() => {
    if (given) return;
    getLibraryItems()
      .then(setSaved)
      .catch((e) => {
        console.error("getLibraryItems failed", e);
        setNeedsReconnect(true);
      });
  }, [given]);

  const needle = fold(query.trim());
  const items = given
    ? given
    : saved.filter(
        // En los discos el subtítulo es el artista y sirve para buscar; en las playlists es "N canciones".
        (item) =>
          (kind === "all" || item.kind === kind) &&
          fold(item.kind === "album" ? `${item.name} ${item.subtitle}` : item.name).includes(needle),
      );

  if (needsReconnect) {
    return (
      <button className="library-shelf__reconnect" onClick={() => redirectToLogin()}>
        Reconecta tu cuenta para ver tus álbumes y playlists
      </button>
    );
  }

  // Los resultados de búsqueda ya vienen filtrados; la biblioteca guardada lleva su propio filtro.
  if (given ? items.length === 0 : saved.length === 0) return null;

  const itemClass =
    style === "cassette"
      ? "library-shelf__item--tape"
      : style === "wheel"
        ? "library-shelf__item--square"
        : "library-shelf__item--disc";

  const shelf = (
    <div className={`library-shelf library-shelf--${style}`}>
      {items.map((item) => (
        <button
          key={item.uri}
          className="library-shelf__entry"
          onClick={() => onSelect(item.uri)}
          title={`${item.name} — ${item.subtitle}`}
        >
          <span className={`library-shelf__item ${itemClass}`}>
            {item.image && <img src={item.image} alt="" />}
            {style === "turntable" && <span className="library-shelf__hole" aria-hidden="true" />}
            {style === "cassette" && (
              <>
                <span className="library-shelf__reel" aria-hidden="true" />
                <span className="library-shelf__reel" aria-hidden="true" />
              </>
            )}
          </span>
          <span className="library-shelf__name">{item.name}</span>
        </button>
      ))}
    </div>
  );

  if (given) return shelf;

  return (
    <div className="library-shelf__saved">
      <div className="library-shelf__filter">
        <input
          type="search"
          className="library-shelf__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtra tus discos y playlists"
          aria-label="Filtrar biblioteca"
        />
        <div className="library-shelf__kinds" role="group" aria-label="Tipo">
          {KINDS.map((option) => (
            <button
              key={option.value}
              className={`library-shelf__kind ${kind === option.value ? "library-shelf__kind--active" : ""}`}
              aria-pressed={kind === option.value}
              onClick={() => setKind(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {items.length > 0 ? shelf : <p className="library-shelf__empty">No hay nada con ese nombre</p>}
    </div>
  );
}
