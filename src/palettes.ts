/** Colores a elegir. El primero de cada lista es el de fábrica. */
export interface Swatch {
  value: string;
  label: string;
}

/** Detalles: botones, etiquetas, displays. */
export const ACCENTS: Swatch[] = [
  { value: "#e3b765", label: "Ámbar" },
  { value: "#e0614f", label: "Rojo" },
  { value: "#5ec98b", label: "Verde" },
  { value: "#6ab6f0", label: "Celeste" },
  { value: "#f08bc0", label: "Rosa" },
  { value: "#dcd8cf", label: "Hueso" },
];

/** El plástico del casete y del discman. */
export const BODIES: Swatch[] = [
  { value: "#1f5aa8", label: "Azul" },
  { value: "#9e2f2a", label: "Rojo" },
  { value: "#2c7a56", label: "Verde" },
  { value: "#3a3d44", label: "Grafito" },
  { value: "#b08a4a", label: "Mostaza" },
  { value: "#5b3f9e", label: "Violeta" },
];
