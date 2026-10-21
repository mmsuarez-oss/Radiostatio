const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = window.location.origin + "/";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-library-read",
  "playlist-read-private",
].join(" ");

const VERIFIER_KEY = "radiostatio_verifier";
const TOKEN_KEY = "radiostatio_token";

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

function base64url(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return base64url(bytes);
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

export function getStoredToken(): TokenData | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

function storeToken(data: TokenData) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function redirectToLogin() {
  const verifier = randomVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await challengeFor(verifier);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  window.location.assign(url.toString());
}

async function requestToken(body: Record<string, string>): Promise<TokenData> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? getStoredToken()?.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
}

export async function handleRedirectCallback(): Promise<boolean> {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return false;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;

  const token = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
  storeToken(token);
  window.history.replaceState({}, "", window.location.pathname);
  return true;
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;
  if (Date.now() < token.expires_at - 10_000) return token.access_token;

  const refreshed = await requestToken({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: CLIENT_ID,
  });
  storeToken(refreshed);
  return refreshed.access_token;
}
