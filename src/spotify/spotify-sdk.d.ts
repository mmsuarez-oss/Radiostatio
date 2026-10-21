declare namespace Spotify {
  interface Artist {
    name: string;
  }
  interface Album {
    images: { url: string }[];
  }
  interface Track {
    name: string;
    artists: Artist[];
    album: Album;
  }
  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: { current_track: Track };
  }
  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }
  class Player {
    constructor(init: PlayerInit);
    connect(): Promise<boolean>;
    togglePlay(): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getVolume(): Promise<number>;
    addListener(event: "ready" | "not_ready", cb: (data: { device_id: string }) => void): void;
    addListener(event: "player_state_changed", cb: (state: PlaybackState | null) => void): void;
  }
}
