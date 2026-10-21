import "./StyleSwitcher.css";

export type PlayerStyle = "wheel" | "turntable" | "radio" | "cassette";

const OPTIONS: { id: PlayerStyle; label: string }[] = [
  { id: "wheel", label: "Rueda" },
  { id: "turntable", label: "Tornamesa" },
  { id: "radio", label: "Radio" },
  { id: "cassette", label: "Casete" },
];

interface StyleSwitcherProps {
  style: PlayerStyle;
  onChange: (style: PlayerStyle) => void;
}

export function StyleSwitcher({ style, onChange }: StyleSwitcherProps) {
  return (
    <div className="style-switcher" role="tablist" aria-label="Estilo del reproductor">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={style === o.id}
          className={`style-switcher__option ${style === o.id ? "style-switcher__option--active" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
