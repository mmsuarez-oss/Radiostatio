import { getValidAccessToken } from "./auth";

export interface LibraryItem {
  uri: string;
  name: string;
  subtitle: string;
  image: string;
  kind: "album" | "playlist";
}

interface SpotifyAlbumItem {
  album: { uri: string; name: string; artists: { name: string }[]; images: { url: string }[] } | null;
}

interface SpotifyPlaylistItem {
  uri: string;
  name: string;
  // En 2026 Spotify renombró `tracks` a `items`; según la app llega uno u otro.
  items?: { total: number } | null;
  tracks?: { total: number } | null;
  images: { url: string }[] | null;
  owner?: { display_name: string | null } | null;
}

function toPlaylistItem(playlist: SpotifyPlaylistItem, subtitle?: string): LibraryItem {
  return {
    uri: playlist.uri,
    name: playlist.name,
    subtitle: subtitle ?? `${(playlist.items ?? playlist.tracks)?.total ?? 0} canciones`,
    image: playlist.images?.[0]?.url ?? "",
    kind: "playlist",
  };
}

// Portada propia para "Tus me gusta": Spotify no da imagen para esa lista.
const LIKED_COVER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#4b2bd6"/><stop offset="1" stop-color="#9fd3c7"/></linearGradient></defs>` +
    `<rect width="300" height="300" fill="url(#g)"/>` +
    `<path d="M150 214 86 152a38 38 0 0 1 64-46 38 38 0 0 1 64 46z" fill="#fff"/></svg>`,
)}`;

// ponytail: tope de 300 items por lista; si alguien tiene una biblioteca más
// grande que eso, la estantería va a pedir virtualizar antes que más páginas.
const MAX_ITEMS = 300;

/** Sigue el `next` de Spotify: una sola página se quedaba en 20 discos. */
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = url;
  while (next && items.length < MAX_ITEMS) {
    // Dentro del loop: una biblioteca grande puede cruzar el vencimiento del token.
    const token = await getValidAccessToken();
    const res: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify request failed: ${res.status} (${next})`);
    const json = await res.json();
    items.push(...(json.items as T[]));
    next = json.next;
  }
  return items;
}

export async function getSavedAlbums(): Promise<LibraryItem[]> {
  const items = await fetchAllPages<SpotifyAlbumItem>("https://api.spotify.com/v1/me/albums?limit=50");
  return items
    .filter((item) => item.album)
    .map((item) => ({
      uri: item.album!.uri,
      name: item.album!.name,
      subtitle: item.album!.artists.map((a) => a.name).join(", "),
      image: item.album!.images[0]?.url ?? "",
      kind: "album" as const,
    }));
}

export async function getOwnPlaylists(): Promise<LibraryItem[]> {
  const items = await fetchAllPages<SpotifyPlaylistItem | null>("https://api.spotify.com/v1/me/playlists?limit=50");
  return items
    .filter((playlist): playlist is SpotifyPlaylistItem => !!playlist)
    .map((playlist) => toPlaylistItem(playlist));
}

/** "Tus me gusta" no viene en /me/playlists: se arma a mano con la colección del usuario. */
export async function getLikedSongs(): Promise<LibraryItem> {
  const token = await getValidAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [me, liked] = await Promise.all([
    fetch("https://api.spotify.com/v1/me", { headers }),
    fetch("https://api.spotify.com/v1/me/tracks?limit=1", { headers }),
  ]);
  if (!me.ok || !liked.ok) throw new Error(`Liked songs failed: ${me.status}/${liked.status}`);
  const { id } = await me.json();
  const { total } = await liked.json();
  return {
    uri: `spotify:user:${id}:collection`,
    name: "Tus me gusta",
    subtitle: `${total} canciones`,
    image: LIKED_COVER,
    kind: "playlist",
  };
}

export async function getLibraryItems(): Promise<LibraryItem[]> {
  const [liked, albums, playlists] = await Promise.allSettled([getLikedSongs(), getSavedAlbums(), getOwnPlaylists()]);
  // "Tus me gusta" primero, como en Spotify.
  const items = [
    ...(liked.status === "fulfilled" ? [liked.value] : []),
    ...(albums.status === "fulfilled" ? albums.value : []),
    ...(playlists.status === "fulfilled" ? playlists.value : []),
  ];
  if (items.length === 0 && albums.status === "rejected" && playlists.status === "rejected") {
    throw albums.reason;
  }
  return items;
}

export interface AlbumTrack {
  uri: string;
  name: string;
  artists: string;
  durationMs: number;
}

interface SpotifyTrackItem {
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
}

export async function getAlbumTracks(albumUri: string): Promise<AlbumTrack[]> {
  const id = albumUri.split(":").pop();
  const token = await getValidAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load album tracks: ${res.status}`);
  const json = await res.json();
  return (json.items as SpotifyTrackItem[]).map((t) => ({
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(", "),
    durationMs: t.duration_ms,
  }));
}

export interface SearchTrack extends AlbumTrack {
  /** Contexto con el que se reproduce: así sigue el resto del disco. */
  albumUri: string;
  image: string;
}

interface SpotifySearchAlbum {
  uri: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
}

interface SpotifySearchTrack extends SpotifyTrackItem {
  album: { uri: string; images: { url: string }[] };
}

/** Busca en todo el catálogo de Spotify, no solo en lo guardado. */
export async function searchCatalog(
  query: string,
  signal?: AbortSignal,
): Promise<{ albums: LibraryItem[]; playlists: LibraryItem[]; tracks: SearchTrack[] }> {
  const token = await getValidAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,playlist,track&limit=9`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const json = await res.json();

  // Spotify devuelve huecos nulos en los resultados cada tanto.
  const albums = ((json.albums?.items ?? []) as (SpotifySearchAlbum | null)[])
    .filter((album): album is SpotifySearchAlbum => !!album)
    .map((album) => ({
      uri: album.uri,
      name: album.name,
      subtitle: album.artists.map((a) => a.name).join(", "),
      image: album.images[0]?.url ?? "",
      kind: "album" as const,
    }));

  const tracks = ((json.tracks?.items ?? []) as (SpotifySearchTrack | null)[])
    .filter((track): track is SpotifySearchTrack => !!track)
    .map((track) => ({
      uri: track.uri,
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      durationMs: track.duration_ms,
      albumUri: track.album.uri,
      image: track.album.images.at(-1)?.url ?? "",
    }));

  const playlists = ((json.playlists?.items ?? []) as (SpotifyPlaylistItem | null)[])
    .filter((playlist): playlist is SpotifyPlaylistItem => !!playlist)
    .map((playlist) => toPlaylistItem(playlist, playlist.owner?.display_name ?? "Playlist"));

  return { albums, playlists, tracks };
}

// Sin deviceId suena en el dispositivo activo (el celular, si la música está allá).
async function play(deviceId: string, body: object) {
  const token = await getValidAccessToken();
  return fetch(`https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ""}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Plays one track but keeps the album as context, so the rest of it follows on.
export async function playTrackInAlbum(albumUri: string, trackUri: string, deviceId: string) {
  await play(deviceId, { context_uri: albumUri, offset: { uri: trackUri } });
}

export async function playContext(contextUri: string, deviceId: string) {
  const res = await play(deviceId, { context_uri: contextUri });
  // ponytail: si Spotify no acepta "Tus me gusta" como contexto, suenan las 50
  // últimas que guardaste; paginar /me/tracks si alguien pide la lista entera.
  if (!res.ok && contextUri.endsWith(":collection")) {
    const token = await getValidAccessToken();
    const liked = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!liked.ok) return;
    const { items } = (await liked.json()) as { items: { track: { uri: string } }[] };
    await play(deviceId, { uris: items.map((item) => item.track.uri) });
  }
}
