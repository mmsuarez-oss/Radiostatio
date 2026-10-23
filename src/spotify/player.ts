import { getValidAccessToken } from "./auth";
import { playContext, playTrackInAlbum } from "./library";

export interface NowPlaying {
  name: string;
  artists: string;
  albumName: string;
  albumArt: string;
  albumUri: string;
  trackUri: string;
  isPaused: boolean;
  shuffle: boolean;
  position: number;
  duration: number;
  /** Nombre del dispositivo donde suena, si no es este navegador. */
  playingOn?: string;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

function loadSdkScript(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    document.body.appendChild(script);
  });
}

/** Sin device_id, Spotify usa el dispositivo que esté sonando. */
function withDevice(params: string, deviceId: string) {
  const query = [params, deviceId && `device_id=${deviceId}`].filter(Boolean).join("&");
  return query ? `?${query}` : "";
}

async function callPlayerApi(method: "POST" | "PUT", path: string, deviceId: string, params = "") {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/${path}${withDevice(params, deviceId)}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

interface SpotifyPlayback {
  device: { id: string | null; name: string } | null;
  is_playing: boolean;
  shuffle_state: boolean;
  progress_ms: number | null;
  item: {
    uri: string;
    name: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { uri: string; name: string; images: { url: string }[] };
  } | null;
}

/** Lo que suena en cualquier dispositivo; `playingOn` queda vacío si es este mismo. */
async function getRemotePlayback(ownDeviceId: string): Promise<NowPlaying | null> {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player", { headers: { Authorization: `Bearer ${token}` } });
  if (res.status !== 200) return null;
  const playback = (await res.json()) as SpotifyPlayback;
  const track = playback.item;
  if (!track) return null;
  return {
    playingOn: playback.device && playback.device.id !== ownDeviceId ? playback.device.name : undefined,
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    albumName: track.album.name,
    albumArt: track.album.images[0]?.url ?? "",
    albumUri: track.album.uri,
    trackUri: track.uri,
    isPaused: !playback.is_playing,
    shuffle: playback.shuffle_state,
    position: playback.progress_ms ?? 0,
    duration: track.duration_ms,
  };
}

export interface QueueTrack {
  uri: string;
  name: string;
  artists: string;
  image: string;
}

interface SpotifyQueueItem {
  uri: string;
  name: string;
  artists?: { name: string }[];
  album?: { images: { url: string }[] };
  // Los episodios de podcast traen su imagen y su programa en vez de álbum y artistas.
  images?: { url: string }[];
  show?: { name: string };
}

/** Avisa a la vista de la cola que tiene que recargarse. */
export const QUEUE_CHANGED = "radiostatio:queue-changed";

export async function getQueue(): Promise<QueueTrack[]> {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/queue", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Queue failed: ${res.status}`);
  const json = (await res.json()) as { queue: (SpotifyQueueItem | null)[] };
  return json.queue
    .filter((item): item is SpotifyQueueItem => !!item)
    .map((item) => ({
      uri: item.uri,
      name: item.name,
      artists: item.artists?.map((a) => a.name).join(", ") ?? item.show?.name ?? "",
      image: (item.album?.images ?? item.images ?? []).at(-1)?.url ?? "",
    }));
}

export async function addToQueue(uri: string) {
  const token = await getValidAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Add to queue failed: ${res.status}`);
  window.dispatchEvent(new Event(QUEUE_CHANGED));
}

export interface Device {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export async function getDevices(): Promise<Device[]> {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Devices failed: ${res.status}`);
  const json = (await res.json()) as { devices: { id: string | null; name: string; type: string; is_active: boolean }[] };
  // Un dispositivo restringido viene sin id y no se le puede mandar nada.
  return json.devices
    .filter((d) => d.id)
    .map((d) => ({ id: d.id!, name: d.name, type: d.type, isActive: d.is_active }));
}

export async function transferPlayback(deviceId: string) {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  });
  if (!res.ok) throw new Error(`Transfer failed: ${res.status}`);
}

// ponytail: sondeo cada 3 s mientras suena en otro dispositivo; Spotify no
// avisa de los cambios remotos, así que más rápido solo gasta rate limit.
const REMOTE_POLL_MS = 3000;

// Con la app abierta en el celular y en la compu, las dos se llamaban igual y
// no había forma de saber en cuál estaba sonando.
const DEVICE_NAME = /Android|iPhone|iPad/i.test(navigator.userAgent) ? "Radiostatio (celular)" : "Radiostatio (compu)";

const ERROR_MESSAGES: Record<string, string> = {
  initialization_error: "Este navegador no puede reproducir Spotify. Prueba con Chrome o activa Widevine.",
  authentication_error: "La sesión de Spotify venció. Sal y vuelve a conectar tu cuenta.",
  account_error: "Spotify pide una cuenta Premium para sonar en el navegador.",
  playback_error: "Spotify no pudo reproducir esta canción.",
  autoplay_failed: "El navegador frenó el sonido. Toca play para que suene.",
};

export async function createPlayer(onStateChange: (state: NowPlaying) => void, onError: (message: string) => void = () => {}) {
  await loadSdkScript();

  const player = new window.Spotify.Player({
    name: DEVICE_NAME,
    getOAuthToken: (cb) => getValidAccessToken().then((t) => cb(t ?? "")),
    volume: 0.6,
  });

  let deviceId = "";
  let connectedOnce = false;
  // Cuando la música está en otro dispositivo (el celular, un parlante, otra
  // pestaña), el SDK manda un estado nulo y se calla: desde ahí el aparato
  // muestra y controla lo que suena allá, preguntándole a Spotify cada tanto,
  // y dice dónde está sonando para que no parezca que suena acá.
  let remote = false;
  let remotePaused = true;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  async function pollRemote() {
    const state = await getRemotePlayback(deviceId).catch(() => null);
    if (!state || !remote) return;
    remotePaused = state.isPaused;
    onStateChange(state);
  }

  function setRemote(next: boolean) {
    remote = next;
    clearInterval(pollTimer);
    if (next) {
      pollRemote();
      pollTimer = setInterval(pollRemote, REMOTE_POLL_MS);
    }
  }

  // El dispositivo de destino: este navegador, o el que esté sonando si es otro.
  const target = () => (remote ? "" : deviceId);
  // Tras un comando remoto, Spotify tarda un poco en reflejarlo.
  const refreshSoon = () => {
    if (remote) setTimeout(pollRemote, 600);
  };

  // Los navegadores no dejan sonar audio que no arrancó con un toque: el primer
  // toque en la página habilita el reproductor (Chrome en Android, Safari).
  const activateOnTouch = () => document.addEventListener("pointerdown", () => player.activateElement(), { once: true });
  activateOnTouch();

  for (const event of ["initialization_error", "authentication_error", "account_error", "playback_error"] as const) {
    player.addListener(event, ({ message }) => {
      console.error(`Spotify ${event}:`, message);
      onError(ERROR_MESSAGES[event]);
    });
  }
  player.addListener("autoplay_failed", () => {
    onError(ERROR_MESSAGES.autoplay_failed);
    activateOnTouch();
  });

  player.addListener("player_state_changed", (state) => {
    if (!state) {
      setRemote(true);
      return;
    }
    if (remote) setRemote(false);
    const track = state.track_window.current_track;
    onStateChange({
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      albumName: track.album.name,
      albumArt: track.album.images[0]?.url ?? "",
      albumUri: track.album.uri,
      trackUri: track.uri,
      isPaused: state.paused,
      shuffle: state.shuffle,
      position: state.position,
      duration: state.duration,
    });
  });

  player.addListener("ready", async ({ device_id }) => {
    deviceId = device_id;
    // El SDK vuelve a avisar "ready" cada vez que se reconecta. Antes eso se
    // llevaba la reproducción a este navegador pausada: la música se cortaba sola.
    if (connectedOnce) return;
    connectedOnce = true;

    // Si ya suena algo en otro lado (el celular, otra pestaña), abrir la app no lo corta:
    // se muestra y se controla desde acá, con la opción de traerlo.
    const current = await getRemotePlayback(device_id).catch(() => null);
    if (current && !current.isPaused) {
      setRemote(true);
      return;
    }

    // Freshly-registered devices sometimes aren't recognized yet (503), so retry briefly.
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = await getValidAccessToken();
      // play stays false: iOS Safari blocks audio that doesn't start from a direct tap,
      // so playback only begins once the user presses play themselves.
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ device_ids: [device_id], play: false }),
      });
      if (res.ok || res.status === 404) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  });

  await player.connect();

  return {
    nextTrack: () => callPlayerApi("POST", "next", target()).then(refreshSoon),
    previousTrack: () => callPlayerApi("POST", "previous", target()).then(refreshSoon),
    togglePlay: () =>
      remote ? callPlayerApi("PUT", remotePaused ? "play" : "pause", "").then(refreshSoon) : player.togglePlay(),
    // Algunos celulares no dejan que les cambien el volumen de afuera (403): se ignora.
    setVolume: (volume: number) =>
      remote ? callPlayerApi("PUT", "volume", "", `volume_percent=${Math.round(volume * 100)}`) : player.setVolume(volume),
    playAlbum: (uri: string) => playContext(uri, target()).then(refreshSoon),
    playTrack: (albumUri: string, trackUri: string) => playTrackInAlbum(albumUri, trackUri, target()).then(refreshSoon),
    setShuffle: (state: boolean) => callPlayerApi("PUT", "shuffle", target(), `state=${state}`).then(refreshSoon),
    /** Trae la música a este navegador. Se llama desde un toque, así el audio puede arrancar. */
    playHere: async () => {
      await player.activateElement();
      if (deviceId) await transferPlayback(deviceId);
    },
    disconnect: () => {
      clearInterval(pollTimer);
      player.disconnect();
    },
  };
}
