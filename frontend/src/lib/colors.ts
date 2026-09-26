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

// Matches the app chrome tokens in globals.css (light mode) — charts render
// on a white surface so their ink/grid tones are re-validated against #ffffff
// (see the dataviz skill's palette validator; categorical/status hues above
// are unchanged since only the chart chrome, not the hues, was re-themed).
export const ink = {
  primary: "#10152b",
  secondary: "#4b5165",
  muted: "#8891a5",
  grid: "#e4e8f1",
  baseline: "#c7cede",
};
