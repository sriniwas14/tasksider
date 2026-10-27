import React, { useEffect, useRef } from "react";
import { Priority, PRIO_COLORS } from "../types";
import { Plus, Trash2, Archive, ArchiveRestore } from "lucide-react";

interface PriorityMenuProps {
  x: number;
  y: number;
  taskId: string;
  isArchived: boolean;
  onClose: () => void;
  onAddSubtask: (id: string) => void;
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
  onClose,
  onAddSubtask,
  onSetPriority,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

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
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 240);

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
      className="fixed z-50 w-44 rounded-xl border shadow-2xl py-1 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
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
    </div>
  );
};
