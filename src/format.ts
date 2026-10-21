/** m:ss, sin horas: ninguna canción llega. */
export function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

/** Lo que falta, con el menos adelante: -1:23 */
export function formatRemaining(ms: number) {
  return `-${formatTime(ms)}`;
}
