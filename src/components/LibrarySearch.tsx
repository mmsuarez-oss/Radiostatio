import { useEffect, useState } from "react";
import { searchCatalog, type LibraryItem, type SearchTrack } from "../spotify/library";
import { LibraryShelf } from "./LibraryShelf";
import type { PlayerStyle } from "./StyleSwitcher";
import { formatTime } from "../format";
import "./LibrarySearch.css";

interface LibrarySearchProps {
  style: PlayerStyle;
  onSelectAlbum: (uri: string) => void;
  onSelectTrack: (trackUri: string, albumUri: string) => void;
}

const MIN_QUERY = 2;

export function LibrarySearch({ style, onSelectAlbum, onSelectTrack }: LibrarySearchProps) {
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<LibraryItem[]>([]);
  const [tracks, setTracks] = useState<SearchTrack[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setAlbums([]);
      setTracks([]);
      setStatus("idle");
      return;
    }

    // Una búsqueda por tecla quema el rate limit de Spotify y además muestra
    // resultados de lo que estabas escribiendo hace tres letras.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("searching");
      searchCatalog(trimmed, controller.signal)
        .then((results) => {
          setAlbums(results.albums);
          setTracks(results.tracks);
          setStatus("idle");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setStatus("error");
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const empty = status === "idle" && trimmed.length >= MIN_QUERY && albums.length === 0 && tracks.length === 0;

  return (
    <div className="record-shop">
      <div className="record-shop__counter">
        <input
          type="search"
          className="record-shop__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un artista, un disco o una canción"
          aria-label="Buscar en Spotify"
        />
      </div>

      {trimmed.length < MIN_QUERY && <p className="record-shop__welcome">Pasa y revisa las bateas</p>}
      {status === "searching" && <p className="record-shop__note">Revisando el depósito…</p>}
      {status === "error" && <p className="record-shop__note">No se pudo buscar. Prueba de nuevo.</p>}
      {empty && <p className="record-shop__note">No hay nada con ese nombre</p>}

      {albums.length > 0 && (
        <>
          <p className="record-shop__divider">Discos</p>
          <LibraryShelf style={style} items={albums} onSelect={onSelectAlbum} />
        </>
      )}

      {tracks.length > 0 && (
        <>
          <p className="record-shop__divider">Canciones</p>
          <div className="record-shop__tracks">
            {tracks.map((track) => (
              <button
                key={track.uri}
                className="record-shop__track"
                onClick={() => onSelectTrack(track.uri, track.albumUri)}
              >
                {track.image ? (
                  <img className="record-shop__track-art" src={track.image} alt="" />
                ) : (
                  <span className="record-shop__track-art" aria-hidden="true" />
                )}
                <span className="record-shop__track-info">
                  <span className="record-shop__track-name">{track.name}</span>
                  <span className="record-shop__track-artist">{track.artists}</span>
                </span>
                <span className="record-shop__price">{formatTime(track.durationMs)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
