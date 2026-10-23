import { useState } from "react";
import { getStoredClientId, redirectToLogin, REDIRECT_URI, setClientId } from "../spotify/auth";

// Lo que devuelve Spotify al rebotar el login, en castellano.
const MESSAGES: Record<string, string> = {
  access_denied: "No le diste permiso a Radiostatio. Prueba de nuevo y acepta en la pantalla de Spotify.",
  missing_verifier: "Se perdió el hilo del login, seguro quedó abierto en otra pestaña. Empieza de nuevo desde aquí.",
  token_exchange_failed: "Spotify no terminó de abrir la sesión. Revisa la conexión y prueba otra vez.",
};

interface LoginProps {
  error?: string;
  onDemo: () => void;
  onLocal: () => void;
}

export function Login({ error, onDemo, onLocal }: LoginProps) {
  const [clientId, setValue] = useState(getStoredClientId);

  function connectWithOwnApp(e: React.FormEvent) {
    e.preventDefault();
    setClientId(clientId);
    redirectToLogin();
  }

  return (
    <div className="login-screen">
      <h1>Radiostatio</h1>
      <p>Conecta tu cuenta de Spotify Premium para encender el equipo.</p>

      {error && <p className="login-error">{MESSAGES[error] ?? `Spotify cortó el login: ${error}`}</p>}

      <button className="login-button" onClick={() => redirectToLogin()}>
        Conectar con Spotify
      </button>

      <button className="login-demo" onClick={onLocal}>
        Poner mi propia música
      </button>

      <button className="login-demo" onClick={onDemo}>
        Probarlo sin cuenta
      </button>

      <details className="login-own">
        <summary>No me deja entrar / quiero usar mi propia app</summary>
        <p className="login-note">
          Spotify solo deja entrar a cinco cuentas por app. Si no estás en la lista, crea la tuya en tres pasos y usa
          esta misma página con tu cuenta.
        </p>
        <ol className="login-steps">
          <li>
            Entra a <code>developer.spotify.com/dashboard</code> con tu cuenta Premium y toca <b>Create app</b>.
          </li>
          <li>
            En <b>Redirect URIs</b> pega esta dirección, tal cual:
            <code className="login-uri">{REDIRECT_URI}</code>
          </li>
          <li>
            Marca <b>Web Playback SDK</b>, guarda y copia el <b>Client ID</b>.
          </li>
        </ol>
        <form className="login-form" onSubmit={connectWithOwnApp}>
          <input
            className="login-input"
            value={clientId}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Client ID"
            aria-label="Client ID de tu app de Spotify"
            spellCheck={false}
          />
          <button className="login-button login-button--small">Entrar</button>
        </form>
      </details>
    </div>
  );
}
