import { cover } from "./spotify/demoPlayer";
import type { Entrada } from "./localFolder";
import type { LibraryItem } from "./spotify/library";
import type { NowPlaying } from "./spotify/player";

// Tercera implementación de la misma forma que createPlayer y createDemoPlayer,
// pero el audio sale de archivos del usuario: sin cuenta, sin Premium y sin red.
// Lo descargado de Spotify no se puede leer: va cifrado con Widevine.

export interface LocalTrack {
  name: string;
  artists: string;
  albumName: string;
  albumUri: string;
  trackUri: string;
  url: string;
}

const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i;

function hue(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

// "04 - Charly García - Promesas.mp3" → artista y título. Sin carpeta ni guion
// el nombre entero queda como título: es mejor que inventar un artista.
// El álbum ordena las carcasas (el casete se cambia cuando cambia), así que a
// falta de carpeta se agrupa por artista y no todo en una sola pila.
function parse({ file, path }: Entrada) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/^\d+\s*[-._)]\s*/, "");
  const folders = path.split("/").slice(0, -1);
  const parts = base.split(" - ");
  const artists = parts.length >= 2 ? parts[0].trim() : (folders.at(-2) ?? "Desconocido");
  const name = parts.length >= 2 ? parts.slice(1).join(" - ").trim() : base;
  return { artists, name, albumName: folders.at(-1) ?? (parts.length >= 2 ? artists : "Mi música") };
}

export function toTracks(entradas: Entrada[]): LocalTrack[] {
  return entradas
    .filter((e) => e.file.type.startsWith("audio/") || AUDIO.test(e.file.name))
    .map((entrada) => {
      const { artists, name, albumName } = parse(entrada);
      return {
        name,
        artists,
        albumName,
        albumUri: `local:album:${albumName}`,
        url: URL.createObjectURL(entrada.file),
        path: entrada.path,
      };
    })
    // Primero el álbum, para que un disco no quede entreverado con otro, y
    // dentro por ruta: ahí vive el número de pista, que ordenar por título
    // perdía. Con numeric, además, la 10 va después de la 2.
    .sort((a, b) => a.albumUri.localeCompare(b.albumUri) || a.path.localeCompare(b.path, undefined, { numeric: true }))
    .map((t, i) => ({
      name: t.name,
      artists: t.artists,
      albumName: t.albumName,
      albumUri: t.albumUri,
      url: t.url,
      trackUri: `local:track:${i}`,
    }));
}

/** Los álbumes con la forma que ya sabe dibujar LibraryShelf. */
export function albumesDe(tracks: LocalTrack[]): LibraryItem[] {
  const porUri = new Map<string, LibraryItem>();
  for (const t of tracks) {
    if (porUri.has(t.albumUri)) continue;
    porUri.set(t.albumUri, {
      uri: t.albumUri,
      name: t.albumName,
      subtitle: t.artists,
      image: cover(hue(t.albumName)),
      kind: "album",
    });
  }
  return [...porUri.values()];
}

/** Un <input type=file> no da rutas salvo que se haya elegido una carpeta. */
export const entradasDe = (files: FileList): Entrada[] =>
  [...files].map((file) => ({ file, path: file.webkitRelativePath || file.name }));

export async function createLocalPlayer(
  onStateChange: (state: NowPlaying) => void,
  _onError?: (message: string) => void,
) {
  const audio = new Audio();
  audio.preload = "metadata";
  let tracks: LocalTrack[] = [];
  // queue son índices de tracks: con aleatorio cambia el orden, no la lista.
  let queue: number[] = [];
  let at = 0;
  let shuffle = false;

  const current = () => tracks[queue[at]];

  function emit() {
    const t = current();
    if (!t) return;
    onStateChange({
      name: t.name,
      artists: t.artists,
      albumName: t.albumName,
      albumArt: cover(hue(t.albumName)),
      albumUri: t.albumUri,
      trackUri: t.trackUri,
      isPaused: audio.paused,
      shuffle,
      position: audio.currentTime * 1000,
      duration: Number.isFinite(audio.duration) ? audio.duration * 1000 : 0,
    });
  }

  function load(position: number, play: boolean) {
    at = position;
    const t = current();
    if (!t) return;
    audio.src = t.url;
    if (play) audio.play().catch(() => {});
    emit();
  }

  function go(step: number, play = !audio.paused) {
    if (!queue.length) return;
    load((at + step + queue.length) % queue.length, play);
  }

  function rebuild() {
    const cur = queue[at];
    if (!shuffle) {
      queue = tracks.map((_, i) => i);
      at = cur ?? 0;
      return;
    }
    const rest = tracks.map((_, i) => i).filter((i) => i !== cur);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    queue = cur === undefined ? rest : [cur, ...rest];
    at = 0;
  }

  audio.addEventListener("loadedmetadata", emit);
  audio.addEventListener("play", emit);
  audio.addEventListener("pause", emit);
  audio.addEventListener("ended", () => go(1, true));

  function cargar(entradas: Entrada[]) {
    tracks.forEach((t) => URL.revokeObjectURL(t.url));
    tracks = toTracks(entradas);
    rebuild();
    if (tracks.length) load(0, false);
    return tracks;
  }

  function jumpTo(index: number) {
    if (index >= 0) load(queue.indexOf(index), true);
  }

  return {
    nextTrack: async () => go(1),
    previousTrack: async () => {
      // Como cualquier aparato: si el tema ya avanzó, lo reinicia; recién al
      // principio salta al anterior.
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        emit();
      } else go(-1);
    },
    togglePlay: async () => {
      if (audio.paused) await audio.play().catch(() => {});
      else audio.pause();
    },
    setVolume: async (volume: number) => {
      audio.volume = volume;
    },
    playAlbum: async (uri: string) => jumpTo(tracks.findIndex((t) => t.albumUri === uri)),
    playTrack: async (_albumUri: string, trackUri: string) =>
      jumpTo(tracks.findIndex((t) => t.trackUri === trackUri)),
    setShuffle: async (state: boolean) => {
      shuffle = state;
      rebuild();
      emit();
    },
    playHere: async () => {},
    disconnect: () => {
      audio.pause();
      audio.removeAttribute("src");
      tracks.forEach((t) => URL.revokeObjectURL(t.url));
      tracks = [];
    },

    // Fuera de la forma común: solo el modo local recibe archivos. Las rutas
    // vienen aparte porque un handle de carpeta no las trae en el File.
    cargar,
    loadFiles: (files: FileList) => cargar(entradasDe(files)),
  };
}
