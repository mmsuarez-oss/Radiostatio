import type { NowPlaying } from "./player";

// Un reproductor de mentira con la misma forma que el de Spotify, para que se
// pueda probar el aparato sin cuenta. No suena música: solo los ruidos
// mecánicos de las carcasas, que son nuestros.

export const cover = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue} 68% 58%)"/>` +
      `<stop offset="1" stop-color="hsl(${hue + 35} 62% 24%)"/></linearGradient></defs>` +
      `<rect width="300" height="300" fill="url(#g)"/>` +
      `<circle cx="150" cy="150" r="80" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="9"/>` +
      `<circle cx="150" cy="150" r="21" fill="rgba(255,255,255,.72)"/></svg>`,
  )}`;

const TRACKS = [
  { name: "Prueba de sonido", album: "Grace", hue: 28, duration: 183_000 },
  { name: "Lado B", album: "Grace", hue: 200, duration: 214_000 },
  { name: "Toma 3", album: "Grace vol. 2", hue: 320, duration: 167_000 },
];

export async function createDemoPlayer(onStateChange: (state: NowPlaying) => void, _onError?: (message: string) => void) {
  let index = 0;
  let paused = false;
  let shuffle = false;
  // Posición acumulada hasta la última pausa, más desde cuándo corre el reloj.
  let played = 0;
  let since = Date.now();

  function position() {
    return Math.min(TRACKS[index].duration, paused ? played : played + (Date.now() - since));
  }

  function emit() {
    const track = TRACKS[index];
    onStateChange({
      name: track.name,
      artists: "Radiostatio",
      albumName: track.album,
      albumArt: cover(track.hue),
      // El álbum cambia cada dos temas, así se ve el cambio de casete y de CD.
      albumUri: `demo:album:${track.album}`,
      trackUri: `demo:track:${index}`,
      isPaused: paused,
      shuffle,
      position: position(),
      duration: track.duration,
    });
  }

  function go(step: number) {
    index = (index + step + TRACKS.length) % TRACKS.length;
    played = 0;
    since = Date.now();
    emit();
  }

  emit();

  // Las firmas son async para calzar con las del reproductor de verdad.
  return {
    nextTrack: async () => go(1),
    previousTrack: async () => go(-1),
    togglePlay: async () => {
      played = position();
      paused = !paused;
      since = Date.now();
      emit();
    },
    setVolume: async (_volume: number) => {},
    playAlbum: async (_uri: string) => {},
    playTrack: async (_albumUri: string, _trackUri: string) => {},
    setShuffle: async (state: boolean) => {
      shuffle = state;
      emit();
    },
    playHere: async () => {},
    disconnect: () => {},
  };
}
