import { redirectToLogin } from "../spotify/auth";

// Lo que devuelve Spotify al rebotar el login, en castellano.
const MESSAGES: Record<string, string> = {
  access_denied: "No le diste permiso a Radiostatio. Prueba de nuevo y acepta en la pantalla de Spotify.",
  missing_verifier: "Se perdió el hilo del login, seguro quedó abierto en otra pestaña. Empieza de nuevo desde aquí.",
  token_exchange_failed: "Spotify no terminó de abrir la sesión. Revisa la conexión y prueba otra vez.",
};

interface LoginProps {
  error?: string;
}

export function Login({ error }: LoginProps) {
  return (
    <div className="login-screen">
      <h1>Radiostatio</h1>
      <p>Conecta tu cuenta de Spotify Premium para encender el equipo.</p>

      {error && <p className="login-error">{MESSAGES[error] ?? `Spotify cortó el login: ${error}`}</p>}

      <button className="login-button" onClick={() => redirectToLogin()}>
        Conectar con Spotify
      </button>

      <p className="login-note">
        Spotify solo deja entrar a las cuentas habilitadas en la app. Si nunca pudiste conectarte, pídele a quien la
        administra que agregue el correo de tu cuenta.
      </p>
    </div>
  );
}
