import { useState } from "react";
import "./Settings.css";

// El primero de cada lista es el color de fábrica.
export const ACCENTS = [
  { value: "#e3b765", label: "Ámbar" },
  { value: "#e0614f", label: "Rojo" },
  { value: "#5ec98b", label: "Verde" },
  { value: "#6ab6f0", label: "Celeste" },
  { value: "#f08bc0", label: "Rosa" },
  { value: "#dcd8cf", label: "Hueso" },
];

export const BODIES = [
  { value: "#1f5aa8", label: "Azul" },
  { value: "#9e2f2a", label: "Rojo" },
  { value: "#2c7a56", label: "Verde" },
  { value: "#3a3d44", label: "Grafito" },
  { value: "#b08a4a", label: "Mostaza" },
  { value: "#5b3f9e", label: "Violeta" },
];

interface SettingsProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  accent: string;
  onAccentChange: (color: string) => void;
  body: string;
  onBodyChange: (color: string) => void;
}

interface SwatchesProps {
  options: { value: string; label: string }[];
  current: string;
  onPick: (color: string) => void;
}

function Swatches({ options, current, onPick }: SwatchesProps) {
  return (
    <div className="settings__swatches">
      {options.map((option) => (
        <button
          key={option.value}
          className={`settings__swatch ${option.value === current ? "settings__swatch--active" : ""}`}
          style={{ background: option.value }}
          onClick={() => onPick(option.value)}
          aria-pressed={option.value === current}
          aria-label={option.label}
          title={option.label}
        />
      ))}
    </div>
  );
}

export function Settings({ theme, onThemeChange, accent, onAccentChange, body, onBodyChange }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <div className="settings">
      <button
        className="settings__button"
        onClick={() => onThemeChange(next)}
        aria-label={next === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.42 0l.7.7a1 1 0 1 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42zm13.44 13.44a1 1 0 0 1 1.42 0l.7.7a1 1 0 0 1-1.42 1.42l-.7-.7a1 1 0 0 1 0-1.42zM2 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm18 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1zM4.22 19.78a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0zM17.66 6.34a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <button
        className={`settings__button ${open ? "settings__button--active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Colores"
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="currentColor"
            d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1a1.5 1.5 0 0 1 1.14-2.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
          />
        </svg>
      </button>

      {open && (
        <div className="settings__panel">
          <p className="settings__label">Detalles</p>
          <Swatches options={ACCENTS} current={accent} onPick={onAccentChange} />
          <p className="settings__label">Carcasa</p>
          <Swatches options={BODIES} current={body} onPick={onBodyChange} />
        </div>
      )}
    </div>
  );
}
