# Radiostatio

Reproductor de Spotify con forma de aparato viejo. Elegís la carcasa y la manejás
como al original: la rueda del iPod se gira para pasar de canción, la tornamesa y
el reproductor de CD tienen sus botones, y el casete se cambia solo cuando cambiás
de álbum — se abre la tapa, sale la cinta vieja y entra la nueva, con su ruido de
plástico. También podés buscar discos y canciones desde la app.

## Por qué tenés que armar tu propia copia

Spotify no deja que una app de desarrollo la use cualquiera: solo entran las
cuentas que el dueño agrega a mano, y desde marzo de 2026 el tope es de **5
cuentas por app**. Abrirla a todo el mundo pide *extended quota*, que exige
empresa registrada y 250.000 usuarios activos por mes, así que para un proyecto
personal no existe.

La vuelta es simple: cada quien usa su propio Client ID. Hay dos caminos y el
primero no necesita instalar nada.

### El camino corto: tu Client ID en la página de otro

En la pantalla de login, abrí **"No me deja entrar / quiero usar mi propia
app"**. Ahí están los tres pasos y el Redirect URI listo para copiar: creás tu
app en el dashboard de Spotify, pegás el Client ID y entrás con tu cuenta. Queda
guardado en tu navegador y corrés con tu propia cuota, sin clonar nada.

También hay un **"Probarlo sin cuenta"**, que enciende el aparato con un disco de
mentira: sirve para ver cómo funciona, no para escuchar música.

### El camino largo: tu propia copia

Es gratis, tarda diez minutos y no depende de la página de nadie.

## 1. Crear tu app de Spotify

1. Entrá a <https://developer.spotify.com/dashboard> con tu cuenta y tocá
   **Create app**. La cuenta tiene que tener **Premium**: el modo desarrollo lo
   exige, y el reproductor en el navegador tampoco funciona con cuentas gratis.
2. Nombre y descripción, lo que quieras.
3. En **Redirect URIs** agregá una por cada lugar donde vayas a abrirla:
   - `http://127.0.0.1:5173/` para desarrollo. Tiene que ser la IP literal:
     Spotify ya no acepta `localhost`.
   - `https://tu-app.vercel.app/` si la vas a publicar. Tiene que terminar en
     barra y ser la URL exacta, y fuera de `127.0.0.1` solo acepta `https`.
4. Marcá **Web Playback SDK** entre las APIs que vas a usar.
5. Guardá y copiá el **Client ID** (está en *Settings*).

## 2. Correrla en tu máquina

```bash
npm install
cp .env.example .env     # y pegá tu Client ID adentro
npm run dev
```

El `.env` queda así:

```
VITE_SPOTIFY_CLIENT_ID=tu_client_id
```

Abrí <http://127.0.0.1:5173>, conectá tu cuenta y dale play. "Radiostatio" aparece
como dispositivo disponible en cualquier app de Spotify, así que también podés
mandarle la música desde el celular.

## 3. Publicarla (opcional)

Con [Vercel](https://vercel.com) alcanza con importar el repo: detecta Vite solo.
Dos cosas que hay que hacer a mano:

- Cargar `VITE_SPOTIFY_CLIENT_ID` en las variables de entorno del proyecto.
- Volver al dashboard de Spotify y agregar la URL de producción a los Redirect
  URIs, con la barra final.

## Dejar entrar a alguien más

Mientras la app esté en modo desarrollo, solo entran las cuentas de la lista
(hasta 5, vos incluido). En el dashboard: tu app → **Settings** → **User
Management** → nombre y **el correo con el que esa persona está registrada en
Spotify**, no cualquier otro que use. Tarda hasta 15 minutos en tener efecto.

Quien no esté en la lista no va a poder conectarse, por más que su cuenta exista.
Los invitados no necesitan Premium para entrar, pero sí para que les suene.
