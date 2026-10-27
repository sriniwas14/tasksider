import React from "react";
import { X, Search, Settings } from "lucide-react";

interface HeaderProps {
  openCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  openCount,
  query,
  onQueryChange,
  onOpenSettings,
  onClose,
}) => {
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-1">
      {/* Top row: Title, Date, Pill, Settings Cog, Close */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span
            style={{ color: "var(--text)" }}
            className="text-xl font-semibold tracking-tight"
          >
            Tasksider
          </span>
          <span style={{ color: "var(--muted)" }} className="text-xs">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Open count pill */}
          <div
            style={{
              backgroundColor: "var(--accent-soft)",
              borderColor: "var(--hairline-bright)",
            }}
            className="px-2.5 py-0.5 rounded-full border"
          >
            <span
              style={{ color: "var(--accent)" }}
              className="text-xs font-semibold"
            >
              {openCount} open
            </span>
          </div>

          {/* Settings cog button */}
          <button
            type="button"
            onClick={onOpenSettings}
            style={{ color: "var(--muted)" }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:text-[var(--text)] hover:bg-white/10 transition-colors"
            title="Theme Settings"
          >
            <Settings size={15} />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{ color: "var(--muted)" }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:text-[var(--text)] hover:bg-white/10 transition-colors"
            title="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search pill */}
      <div className="relative w-full">
        <Search
          size={15}
          style={{ color: "var(--muted)" }}
          className="absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tasks…"
          style={{
            backgroundColor: "var(--input)",
            borderColor: "var(--hairline)",
            color: "var(--text)",
          }}
          className="w-full h-9 pl-9 pr-7 rounded-xl border text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            style={{ color: "var(--muted)" }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs hover:text-white"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
