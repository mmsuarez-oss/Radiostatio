import { useEffect, useState } from "react";
import { getStoredToken, handleRedirectCallback } from "./spotify/auth";
import { Login } from "./components/Login";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
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
  const [theme, setTheme] = usePersistedState<string>("radiostatio_theme", "dark");
  const [storedStyle, setPlayerStyle] = usePersistedState<PlayerStyle>("radiostatio_style", "wheel");
  // La radio se jubiló: a quien la tenía guardada le toca el reproductor de CD.
  const playerStyle = (storedStyle as string) === "radio" ? "cd" : storedStyle;

  useEffect(() => {
    handleRedirectCallback().then((didLogin) => {
      if (didLogin) setLoggedIn(true);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <div className="app" data-theme={theme}>
      <Settings theme={theme} onThemeChange={setTheme} />
      {loggedIn ? <Player style={playerStyle} onStyleChange={setPlayerStyle} /> : <Login />}
    </div>
  );
}
