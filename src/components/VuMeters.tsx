import "./VuMeters.css";

// Decorativos: Spotify reproduce con DRM y no deja leer el audio, así que las
// agujas bailan con una animación propia mientras suena y caen en pausa.

const PIVOT = { x: 60, y: 74 };
const RADIUS = 56;
const SPAN_DEG = 46; // de cada lado de la vertical

// Escala clásica de VU: -20 a +3, con el rojo desde 0.
const MARKS = [
  { db: -20, label: "20" },
  { db: -10, label: "10" },
  { db: -7, label: "7" },
  { db: -5, label: "5" },
  { db: -3, label: "3" },
  { db: -1 },
  { db: 0, label: "0" },
  { db: 1 },
  { db: 2 },
  { db: 3, label: "+3" },
];

// La escala de un VU no es lineal: los últimos dB ocupan casi la mitad del arco.
const angleFor = (db: number) => -SPAN_DEG + (2 * SPAN_DEG * Math.pow(10, db / 20)) / Math.pow(10, 3 / 20);

function point(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: PIVOT.x + r * Math.sin(rad), y: PIVOT.y - r * Math.cos(rad) };
}

function arc(fromDeg: number, toDeg: number, r: number) {
  const a = point(fromDeg, r);
  const b = point(toDeg, r);
  return `M${a.x} ${a.y} A${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

const ZERO = angleFor(0);

function Face() {
  return (
    <svg viewBox="0 0 120 74" className="vu__face">
      <path d={arc(-SPAN_DEG, ZERO, RADIUS)} className="vu__scale" />
      <path d={arc(ZERO, SPAN_DEG, RADIUS)} className="vu__scale vu__scale--red" />
      {MARKS.map(({ db, label }) => {
        const deg = angleFor(db);
        const outer = point(deg, RADIUS + (label ? 6 : 4));
        const inner = point(deg, RADIUS);
        const text = point(deg, RADIUS + 12);
        return (
          <g key={db} className={db >= 0 ? "vu__mark vu__mark--red" : "vu__mark"}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
            {label && (
              <text x={text.x} y={text.y} textAnchor="middle">
                {label}
              </text>
            )}
          </g>
        );
      })}
      <text x={PIVOT.x} y={52} textAnchor="middle" className="vu__brand">
        VU
      </text>
    </svg>
  );
}

export function VuMeters({ playing }: { playing: boolean }) {
  return (
    <div className={`vu ${playing ? "vu--playing" : ""}`} aria-hidden="true">
      {["L", "R"].map((side) => (
        <div key={side} className={`vu__meter vu__meter--${side}`}>
          <Face />
          <div className="vu__needle">
            <div className="vu__needle-jitter" />
          </div>
          <span className="vu__pivot" />
          <span className="vu__side">{side}</span>
        </div>
      ))}
    </div>
  );
}
