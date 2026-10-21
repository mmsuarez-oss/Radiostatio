// Efectos mecánicos de las carcasas. Un solo <audio> por archivo, reusado:
// crear uno nuevo en cada disparo deja nodos colgando y en móvil se corta.
const elements = new Map<string, HTMLAudioElement>();
const stopTimers = new Map<string, number>();

// Los efectos siguen el volumen del reproductor: bajar la música y que el
// casete siga sonando igual de fuerte es lo que más molesta.
let master = 0.6;

export function setSfxVolume(value: number) {
  master = value;
}

export type SfxName = "cassette-eject" | "cassette-insert" | "cassette-close" | "vinyl-stop" | "radio-static";

interface SfxOptions {
  volume?: number;
  /** Segundo del archivo donde arrancar. */
  from?: number;
  /** Corta el audio a los N ms, para usar solo un trozo de un clip largo. */
  durationMs?: number;
}

export function playSfx(name: SfxName, { volume = 0.55, from = 0, durationMs }: SfxOptions = {}) {
  let el = elements.get(name);
  if (!el) {
    el = new Audio(`${import.meta.env.BASE_URL}sfx/${name}.mp3`);
    el.preload = "auto";
    elements.set(name, el);
  }

  const timer = stopTimers.get(name);
  if (timer) clearTimeout(timer);

  el.volume = Math.min(1, Math.max(0, volume * master));
  // Un disparo nuevo pisa al anterior; sin el pause() el seek sobre un audio
  // que ya está sonando no siempre reinicia en Safari.
  el.pause();
  try {
    el.currentTime = from;
  } catch {
    // El clip aún no tiene metadata: suena desde el principio y ya.
  }
  // Los navegadores rechazan audio sin gesto del usuario; estos efectos salen
  // de un click o un drag, pero si igual falla no hay nada que hacer.
  void el.play().catch(() => {});

  if (durationMs !== undefined) {
    const el2 = el;
    stopTimers.set(
      name,
      window.setTimeout(() => {
        el2.pause();
        stopTimers.delete(name);
      }, durationMs),
    );
  }
}

/** Click seco de la rueda. Sintetizado: un mp3 de 30 ms no vale la descarga. */
let audioCtx: AudioContext | null = null;

export function playTick() {
  if (master === 0) return;
  audioCtx ??= new AudioContext();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = 1900;
  gain.gain.setValueAtTime(0.09 * master, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

/** Trozo al azar del clip largo de sintonía, para que no suene siempre igual. */
export function playRadioStatic() {
  playSfx("radio-static", { volume: 0.4, from: Math.random() * 4.5, durationMs: 1100 });
}
