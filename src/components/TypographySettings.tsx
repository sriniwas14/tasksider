import React, { useState } from "react";
import { FONTS, FONT_SIZES } from "../fonts";
import { Type, ChevronsUpDown, Check, PanelRight, SlidersHorizontal } from "lucide-react";

interface TypographySettingsProps {
  fontId: string;
  onChangeFont: (id: string) => void;
  fontSizeId: string;
  onChangeFontSize: (id: string) => void;
  customFont: string;
  onChangeCustomFont: (font: string) => void;
  sidebarWidth: number;
  onChangeSidebarWidth: (width: number) => void;
}

const WIDTH_PRESETS = [
  { label: "Compact", width: 320 },
  { label: "Default", width: 380 },
  { label: "Wide", width: 460 },
  { label: "Spacious", width: 560 },
];

export const TypographySettings: React.FC<TypographySettingsProps> = ({
  fontId,
  onChangeFont,
  fontSizeId,
  onChangeFontSize,
  customFont,
  onChangeCustomFont,
  sidebarWidth,
  onChangeSidebarWidth,
}) => {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(!!customFont);

  const selectedFont = FONTS.find((f) => f.id === fontId) || FONTS[0];

  return (
    <div className="flex flex-col gap-3">
      {/* --- Section: Font Family --- */}
      <div className="flex flex-col gap-1.5">
        <label
          style={{ color: "var(--muted)" }}
          className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1"
        >
          <Type size={11} style={{ color: "var(--accent)" }} />
          <span>Font Family</span>
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFontMenuOpen(!fontMenuOpen)}
            style={{
              backgroundColor: "var(--input)",
              borderColor: fontMenuOpen ? "var(--accent)" : "var(--hairline)",
              color: "var(--text)",
            }}
            className="w-full px-3 py-2 rounded-xl border flex items-center justify-between text-left transition-all hover:border-[var(--accent)]"
          >
            <div className="flex flex-col min-w-0">
              <span
                style={{ fontFamily: customFont || selectedFont.fontFamily }}
                className="text-xs font-medium truncate"
              >
                {customFont ? `Custom: ${customFont}` : selectedFont.name}
              </span>
              <span style={{ color: "var(--muted)" }} className="text-[9px] capitalize">
                {customFont ? "Custom family" : `${selectedFont.category} font`}
              </span>
            </div>
            <ChevronsUpDown size={14} style={{ color: "var(--muted)" }} className="shrink-0" />
          </button>

          {fontMenuOpen && (
            <div
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--hairline-bright)",
                color: "var(--text)",
              }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl p-1.5 flex flex-col gap-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
            >
              {FONTS.map((font) => {
                const isSelected = !customFont && font.id === fontId;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      onChangeFont(font.id);
                      onChangeCustomFont("");
                      setFontMenuOpen(false);
                    }}
                    style={{
                      backgroundColor: isSelected ? "var(--accent-soft)" : "transparent",
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex flex-col min-w-0">
                      <span
                        style={{ fontFamily: font.fontFamily }}
                        className="text-xs font-medium truncate"
                      >
                        {font.name}
                      </span>
                      <span style={{ color: "var(--muted)" }} className="text-[9px] capitalize">
                        {font.category}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={13} style={{ color: "var(--accent)" }} className="stroke-[3]" />
                    )}
                  </button>
                );
              })}

              {/* Custom font toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(true);
                  setFontMenuOpen(false);
                }}
                style={{ borderColor: "var(--hairline)", color: "var(--muted)" }}
                className="w-full mt-1 pt-1 border-t px-2 py-1 text-[10px] text-center hover:text-white"
              >
                + Type custom font name
              </button>
            </div>
          )}
        </div>

        {/* Custom Font Name Input */}
        {showCustomInput && (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="text"
              value={customFont}
              onChange={(e) => onChangeCustomFont(e.target.value)}
              placeholder="e.g. Comic Code, Departure Mono, Iosevka"
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--hairline)",
                color: "var(--text)",
              }}
              className="flex-1 h-7 px-2.5 text-xs rounded-lg border focus:outline-none focus:border-[var(--accent)]"
            />
            {customFont && (
              <button
                type="button"
                onClick={() => {
                  onChangeCustomFont("");
                  setShowCustomInput(false);
                }}
                style={{ color: "var(--muted)" }}
                className="px-2 h-7 rounded-lg text-[10px] hover:text-white hover:bg-white/10"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- Section: Font Size --- */}
      <div className="flex flex-col gap-1.5">
        <label
          style={{ color: "var(--muted)" }}
          className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1"
        >
          <SlidersHorizontal size={11} style={{ color: "var(--accent)" }} />
          <span>Font Size</span>
        </label>

        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-black/25">
          {FONT_SIZES.map((sizeOpt) => {
            const isSelected = sizeOpt.id === fontSizeId;
            return (
              <button
                key={sizeOpt.id}
                type="button"
                onClick={() => onChangeFontSize(sizeOpt.id)}
                style={{
                  backgroundColor: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--bg)" : "var(--muted)",
                }}
                className="py-1 px-1.5 rounded-lg text-center font-medium transition-all"
                title={`${sizeOpt.label} (${sizeOpt.size}) - ${sizeOpt.description}`}
              >
                <div className="text-[11px] font-semibold">{sizeOpt.label}</div>
                <div className="text-[9px] opacity-75">{sizeOpt.size}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Section: Sidebar Width & Resizing --- */}
      <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-center justify-between">
          <label
            style={{ color: "var(--muted)" }}
            className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1"
          >
            <PanelRight size={11} style={{ color: "var(--accent)" }} />
            <span>Sidebar Width</span>
          </label>
          <span style={{ color: "var(--accent)" }} className="font-mono text-xs font-semibold">
            {sidebarWidth}px
          </span>
        </div>

        {/* Width Slider */}
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--muted)" }} className="text-[10px]">
            280
          </span>
          <input
            type="range"
            min="280"
            max="700"
            step="10"
            value={sidebarWidth}
            onChange={(e) => onChangeSidebarWidth(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)] h-1.5 bg-black/30 rounded-lg cursor-pointer"
          />
          <span style={{ color: "var(--muted)" }} className="text-[10px]">
            700
          </span>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-1">
          {WIDTH_PRESETS.map((preset) => {
            const isSelected = Math.abs(sidebarWidth - preset.width) < 15;
            return (
              <button
                key={preset.width}
                type="button"
                onClick={() => onChangeSidebarWidth(preset.width)}
                style={{
                  backgroundColor: isSelected ? "var(--accent-soft)" : "var(--input)",
                  borderColor: isSelected ? "var(--accent)" : "var(--hairline)",
                  color: isSelected ? "var(--accent)" : "var(--muted)",
                }}
                className="py-1 px-1 rounded-lg border text-center transition-all hover:border-[var(--accent)]"
              >
                <div className="text-[10px] font-medium leading-tight">{preset.label}</div>
                <div className="text-[9px] font-mono opacity-80">{preset.width}px</div>
              </button>
            );
          })}
        </div>

        <p style={{ color: "var(--muted)" }} className="text-[10px] leading-snug">
          Tip: You can also hover & drag the <strong>left border</strong> of the sidebar anytime to resize smoothly.
        </p>
      </div>
    </div>
  );
};
