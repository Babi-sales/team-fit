// Paleta validada (ver skill dataviz) — não inventar cores novas aqui.
export const categorical = {
  blue: "#2a78d6",
  green: "#008300",
  magenta: "#e87ba4",
  yellow: "#eda100",
  aqua: "#1baf7a",
  orange: "#eb6834",
  violet: "#4a3aa7",
  red: "#e34948",
};

export const status = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export function classificationColor(texto: string | null): string {
  if (!texto) return ink.muted;
  const t = texto.toLowerCase();
  if (t.includes("baixo") || t.includes("normal")) return status.good;
  if (t.includes("moderado") || t.includes("sobrepeso")) return status.warning;
  return status.critical; // alto, obesidade, abaixo do peso
}

export const ink = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
};
