import React, { useState, useEffect, useRef, useMemo } from "react";
import { Theme, THEMES } from "../themes";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";

interface ThemeComboboxProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}

export const ThemeCombobox: React.FC<ThemeComboboxProps> = ({
  currentTheme,
  onSelectTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "dark" | "light">("all");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const darkCount = useMemo(
    () => THEMES.filter((t) => t.category === "dark").length,
    []
  );
  const lightCount = useMemo(
    () => THEMES.filter((t) => t.category === "light").length,
    []
  );

  const filteredThemes = useMemo(() => {
    return THEMES.filter((t) => {
      const matchesCategory = category === "all" || t.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Intercept Escape in capture phase so dialog doesn't close simultaneously
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  // Sync highlighted item & focus search input when opening
  useEffect(() => {
    if (isOpen) {
      const currentIdx = filteredThemes.findIndex(
        (t) => t.id === currentTheme.id
      );
      setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    } else {
      setSearch("");
      setCategory("all");
    }
  }, [isOpen]);

  // Keep highlighted index in bounds when filtering
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (filteredThemes.length === 0) return 0;
      return prev >= filteredThemes.length ? filteredThemes.length - 1 : prev;
    });
  }, [filteredThemes.length]);

  const scrollIndexIntoView = (idx: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>(
      "[data-theme-option]"
    );
    if (items[idx]) {
      items[idx].scrollIntoView({ block: "nearest" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredThemes.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredThemes.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredThemes[highlightedIndex]) {
        onSelectTheme(filteredThemes[highlightedIndex]);
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={comboboxRef} className="relative w-full">
      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: "var(--input)",
          borderColor: isOpen ? "var(--accent)" : "var(--hairline)",
          color: "var(--text)",
        }}
        className="w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-all hover:border-[var(--accent)] select-none focus:outline-none ring-offset-0 focus:ring-1 focus:ring-[var(--accent)]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Active 4-color palette swatch preview */}
          <div className="flex items-center gap-1 p-1 rounded-md bg-black/35 border border-white/5 shrink-0">
            {currentTheme.preview.map((color, idx) => (
              <span
                key={idx}
                style={{ backgroundColor: color }}
                className="w-2.5 h-2.5 rounded-full border border-black/20"
              />
            ))}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-tight">
              {currentTheme.name}
            </span>
            <span
              style={{ color: "var(--muted)" }}
              className="text-[10px] capitalize leading-none mt-0.5"
            >
              {currentTheme.category} theme
            </span>
          </div>
        </div>

        <ChevronsUpDown
          size={15}
          style={{ color: "var(--muted)" }}
          className="shrink-0 opacity-70"
        />
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--hairline-bright)",
            color: "var(--text)",
          }}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
          onKeyDown={handleKeyDown}
        >
          {/* Search & Category Filter Bar */}
          <div
            style={{ borderColor: "var(--hairline)" }}
            className="p-2 border-b flex flex-col gap-1.5"
          >
            {/* Search Input */}
            <div className="relative">
              <Search
                size={13}
                style={{ color: "var(--muted)" }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 22 themes…"
                style={{
                  backgroundColor: "var(--input)",
                  borderColor: "var(--hairline)",
                  color: "var(--text)",
                }}
                className="w-full h-7 pl-7 pr-6 text-xs rounded-lg border focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{ color: "var(--muted)" }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-white"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Tabs with dynamic counts */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-black/20 text-[10px]">
              <button
                type="button"
                onClick={() => setCategory("all")}
                style={{
                  backgroundColor:
                    category === "all" ? "var(--accent)" : "transparent",
                  color:
                    category === "all" ? "var(--bg)" : "var(--muted)",
                }}
                className="flex-1 py-0.5 font-medium rounded capitalize transition-all"
              >
                All ({THEMES.length})
              </button>
              <button
                type="button"
                onClick={() => setCategory("dark")}
                style={{
                  backgroundColor:
                    category === "dark" ? "var(--accent)" : "transparent",
                  color:
                    category === "dark" ? "var(--bg)" : "var(--muted)",
                }}
                className="flex-1 py-0.5 font-medium rounded capitalize transition-all"
              >
                Dark ({darkCount})
              </button>
              <button
                type="button"
                onClick={() => setCategory("light")}
                style={{
                  backgroundColor:
                    category === "light" ? "var(--accent)" : "transparent",
                  color:
                    category === "light" ? "var(--bg)" : "var(--muted)",
                }}
                className="flex-1 py-0.5 font-medium rounded capitalize transition-all"
              >
                Light ({lightCount})
              </button>
            </div>
          </div>

          {/* Scrollable Themes List */}
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1"
          >
            {filteredThemes.length === 0 ? (
              <div
                style={{ color: "var(--muted)" }}
                className="py-6 text-center text-xs"
              >
                No themes match "{search}"
              </div>
            ) : (
              filteredThemes.map((theme, index) => {
                const isSelected = currentTheme.id === theme.id;
                const isHighlighted = highlightedIndex === index;

                return (
                  <button
                    key={theme.id}
                    data-theme-option
                    type="button"
                    onClick={() => {
                      onSelectTheme(theme);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      backgroundColor: isSelected
                        ? "var(--accent-soft)"
                        : isHighlighted
                        ? "rgba(255, 255, 255, 0.08)"
                        : "transparent",
                      borderColor: isSelected
                        ? "var(--accent)"
                        : "transparent",
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-0.5 p-0.5 rounded bg-black/35 shrink-0">
                        {theme.preview.map((color, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: color }}
                            className="w-2 h-2 rounded-full border border-black/20"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium truncate">
                        {theme.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        style={{ color: "var(--muted)" }}
                        className="text-[9px] capitalize"
                      >
                        {theme.category}
                      </span>
                      {isSelected && (
                        <Check
                          size={13}
                          style={{ color: "var(--accent)" }}
                          className="stroke-[3]"
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
