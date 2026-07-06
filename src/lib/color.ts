function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function getContrastText(hex: string): string {
  return luminance(hex) > 0.5 ? "text-slate-800" : "text-white";
}

export function getContrastBorder(hex: string): string {
  return luminance(hex) > 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)";
}
