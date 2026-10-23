import { useEffect, useState } from "react";

// Piezas del estilo Compu 2000. Están siempre en la página pero solo se ven con
// ese estilo elegido (compu.css): así no hay que pasar el estilo por todos lados.

/** La barra azul de arriba de cada ventana, con sus tres botoncitos. */
export function TitleBar({ title }: { title: string }) {
  return (
    <div className="win-titlebar" aria-hidden="true">
      <span className="win-titlebar__title">{title}</span>
      <span className="win-titlebar__buttons">
        <span>_</span>
        <span>□</span>
        <span>×</span>
      </span>
    </div>
  );
}

/** La barra de tareas: Inicio, la ventana abierta con lo que suena, y el reloj. */
export function Taskbar({ trackName }: { trackName: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="taskbar" aria-hidden="true">
      <span className="taskbar__start">Inicio</span>
      <span className="taskbar__task">{trackName ? `Radiostatio - ${trackName}` : "Radiostatio"}</span>
      <span className="taskbar__tray">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
    </div>
  );
}
