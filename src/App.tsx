import { useEffect, useState, type CSSProperties } from "react";
import { getStoredToken, handleRedirectCallback } from "./spotify/auth";
import { Login } from "./components/Login";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
import { ACCENTS, BODIES } from "./palettes";
import type { PlayerStyle } from "./components/StyleSwitcher";
import "./App.css";

function usePersistedState<T extends string>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (localStorage.getItem(key) as T) ?? initial);
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getStoredToken());
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState<string>();
  const [demo, setDemo] = useState(false);
  const [theme, setTheme] = usePersistedState<string>("radiostatio_theme", "dark");
  const [accent, setAccent] = usePersistedState("radiostatio_accent", ACCENTS[0].value);
  const [body, setBody] = usePersistedState("radiostatio_body", BODIES[0].value);
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
    <div className="app" data-theme={theme} style={{ "--accent": accent, "--body": body } as CSSProperties}>
      <Settings
        theme={theme}
        onThemeChange={setTheme}
        accent={accent}
        onAccentChange={setAccent}
        body={body}
        onBodyChange={setBody}
      />
      {loggedIn ? (
        <Player style={playerStyle} onStyleChange={setPlayerStyle} />
      ) : demo ? (
        <>
          <div className="demo-bar">
            <span>Estás probando el aparato sin cuenta: no suena música.</span>
            <button onClick={() => setDemo(false)}>Salir del demo</button>
          </div>
          <Player style={playerStyle} onStyleChange={setPlayerStyle} demo />
        </>
      ) : (
        <Login error={loginError} onDemo={() => setDemo(true)} />
      )}
    </div>
  );
}
