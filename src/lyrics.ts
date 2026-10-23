// Spotify no da letras por su API: salen de LRCLIB, que es gratis, no pide
// cuenta y deja pedirle desde el navegador. Algunas canciones no están.

export interface LyricLine {
  time: number; // ms desde el inicio
  text: string;
}

export interface Lyrics {
  /** Con tiempos, para seguir la canción; null si solo hay texto plano. */
  synced: LyricLine[] | null;
  plain: string | null;
  instrumental: boolean;
}

const LRC_LINE = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;

/** "[01:02.50] hola" → { time: 62500, text: "hola" }. Lo que no tiene tiempo se descarta. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const match = LRC_LINE.exec(raw.trim());
    if (match) {
      lines.push({ time: Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000), text: match[3].trim() });
    }
  }
  return lines;
}

interface LrclibResult {
  artistName: string;
  duration: number; // segundos
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

// Más de 5 s de diferencia suele ser otra versión (en vivo, remix) y la letra no calza.
const DURATION_TOLERANCE_S = 5;

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** "Canción - Remastered 2011" o "Canción (feat. X)" → "Canción": así suele estar en LRCLIB. */
export function cleanTitle(name: string) {
  return name
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*[([](feat|ft|with|con)\.?\s[^)\]]*[)\]]/gi, "")
    .trim();
}

async function search(params: Record<string, string>, signal?: AbortSignal) {
  const res = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, { signal });
  // ponytail: LRCLIB contesta 503 cuando no encuentra nada, así que un error cuenta como
  // "sin resultados"; si se cae del todo se ve "no trae hoja de letras" en vez de un error.
  if (!res.ok) return [];
  return (await res.json()) as LrclibResult[];
}

export async function fetchLyrics(
  track: { name: string; artists: string; durationMs: number },
  signal?: AbortSignal,
): Promise<Lyrics | null> {
  // Solo el primer artista: los invitados casi nunca están en LRCLIB.
  const artist = track.artists.split(", ")[0];
  const title = cleanTitle(track.name);
  const searches: Record<string, string>[] = [
    { track_name: track.name, artist_name: artist },
    ...(title !== track.name ? [{ track_name: title, artist_name: artist }] : []),
    // Texto libre: encuentra la canción aunque LRCLIB tenga el nombre escrito distinto.
    { q: `${title} ${artist}` },
  ];
  let otherVersion: LrclibResult | undefined;
  for (const params of searches) {
    const results = await search(params, signal);
    const close = results.filter((r) => Math.abs(r.duration - track.durationMs / 1000) <= DURATION_TOLERANCE_S);
    const best = close.find((r) => r.syncedLyrics) ?? close.find((r) => r.plainLyrics || r.instrumental);
    if (best) {
      return {
        synced: best.syncedLyrics ? parseLrc(best.syncedLyrics) : null,
        plain: best.plainLyrics,
        instrumental: best.instrumental,
      };
    }
    // Del mismo artista, para no traer la letra de otra canción que se llama igual.
    otherVersion ??= results.find((r) => r.plainLyrics && fold(r.artistName).includes(fold(artist)));
  }
  // Otra versión (en vivo, remix, edición de radio): el texto sirve, los tiempos no.
  return otherVersion ? { synced: null, plain: otherVersion.plainLyrics, instrumental: false } : null;
}
