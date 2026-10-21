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

export async function getSavedAlbums(): Promise<LibraryItem[]> {
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/albums?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load saved albums: ${res.status}`);
  const json = await res.json();
  return (json.items as SpotifyAlbumItem[])
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
  const token = await getValidAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load playlists: ${res.status}`);
  const json = await res.json();
  return (json.items as (SpotifyPlaylistItem | null)[])
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
