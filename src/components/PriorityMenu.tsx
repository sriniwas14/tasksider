import React, { useEffect, useRef, useState } from "react";
import { Priority, PRIO_COLORS, formatDuration, parseDurationInput } from "../types";
import {
  Plus,
  Trash2,
  Archive,
  ArchiveRestore,
  Calendar as CalendarIcon,
  Timer as TimerIcon,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";

interface PriorityMenuProps {
  x: number;
  y: number;
  taskId: string;
  isArchived: boolean;
  currentDuration?: number;
  onClose: () => void;
  onAddSubtask: (id: string) => void;
  onOpenDatePicker: (id: string, x: number, y: number) => void;
  onSetDuration: (id: string, minutes?: number) => void;
  onSetPriority: (id: string, p: Priority) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PriorityMenu: React.FC<PriorityMenuProps> = ({
  x,
  y,
  taskId,
  isArchived,
  currentDuration,
  onClose,
  onAddSubtask,
  onOpenDatePicker,
  onSetDuration,
  onSetPriority,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"main" | "duration" | "custom">("main");
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Constrain coordinates within window bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <div
      ref={menuRef}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        backgroundColor: "var(--card)",
        borderColor: "var(--hairline-bright)",
        color: "var(--text)",
      }}
      className="fixed z-50 w-48 rounded-xl border shadow-2xl py-1 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {view === "main" && (
        <>
          <button
            type="button"
            onClick={() => {
              onAddSubtask(taskId);
              onClose();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors text-left"
          >
            <Plus size={14} style={{ color: "var(--accent)" }} />
            <span>Add subtask</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenDatePicker(taskId, adjustedX, adjustedY);
              onClose();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors text-left"
          >
            <CalendarIcon size={14} style={{ color: "var(--accent)" }} />
            <span>Change date</span>
          </button>

          <button
            type="button"
            onClick={() => setView("duration")}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <TimerIcon size={14} style={{ color: "var(--accent)" }} />
              <span>Set duration</span>
            </div>
            {currentDuration ? (
              <span style={{ color: "var(--accent)" }} className="text-[10px] font-semibold">
                {formatDuration(currentDuration)}
              </span>
            ) : (
              <span style={{ color: "var(--muted)" }} className="text-[10px]">
                ›
              </span>
            )}
          </button>

          <div style={{ borderColor: "var(--hairline)" }} className="my-1 border-t" />

          {([0, 1, 2, 3] as Priority[]).map((p) => {
            const labels = ["P0 · Critical", "P1 · High", "P2 · Normal", "P3 · None"];
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onSetPriority(taskId, p);
                  onClose();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors text-left"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PRIO_COLORS[p] }}
                />
                <span>{labels[p]}</span>
              </button>
            );
          })}

          <div style={{ borderColor: "var(--hairline)" }} className="my-1 border-t" />

          {isArchived ? (
            <button
              type="button"
              onClick={() => {
                onUnarchive(taskId);
                onClose();
              }}
              style={{ color: "var(--muted)" }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 hover:text-[var(--text)] transition-colors text-left"
            >
              <ArchiveRestore size={14} />
              <span>Unarchive</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onArchive(taskId);
                onClose();
              }}
              style={{ color: "var(--muted)" }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 hover:text-[var(--text)] transition-colors text-left"
            >
              <Archive size={14} />
              <span>Archive</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDelete(taskId);
              onClose();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-500/20 text-red-400 transition-colors text-left"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </>
      )}

      {view === "duration" && (
        <div className="flex flex-col animate-in fade-in duration-100">
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-[var(--hairline)]">
            <button
              type="button"
              onClick={() => setView("main")}
              className="flex items-center gap-1 text-[11px] font-medium hover:text-[var(--text)]"
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>
            <span className="font-semibold text-[11px]">Set Duration</span>
            <button
              type="button"
              onClick={onClose}
              style={{ color: "var(--muted)" }}
              className="p-0.5 rounded hover:text-white"
            >
              <X size={12} />
            </button>
          </div>

          <div className="py-1">
            {[
              { label: "30 minutes", minutes: 30 },
              { label: "1 hour", minutes: 60 },
              { label: "2 hours", minutes: 120 },
              { label: "3 hours", minutes: 180 },
            ].map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => {
                  onSetDuration(taskId, opt.minutes);
                  onClose();
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
              >
                <span>{opt.label}</span>
                {currentDuration === opt.minutes && (
                  <Check size={13} style={{ color: "var(--accent)" }} />
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setCustomInput(currentDuration ? formatDuration(currentDuration) : "");
                setError(false);
                setView("custom");
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
            >
              <span>Custom…</span>
              <span style={{ color: "var(--muted)" }} className="text-[10px]">
                ›
              </span>
            </button>

            {currentDuration ? (
              <>
                <div style={{ borderColor: "var(--hairline)" }} className="my-1 border-t" />
                <button
                  type="button"
                  onClick={() => {
                    onSetDuration(taskId, undefined);
                    onClose();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-500/15 text-red-400 transition-colors text-left"
                >
                  <span>Clear duration</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {view === "custom" && (
        <div className="flex flex-col animate-in fade-in duration-100">
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-[var(--hairline)]">
            <button
              type="button"
              onClick={() => setView("duration")}
              className="flex items-center gap-1 text-[11px] font-medium hover:text-[var(--text)]"
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>
            <span className="font-semibold text-[11px]">Custom</span>
            <button
              type="button"
              onClick={onClose}
              style={{ color: "var(--muted)" }}
              className="p-0.5 rounded hover:text-white"
            >
              <X size={12} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseDurationInput(customInput);
              if (parsed && parsed > 0) {
                onSetDuration(taskId, parsed);
                onClose();
              } else {
                setError(true);
              }
            }}
            className="p-2.5 flex flex-col gap-2"
          >
            <input
              autoFocus
              type="text"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="e.g. 45m, 1h 30m, 90"
              style={{
                backgroundColor: "var(--input)",
                borderColor: error ? "#ef4444" : "var(--hairline)",
                color: "var(--text)",
              }}
              className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {error && (
              <span className="text-[10px] text-red-400 leading-tight">
                Enter e.g. 45m, 1.5h, or 90
              </span>
            )}
            <div className="flex items-center gap-1">
              {["15m", "45m", "90m", "4h"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const p = parseDurationInput(chip);
                    if (p) {
                      onSetDuration(taskId, p);
                      onClose();
                    }
                  }}
                  style={{
                    backgroundColor: "var(--input)",
                    borderColor: "var(--hairline)",
                    color: "var(--muted)",
                  }}
                  className="flex-1 py-0.5 rounded text-[10px] border hover:text-[var(--text)] hover:border-[var(--accent)] transition-all text-center"
                >
                  {chip}
                </button>
              ))}
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--bg)",
              }}
              className="w-full py-1.5 rounded-lg font-semibold text-xs transition-opacity hover:opacity-90"
            >
              Save Duration
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
