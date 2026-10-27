import React, { useState, useEffect, useRef } from "react";
import { Theme, THEMES } from "../themes";
import { X, Check, Palette, Search } from "lucide-react";

interface SettingsDialogProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "dark" | "light">("all");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredThemes = THEMES.filter((t) => {
    const matchesCategory = category === "all" || t.category === category;
    const matchesSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      t.id.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--hairline-bright)",
          color: "var(--text)",
        }}
        className="w-full max-w-sm max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          style={{ borderColor: "var(--hairline)" }}
          className="flex items-center justify-between px-4 py-3 border-b"
        >
          <div className="flex items-center gap-2">
            <Palette size={18} style={{ color: "var(--accent)" }} />
            <span className="font-semibold text-sm">Theme Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "var(--muted)" }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 flex flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              style={{ color: "var(--muted)" }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 20+ themes…"
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--hairline)",
                color: "var(--text)",
              }}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 p-0.5 rounded-xl bg-black/20">
            {(["all", "dark", "light"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  backgroundColor:
                    category === cat ? "var(--accent)" : "transparent",
                  color:
                    category === cat
                      ? "var(--bg)"
                      : "var(--muted)",
                }}
                className="flex-1 py-1 text-xs font-medium rounded-lg capitalize transition-all"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Themes List / Grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
          {filteredThemes.length === 0 ? (
            <div
              style={{ color: "var(--muted)" }}
              className="py-8 text-center text-xs"
            >
              No themes found
            </div>
          ) : (
            filteredThemes.map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme)}
                  style={{
                    backgroundColor: isSelected
                      ? "var(--accent-soft)"
                      : "var(--input)",
                    borderColor: isSelected
                      ? "var(--accent)"
                      : "var(--hairline)",
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all hover:border-[var(--accent)] ${
                    isSelected ? "ring-1 ring-[var(--accent)]" : ""
                  }`}
                >
                  {/* Theme Info */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        style={{ color: "var(--text)" }}
                        className="text-xs font-semibold truncate"
                      >
                        {theme.name}
                      </span>
                      {isSelected && (
                        <Check
                          size={13}
                          style={{ color: "var(--accent)" }}
                          className="shrink-0 stroke-[3]"
                        />
                      )}
                    </div>
                    <span
                      style={{ color: "var(--muted)" }}
                      className="text-[10px] capitalize"
                    >
                      {theme.category} theme
                    </span>
                  </div>

                  {/* 4-Color Swatch Preview */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-black/30 border border-white/5 shrink-0">
                    {theme.preview.map((color, idx) => (
                      <span
                        key={idx}
                        style={{ backgroundColor: color }}
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        title={color}
                      />
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div
          style={{
            borderColor: "var(--hairline)",
            color: "var(--muted)",
          }}
          className="px-4 py-2 border-t text-[10px] flex items-center justify-between"
        >
          <span>Pick a theme to apply instantly</span>
          <kbd className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 font-mono text-[9px]">
            ESC
          </kbd>
        </div>
      </div>
    </div>
  );
};
