import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPlayer, type NowPlaying } from "../spotify/player";
import { createDemoPlayer } from "../spotify/demoPlayer";
import { albumesDe, createLocalPlayer, type LocalTrack } from "../localPlayer";
import { elegirCarpeta, hayCarpetas, reabrirCarpeta, recuperarCarpeta, type Entrada } from "../localFolder";
import { LibraryShelf } from "./LibraryShelf";
import { setSfxVolume } from "../sfx";
import { formatTime } from "../format";
import { Wheel } from "./Wheel";
import { Turntable } from "./Turntable";
import { CdPlayer } from "./CdPlayer";
import { Cassette } from "./Cassette";
import { VolumeSlider } from "./VolumeSlider";
import { StyleSwitcher, type PlayerStyle } from "./StyleSwitcher";
import { LibraryPanel } from "./LibraryPanel";
import { Lyrics, type LyricsProps } from "./Lyrics";
import { Queue } from "./Queue";
import { Devices } from "./Devices";
import { VuMeters } from "./VuMeters";
import { Taskbar, TitleBar } from "./Compu";
import "./Player.css";

const VOLUME_STEP = 0.1;

// Desde este ancho el aparato se arma como rack: biblioteca, aparato y letras lado a lado.
const WIDE_QUERY = window.matchMedia("(min-width: 1100px)");

function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      WIDE_QUERY.addEventListener("change", onChange);
      return () => WIDE_QUERY.removeEventListener("change", onChange);
    },
    () => WIDE_QUERY.matches,
  );
}

const HINTS: Record<PlayerStyle, string> = {
  wheel: "Gira para cambiar de canción",
  turntable: "Usa los botones para cambiar de canción",
  cd: "Usa los botones para cambiar de pista",
  cassette: "Usa los botones para avanzar",
};

interface PlayerProps {
  style: PlayerStyle;
  onStyleChange: (style: PlayerStyle) => void;
  /** spotify: la cuenta real. demo: aparato de juguete. local: archivos del usuario. */
  mode?: PlayerMode;
}

export type PlayerMode = "spotify" | "demo" | "local";

const CONNECT = {
  spotify: createPlayer,
  demo: createDemoPlayer,
  local: createLocalPlayer,
};

export function Player({ style, onStyleChange, mode = "spotify" }: PlayerProps) {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [playerError, setPlayerError] = useState("");
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  // pendiente: Chrome recuerda la carpeta pero pide un click para volver a leerla.
  const [carpeta, setCarpeta] = useState<{ nombre: string; pendiente?: boolean }>();
  // cargar y loadFiles solo los trae el modo local; el resto es la forma común.
  const controlsRef = useRef<
    | (Awaited<ReturnType<typeof createPlayer>> & {
        cargar?: (entradas: Entrada[]) => LocalTrack[];
        loadFiles?: (files: FileList) => LocalTrack[];
      })
    | null
  >(null);
  const trackRef = useRef<NowPlaying | null>(null);
  const anchorRef = useRef({ position: 0, timestamp: Date.now() });
  const pendingAnimRef = useRef<PlayerStyle | null>(null);
  const selectingRef = useRef(false);
  const wide = useWide();

  useEffect(() => {
    let cancelled = false;
    const connect = CONNECT[mode];
    connect((state) => {
      if (cancelled) return;
      // Fire the selection animation only once the real track data has actually
      // arrived, instead of on the click itself — otherwise on a slow connection
      // the animation finishes before the art updates and looks broken. Bumping
      // the trigger here, in the same callback as setTrack, keeps both updates
      // in one React batch so the new art and the animation land together.
      setTrack(state);
      if (pendingAnimRef.current) {
        if (pendingAnimRef.current === "turntable") setSpinTrigger((s) => s + 1);
        pendingAnimRef.current = null;
      }
    }, (message) => {
      if (!cancelled) setPlayerError(message);
    }).then((recien) => {
      // Un reproductor que nadie usa sigue conectado a Spotify como dispositivo
      // fantasma y puede quedarse con la música: se desconecta.
      if (cancelled) return recien.disconnect();
      const controls = recien as NonNullable<typeof controlsRef.current>;
      controlsRef.current = controls;
      // La carpeta se restaura acá y no en su propio efecto, para no competir
      // con la conexión: cargar() no existe hasta que el reproductor está.
      if (mode !== "local" || !controls.cargar) return;
      recuperarCarpeta().then((guardada) => {
        if (cancelled || !guardada) return;
        setCarpeta({ nombre: guardada.nombre, pendiente: !("entradas" in guardada) });
        if ("entradas" in guardada) setLocalTracks(controls.cargar!(guardada.entradas));
      });
    });
    return () => {
      cancelled = true;
      controlsRef.current?.disconnect();
      controlsRef.current = null;
    };
  }, [mode]);

  // El aviso de error se va solo: si la siguiente canción suena, ya no aplica.
  useEffect(() => {
    if (!playerError) return;
    const timer = setTimeout(() => setPlayerError(""), 10_000);
    return () => clearTimeout(timer);
  }, [playerError]);

  useEffect(() => {
    trackRef.current = track;
    if (track) {
      anchorRef.current = { position: track.position, timestamp: Date.now() };
      setProgressMs(track.position);
    }
  }, [track]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = trackRef.current;
      if (!t) return;
      if (t.isPaused) {
        setProgressMs(anchorRef.current.position);
        return;
      }
      setProgressMs(Math.min(t.duration, anchorRef.current.position + (Date.now() - anchorRef.current.timestamp)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  function nextTrack() {
    controlsRef.current?.nextTrack();
  }

  function previousTrack() {
    controlsRef.current?.previousTrack();
  }

  function togglePlay() {
    controlsRef.current?.togglePlay();
  }

  // On mobile, tapping two covers in quick succession (or a fat-finger hitting the
  // neighboring one) fired two overlapping /play requests — the device bounced between
  // both contexts, flashing through several tracks before settling. One in flight at a time,
  // for track picks as well as album picks.
  async function withSelectionLock(run: () => Promise<void> | undefined) {
    if (selectingRef.current) return;
    selectingRef.current = true;
    try {
      await run();
    } finally {
      selectingRef.current = false;
    }
  }

  function playAlbum(uri: string) {
    return withSelectionLock(async () => {
      await controlsRef.current?.playAlbum(uri);
      if (style === "turntable") pendingAnimRef.current = style;
    });
  }

  // El álbum viene de la búsqueda; sin él, el del disco que está sonando.
  function playTrack(trackUri: string, albumUri?: string) {
    const context = albumUri ?? trackRef.current?.albumUri;
    if (!context) return;
    return withSelectionLock(() => controlsRef.current?.playTrack(context, trackUri));
  }

  function applyVolume(next: number) {
    controlsRef.current?.setVolume(next);
    setSfxVolume(next);
    setVolume(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Escribiendo en el buscador, el espacio es un espacio y las flechas
      // mueven el cursor: los atajos globales no van sobre un campo de texto.
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return;

      if (e.key === "ArrowRight") nextTrack();
      else if (e.key === "ArrowLeft") previousTrack();
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        applyVolume(Math.min(1, volume + VOLUME_STEP));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyVolume(Math.max(0, volume - VOLUME_STEP));
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [volume]);

  const progressPct = track?.duration ? Math.min(100, (progressMs / track.duration) * 100) : 0;
  const isPaused = track?.isPaused ?? true;
  const shuffle = track?.shuffle ?? false;

  const lyricsProps: LyricsProps = {
    trackUri: track?.trackUri ?? "",
    trackName: track?.name ?? "",
    artists: track?.artists ?? "",
    albumArt: track?.albumArt ?? "",
    durationMs: track?.duration ?? 0,
    progressMs,
  };

  // La biblioteca pide cuenta: en el demo no va
  const library = mode === "spotify" && (
    <LibraryPanel
      style={style}
      albumUri={track?.albumUri ?? ""}
      albumName={track?.albumName ?? ""}
      currentTrackUri={track?.trackUri ?? ""}
      onSelectAlbum={playAlbum}
      onSelectTrack={playTrack}
      alwaysOpen={wide}
    />
  );

  const vacio =
    mode === "local"
      ? { titulo: "Elegí tu música", sub: "archivos de tu disco, sin cuenta ni internet" }
      : { titulo: "Conecta Spotify", sub: "y dale play desde cualquier dispositivo" };

  const localAlbums = useMemo(() => albumesDe(localTracks), [localTracks]);

  function aplicar(tracks: LocalTrack[]) {
    setLocalTracks(tracks);
    if (!tracks.length) setPlayerError("No encontré archivos de audio ahí.");
  }

  async function abrirCarpeta(volver: boolean) {
    const elegida = await (volver ? reabrirCarpeta() : elegirCarpeta());
    if (!elegida) return;
    setCarpeta({ nombre: elegida.nombre });
    aplicar(controlsRef.current?.cargar?.(elegida.entradas) ?? []);
  }

  const sueltos = (
    <label className="local-picker__sueltos">
      {hayCarpetas() ? "o elegir archivos sueltos" : localTracks.length ? "Elegir otra música" : "Elegir mi música"}
      <input
        type="file"
        multiple
        accept="audio/*"
        onChange={(e) => {
          const files = e.currentTarget.files;
          if (!files?.length) return;
          setCarpeta(undefined);
          aplicar(controlsRef.current?.loadFiles?.(files) ?? []);
        }}
      />
    </label>
  );

  const picker = mode === "local" && (
    <div className="local-picker">
      {hayCarpetas() ? (
        <button className="local-picker__button" onClick={() => abrirCarpeta(false)}>
          {carpeta && !carpeta.pendiente ? "Elegir otra carpeta" : "Elegir mi carpeta de música"}
        </button>
      ) : (
        <span className="local-picker__button">{sueltos}</span>
      )}

      {carpeta?.pendiente && (
        <button className="local-picker__again" onClick={() => abrirCarpeta(true)}>
          Volver a abrir «{carpeta.nombre}»
        </button>
      )}
      {carpeta && !carpeta.pendiente && (
        <p className="local-picker__carpeta">
          {carpeta.nombre} · {localTracks.length} {localTracks.length === 1 ? "tema" : "temas"}
        </p>
      )}

      {hayCarpetas() && sueltos}

      <p className="local-picker__note">
        {hayCarpetas()
          ? "Suena desde tu disco, sin cuenta ni internet. La carpeta queda recordada para la próxima."
          : "Suena desde tu disco, sin cuenta ni internet. Tu navegador no recuerda carpetas, así que hay que elegirlos cada vez."}
      </p>

      {localAlbums.length > 0 && <LibraryShelf style={style} items={localAlbums} onSelect={playAlbum} />}
    </div>
  );

  const deck = (
    <div className="player">
      <TitleBar title="Radiostatio" />
      <StyleSwitcher style={style} onChange={onStyleChange} />

      {/* Si la música está en otro aparato, que no parezca que suena acá. */}
      {track?.playingOn && (
        <div className="player__elsewhere">
          <span className="player__elsewhere-text">
            Sonando en <strong>{track.playingOn}</strong>
          </span>
          <button className="player__elsewhere-button" onClick={() => controlsRef.current?.playHere()}>
            Escuchar acá
          </button>
        </div>
      )}
      {playerError && (
        <p className="player__error" role="alert">
          {playerError}
        </p>
      )}

      {style === "turntable" && (
        <div className="player__info">
          <p className="player__title">{track?.name ?? vacio.titulo}</p>
          <p className="player__artist">{track?.artists ?? vacio.sub}</p>
        </div>
      )}
      {/* El casete lleva la portada en la etiqueta y el CD en el visor: acá va
          solo el texto, que ninguno de los dos muestra completo. */}
      {style === "cassette" && (
        <div className="player__now-playing">
          <div className="player__info player__info--left">
            <p className="player__title">{track?.name ?? vacio.titulo}</p>
            <p className="player__artist">{track?.artists ?? vacio.sub}</p>
          </div>
        </div>
      )}

      {/* La rueda y la tornamesa ya muestran el tiempo en el aparato */}
      {style !== "wheel" && style !== "turntable" && (
        <div className="player__progress">
          <div className="player__progress-track">
            <div className="player__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="player__progress-labels">
            <span>{formatTime(progressMs)}</span>
            <span>{track ? formatTime(track.duration) : "0:00"}</span>
          </div>
        </div>
      )}

      {style === "wheel" && (
        <Wheel
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          trackName={track?.name ?? ""}
          artist={track?.artists ?? ""}
          progressMs={progressMs}
          durationMs={track?.duration ?? 0}
        />
      )}
      {style === "turntable" && (
        <Turntable
          albumArt={track?.albumArt ?? ""}
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          spinTrigger={spinTrigger}
          remainingMs={(track?.duration ?? 0) - progressMs}
        />
      )}
      {style === "cd" && (
        <CdPlayer
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          albumArt={track?.albumArt ?? ""}
          albumUri={track?.albumUri ?? ""}
          trackName={track?.name ?? ""}
          artist={track?.artists ?? ""}
          trackUri={track?.trackUri ?? ""}
        />
      )}
      {style === "cassette" && (
        <Cassette
          onNext={nextTrack}
          onPrevious={previousTrack}
          isPaused={isPaused}
          onTogglePlay={togglePlay}
          albumName={track?.albumName ?? ""}
          albumArt={track?.albumArt ?? ""}
          albumUri={track?.albumUri ?? ""}
        />
      )}

      <p className="player__hint">{HINTS[style]}</p>

      <button
        className={`player__shuffle ${shuffle ? "player__shuffle--on" : ""}`}
        onClick={() => controlsRef.current?.setShuffle(!shuffle)}
        aria-pressed={shuffle}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
            fill="currentColor"
          />
        </svg>
        Aleatorio
      </button>

      <VolumeSlider value={volume} onChange={applyVolume} />

      {/* En el celular la letra va plegada; solo se pide a LRCLIB cuando se abre. */}
      {!wide && mode === "spotify" && (
        <details className="library-panel lyrics-fold" onToggle={(e) => setLyricsOpen(e.currentTarget.open)}>
          <summary className="library-panel__summary">
            <span className="library-panel__summary-text">Letra</span>
            <span className="library-panel__chevron" aria-hidden="true" />
          </summary>
          {lyricsOpen && <Lyrics {...lyricsProps} />}
        </details>
      )}

      {!wide && (library || picker)}
    </div>
  );

  const taskbar = <Taskbar trackName={track?.name ?? ""} />;

  if (!wide) {
    return (
      <>
        {deck}
        {taskbar}
      </>
    );
  }

  return (
    <div className="rack">
      {taskbar}
      <aside className="rack__side">
        {library || picker || (
          <p className="rack__demo-note">Con tu cuenta de Spotify, acá va tu biblioteca: discos, playlists y Tus me gusta.</p>
        )}
      </aside>

      <div className="rack__center">
        {deck}
        <VuMeters playing={!!track && !isPaused} />
      </div>

      <aside className="rack__side rack__side--right">
        {mode !== "spotify" ? (
          <p className="rack__demo-note">
            {mode === "local"
              ? "La letra y la cola salen de Spotify: con tu cuenta, acá aparecen."
              : "Con tu cuenta, acá van la letra de lo que suena, lo que sigue y a qué parlante mandarlo."}
          </p>
        ) : (
          <>
            <Lyrics {...lyricsProps} />
            <Queue trackUri={track?.trackUri ?? ""} />
            <Devices trackUri={track?.trackUri ?? ""} />
          </>
        )}
      </aside>
    </div>
  );
}
