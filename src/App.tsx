import { useEffect, useState, type CSSProperties } from "react";
import { getStoredToken, handleRedirectCallback, logout } from "./spotify/auth";
import { Login } from "./components/Login";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
import { ACCENTS, BODIES, SKINS } from "./palettes";
import type { PlayerStyle } from "./components/StyleSwitcher";
import "./App.css";
import "./compu.css";

function usePersistedState<T extends string>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (localStorage.getItem(key) as T) ?? initial);
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getStoredToken());
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState<string>();
  const [guest, setGuest] = useState<"demo" | "local" | null>(null);
  const [theme, setTheme] = usePersistedState<string>("radiostatio_theme", "dark");
  const [accent, setAccent] = usePersistedState("radiostatio_accent", ACCENTS[0].value);
  const [body, setBody] = usePersistedState("radiostatio_body", BODIES[0].value);
  // Antes la letra y las canciones se elegían por separado: quien tenía Compu 2000 en
  // alguna de las dos arranca con la página entera en Compu 2000.
  const hadCompu = [localStorage.getItem("radiostatio_lyrics_look"), localStorage.getItem("radiostatio_songs_look")].includes("compu");
  const [storedSkin, setSkin] = usePersistedState("radiostatio_skin", hadCompu ? "compu" : SKINS[0].value);
  const skin = SKINS.some((s) => s.value === storedSkin) ? storedSkin : SKINS[0].value;
  const [storedStyle, setPlayerStyle] = usePersistedState<PlayerStyle>("radiostatio_style", "wheel");
  // La radio se jubiló: a quien la tenía guardada le toca el reproductor de CD.
  const playerStyle = (storedStyle as string) === "radio" ? "cd" : storedStyle;

  useEffect(() => {
    handleRedirectCallback().then(({ loggedIn: didLogin, error }) => {
      if (didLogin) setLoggedIn(true);
      setLoginError(error);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <div
      className="app"
      data-theme={theme}
      data-skin={skin}
      style={{ "--accent": accent, "--body": body } as CSSProperties}>
      <Settings
        theme={theme}
        onThemeChange={setTheme}
        accent={accent}
        onAccentChange={setAccent}
        body={body}
        onBodyChange={setBody}
        skin={skin}
        onSkinChange={setSkin}
        // Al salir se desmonta el reproductor, que se desconecta de Spotify al irse.
        onLogout={
          loggedIn
            ? () => {
                logout();
                setLoggedIn(false);
              }
            : undefined
        }
      />
      {loggedIn ? (
        <Player style={playerStyle} onStyleChange={setPlayerStyle} />
      ) : guest ? (
        <>
          <div className="demo-bar">
            <span>
              {guest === "demo"
                ? "Estás probando el aparato sin cuenta: no suena música."
                : "Suena tu propia música, desde tu disco: sin cuenta y sin internet."}
            </span>
            <button onClick={() => setGuest(null)}>Salir</button>
          </div>
          {guest === "demo" && <span className="demo-sello">Demo</span>}
          <Player style={playerStyle} onStyleChange={setPlayerStyle} mode={guest} />
        </>
      ) : (
        <Login error={loginError} onDemo={() => setGuest("demo")} onLocal={() => setGuest("local")} />
      )}
    </div>
  );
}
