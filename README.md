# Radiostatio

Reproductor de Spotify con forma de radio antigua: gira la perilla para pasar a la
siguiente canción (o la anterior, girando al otro lado).

## Configurar Spotify

1. Entra a https://developer.spotify.com/dashboard y crea una app ("Create app").
2. En **Redirect URIs** agrega exactamente: `http://127.0.0.1:5173/`
   (Spotify ya no acepta `localhost`, solo la IP literal `127.0.0.1`)
3. Marca la API "Web Playback SDK" como usada.
4. Copia el **Client ID** y pégalo en `.env`:
   ```
   VITE_SPOTIFY_CLIENT_ID=tu_client_id
   ```
5. Necesitas Spotify **Premium** — el SDK de reproducción en navegador no funciona con cuentas gratis.

## Correr la app

```bash
npm install
npm run dev
```

Abre http://localhost:5173, conecta tu cuenta y dale play desde la app de Spotify
(celular o escritorio) o desde el botón de la radio — "Radiostatio" aparecerá como
dispositivo disponible.
