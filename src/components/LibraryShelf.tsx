import { useEffect, useState } from "react";
import { getLibraryItems, type LibraryItem } from "../spotify/library";
import { redirectToLogin } from "../spotify/auth";
import type { PlayerStyle } from "./StyleSwitcher";
import "./LibraryShelf.css";

interface LibraryShelfProps {
  style: PlayerStyle;
  onSelect: (uri: string) => void;
}

export function LibraryShelf({ style, onSelect }: LibraryShelfProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    getLibraryItems()
      .then(setItems)
      .catch((e) => {
        console.error("getLibraryItems failed", e);
        setNeedsReconnect(true);
      });
  }, []);

  if (needsReconnect) {
    return (
      <button className="library-shelf__reconnect" onClick={() => redirectToLogin()}>
        Reconecta tu cuenta para ver tus álbumes y playlists
      </button>
    );
  }

  if (items.length === 0) return null;

  const itemClass =
    style === "cassette"
      ? "library-shelf__item--tape"
      : style === "wheel"
        ? "library-shelf__item--square"
        : "library-shelf__item--disc";

  return (
    <div className={`library-shelf library-shelf--${style}`}>
      {items.map((item) => (
        <button
          key={item.uri}
          className={`library-shelf__item ${itemClass}`}
          onClick={() => onSelect(item.uri)}
          title={`${item.name} — ${item.subtitle}`}
        >
          {item.image && <img src={item.image} alt={item.name} />}
          {style === "turntable" && <span className="library-shelf__hole" aria-hidden="true" />}
          {style === "cassette" && (
            <>
              <span className="library-shelf__reel" aria-hidden="true" />
              <span className="library-shelf__reel" aria-hidden="true" />
            </>
          )}
        </button>
      ))}
    </div>
  );
}
