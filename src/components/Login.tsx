import { redirectToLogin } from "../spotify/auth";

export function Login() {
  return (
    <div className="login-screen">
      <h1>Radiostatio</h1>
      <p>Conecta tu cuenta de Spotify Premium para encender el equipo.</p>
      <button className="login-button" onClick={() => redirectToLogin()}>
        Conectar con Spotify
      </button>
    </div>
  );
}
