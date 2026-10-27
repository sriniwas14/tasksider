import React, { useState, useRef, useEffect } from "react";
import { FlatRow, PRIO_COLORS, PRIO_LABELS, Priority } from "../types";
import { ChevronRight, ChevronDown, Check, GripVertical, Plus, MoreHorizontal } from "lucide-react";

interface TaskCardProps {
  row: FlatRow;
  isDragging: boolean;
  dropBefore: boolean;
  dropAfter: boolean;
  dropInside: boolean;
  onToggleDone: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onAddSubtask: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, archived: boolean) => void;
  onDragStart: (e: React.DragEvent, id: string, title: string, priority: Priority) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  row,
  isDragging,
  dropBefore,
  dropAfter,
  dropInside,
  onToggleDone,
  onToggleExpanded,
  onRename,
  onAddSubtask,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(row.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(row.title);
  }, [row.title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleCommitEdit() {
    onRename(row.id, editText);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleCommitEdit();
    } else if (e.key === "Escape") {
      setEditText(row.title);
      setEditing(false);
    }
  }

  const pColor = PRIO_COLORS[row.priority];
  const isMuted = row.done || row.archived;

  // Indent based on hierarchy depth
  const indentPadding = row.depth > 0 ? `${row.depth * 18}px` : "0px";

  return (
    <div
      style={{ paddingLeft: indentPadding }}
      className={`relative w-full transition-opacity duration-150 ${
        isDragging ? "opacity-30" : isMuted ? "opacity-60" : "opacity-100"
      }`}
      onDragOver={(e) => onDragOver(e, row.id)}
      onDragLeave={(e) => onDragLeave(e, row.id)}
      onDrop={(e) => onDrop(e, row.id)}
    >
      {/* Drop indicator line ABOVE card */}
      {dropBefore && (
        <div
          style={{ backgroundColor: "var(--accent)" }}
          className="absolute -top-1.5 left-0 right-0 h-[3px] rounded-full shadow-[0_0_8px_var(--accent)] z-20 pointer-events-none"
        />
      )}

      {/* Main Task Card */}
      <div
        onContextMenu={(e) => onContextMenu(e, row.id, row.archived)}
        style={{
          borderColor: dropInside
            ? "var(--accent)"
            : isMuted
            ? "var(--hairline)"
            : `${pColor}70`,
          backgroundColor: dropInside
            ? "var(--accent-soft)"
            : isMuted
            ? "var(--hairline)"
            : `${pColor}20`,
        }}
        className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all duration-150 select-none ${
          dropInside ? "ring-2 ring-[var(--accent)]" : "hover:border-opacity-100"
        }`}
      >
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, row.id, row.title, row.priority)}
          style={{ color: "var(--muted)" }}
          className="cursor-grab active:cursor-grabbing hover:text-[var(--text)] opacity-40 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder or nest"
        >
          <GripVertical size={14} />
        </div>

        {/* Expand / Collapse chevron if has subtasks */}
        {row.hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(row.id)}
            style={{ color: "var(--muted)" }}
            className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
          >
            {row.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="text-[10px] font-mono opacity-80">
              {row.doneCount}/{row.totalCount}
            </span>
          </button>
        ) : (
          <div className="w-3" />
        )}

        {/* Custom Checkbox */}
        <button
          type="button"
          onClick={() => onToggleDone(row.id)}
          style={{
            borderColor: row.done ? "var(--accent)" : "var(--hairline-bright)",
            backgroundColor: row.done ? "var(--accent)" : "transparent",
          }}
          className="w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0"
        >
          {row.done && (
            <Check
              size={11}
              style={{ color: "var(--bg)" }}
              className="stroke-[3]"
            />
          )}
        </button>

        {/* Task Title / Edit Input */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--accent)",
                color: "var(--text)",
              }}
              className="w-full text-sm px-1.5 py-0.5 rounded border focus:outline-none"
            />
          ) : (
            <span
              onDoubleClick={() => setEditing(true)}
              style={{
                color: row.done ? "var(--muted)" : "var(--text)",
              }}
              className={`text-sm tracking-tight block truncate cursor-text ${
                row.done ? "line-through opacity-75" : ""
              }`}
              title={row.title}
            >
              {row.title}
            </span>
          )}
        </div>

        {/* Priority Badge */}
        <div
          style={{
            backgroundColor: `${pColor}30`,
            borderColor: `${pColor}80`,
            color: pColor,
          }}
          className="px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider shrink-0"
        >
          {PRIO_LABELS[row.priority]}
        </div>

        {/* Quick action buttons on hover */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAddSubtask(row.id)}
            style={{ color: "var(--muted)" }}
            className="p-1 rounded hover:text-[var(--text)] hover:bg-white/10 transition-colors"
            title="Add subtask"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => onContextMenu(e, row.id, row.archived)}
            style={{ color: "var(--muted)" }}
            className="p-1 rounded hover:text-[var(--text)] hover:bg-white/10 transition-colors"
            title="More options"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* Drop indicator line BELOW card */}
      {dropAfter && (
        <div
          style={{ backgroundColor: "var(--accent)" }}
          className="absolute -bottom-1.5 left-0 right-0 h-[3px] rounded-full shadow-[0_0_8px_var(--accent)] z-20 pointer-events-none"
        />
      )}
    </div>
  );
};
