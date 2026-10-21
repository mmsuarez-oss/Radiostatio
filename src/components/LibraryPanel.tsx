import { useEffect, useState } from "react";
import { getAlbumTracks, type AlbumTrack } from "../spotify/library";
import { LibraryShelf } from "./LibraryShelf";
import { LibrarySearch } from "./LibrarySearch";
import type { PlayerStyle } from "./StyleSwitcher";
import "./LibraryPanel.css";

interface LibraryPanelProps {
  style: PlayerStyle;
  albumUri: string;
  albumName: string;
  currentTrackUri: string;
  onSelectAlbum: (uri: string) => void;
  onSelectTrack: (trackUri: string, albumUri?: string) => void;
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export function LibraryPanel({
  style,
  albumUri,
  albumName,
  currentTrackUri,
  onSelectAlbum,
  onSelectTrack,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<"tracks" | "albums" | "search">("tracks");
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!albumUri) return;
    setError(false);
    getAlbumTracks(albumUri)
      .then(setTracks)
      .catch(() => setError(true));
  }, [albumUri]);

  return (
    <details className="library-panel">
      <summary className="library-panel__summary">
        <span className="library-panel__summary-text">Biblioteca</span>
        <span className="library-panel__chevron" aria-hidden="true" />
      </summary>

      <div className="library-panel__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "tracks"}
          className={`library-panel__tab ${tab === "tracks" ? "library-panel__tab--active" : ""}`}
          onClick={() => setTab("tracks")}
        >
          Canciones
        </button>
        <button
          role="tab"
          aria-selected={tab === "albums"}
          className={`library-panel__tab ${tab === "albums" ? "library-panel__tab--active" : ""}`}
          onClick={() => setTab("albums")}
        >
          Álbumes
        </button>
        <button
          role="tab"
          aria-selected={tab === "search"}
          className={`library-panel__tab ${tab === "search" ? "library-panel__tab--active" : ""}`}
          onClick={() => setTab("search")}
        >
          Buscar
        </button>
      </div>

      {tab === "search" && (
        <LibrarySearch style={style} onSelectAlbum={onSelectAlbum} onSelectTrack={onSelectTrack} />
      )}

      {tab === "tracks" && (
        <div className="library-panel__tracks">
          {albumName && <p className="library-panel__album">{albumName}</p>}
          {error && <p className="library-panel__empty">No se pudieron cargar las canciones</p>}
          {!error && tracks.length === 0 && <p className="library-panel__empty">Sin canciones todavía</p>}
          {tracks.map((track, i) => (
            <button
              key={track.uri}
              className={`library-panel__track ${track.uri === currentTrackUri ? "library-panel__track--current" : ""}`}
              onClick={() => onSelectTrack(track.uri)}
            >
              <span className="library-panel__track-num">{i + 1}</span>
              <span className="library-panel__track-info">
                <span className="library-panel__track-name">{track.name}</span>
                <span className="library-panel__track-artist">{track.artists}</span>
              </span>
              <span className="library-panel__track-time">{formatDuration(track.durationMs)}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "albums" && <LibraryShelf style={style} onSelect={onSelectAlbum} />}
    </details>
  );
}
