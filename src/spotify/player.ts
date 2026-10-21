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

async function callPlayerApi(path: string, deviceId: string) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/${path}?device_id=${deviceId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function setShuffle(state: boolean, deviceId: string) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}&device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPlayer(onStateChange: (state: NowPlaying) => void) {
  await loadSdkScript();

  const player = new window.Spotify.Player({
    name: "Radiostatio",
    getOAuthToken: (cb) => getValidAccessToken().then((t) => cb(t ?? "")),
    volume: 0.6,
  });

  let deviceId = "";

  player.addListener("player_state_changed", (state) => {
    if (!state) return;
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
    nextTrack: () => callPlayerApi("next", deviceId),
    previousTrack: () => callPlayerApi("previous", deviceId),
    togglePlay: () => player.togglePlay(),
    setVolume: (volume: number) => player.setVolume(volume),
    playAlbum: (uri: string) => playContext(uri, deviceId),
    playTrack: (albumUri: string, trackUri: string) => playTrackInAlbum(albumUri, trackUri, deviceId),
    setShuffle: (state: boolean) => setShuffle(state, deviceId),
  };
}
