export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  category: "sans" | "mono";
}

export const FONTS: FontOption[] = [
  {
    id: "system",
    name: "System Default",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    category: "sans",
  },
  {
    id: "inter",
    name: "Inter",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    category: "sans",
  },
  {
    id: "geist",
    name: "Geist",
    fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
    category: "sans",
  },
  {
    id: "roboto",
    name: "Roboto",
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    category: "sans",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    category: "mono",
  },
  {
    id: "fira-code",
    name: "Fira Code",
    fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
    category: "mono",
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    fontFamily: "'Geist Mono', ui-monospace, monospace",
    category: "mono",
  },
  {
    id: "monospace",
    name: "System Monospace",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    category: "mono",
  },
];

export interface FontSizeOption {
  id: string;
  label: string;
  size: string;
  description: string;
}

export const FONT_SIZES: FontSizeOption[] = [
  { id: "sm", label: "Small", size: "11.5px", description: "Compact text" },
  { id: "base", label: "Default", size: "13px", description: "Standard balance" },
  { id: "md", label: "Medium", size: "14.5px", description: "Enhanced legibility" },
  { id: "lg", label: "Large", size: "16px", description: "High readability" },
];

export const DEFAULT_FONT_ID = "system";
export const DEFAULT_FONT_SIZE_ID = "base";

export function getFont(id: string): FontOption {
  return FONTS.find((f) => f.id === id) || FONTS[0];
}

export function getFontSize(id: string): FontSizeOption {
  return FONT_SIZES.find((s) => s.id === id) || FONT_SIZES[1];
}

export function applyTypography(fontFamily: string, fontSize: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--app-font-family", fontFamily);
  root.style.setProperty("--app-font-size", fontSize);
}
