import React from "react";
import { X, Search } from "lucide-react";

interface HeaderProps {
  openCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  openCount,
  query,
  onQueryChange,
  onClose,
}) => {
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-1">
      {/* Top row: Title, Date, Pill, Close */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight text-[#e6e9f5]">
            Tasksider
          </span>
          <span className="text-xs text-[#8a8fa8]">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Open count pill */}
          <div className="px-2.5 py-0.5 rounded-full bg-[rgba(137,180,250,0.14)] border border-[rgba(137,180,250,0.35)]">
            <span className="text-xs font-semibold text-[#89b4fa]">
              {openCount} open
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8a8fa8] hover:text-[#e6e9f5] hover:bg-white/10 transition-colors"
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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8fa8]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tasks…"
          className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#20202f] border border-[rgba(255,255,255,0.08)] text-sm text-[#e6e9f5] placeholder-[#8a8fa8] focus:outline-none focus:border-[#89b4fa] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8a8fa8] hover:text-white"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
