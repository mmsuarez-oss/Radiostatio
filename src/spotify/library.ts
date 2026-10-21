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
  tracks: { total: number } | null;
  images: { url: string }[] | null;
}

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
    .map((playlist) => ({
      uri: playlist.uri,
      name: playlist.name,
      subtitle: `${playlist.tracks?.total ?? 0} canciones`,
      image: playlist.images?.[0]?.url ?? "",
      kind: "playlist" as const,
    }));
}

export async function getLibraryItems(): Promise<LibraryItem[]> {
  const [albums, playlists] = await Promise.allSettled([getSavedAlbums(), getOwnPlaylists()]);
  const items = [
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
): Promise<{ albums: LibraryItem[]; tracks: SearchTrack[] }> {
  const token = await getValidAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,track&limit=9`,
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

  return { albums, tracks };
}

// Plays one track but keeps the album as context, so the rest of it follows on.
export async function playTrackInAlbum(albumUri: string, trackUri: string, deviceId: string) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ context_uri: albumUri, offset: { uri: trackUri } }),
  });
}

export async function playContext(contextUri: string, deviceId: string) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ context_uri: contextUri }),
  });
}
