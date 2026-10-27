import React, { useState } from "react";
import { FlatRow, Priority, DropPosition, DragState } from "../types";
import { TaskCard } from "./TaskCard";
import { CornerDownRight } from "lucide-react";

interface TaskTreeProps {
  rows: FlatRow[];
  dragState: DragState;
  inlineFor: string;
  onSetInlineFor: (id: string) => void;
  onToggleDone: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onAddSubtask: (title: string, parentId?: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, archived: boolean) => void;
  onStartDrag: (id: string, title: string, priority: Priority) => void;
  onUpdateDragTarget: (targetId: string, position: DropPosition | "") => void;
  onMoveTask: (sourceId: string, targetId: string, position: DropPosition) => void;
  onCancelDrag: () => void;
}

export const TaskTree: React.FC<TaskTreeProps> = ({
  rows,
  dragState,
  inlineFor,
  onSetInlineFor,
  onToggleDone,
  onToggleExpanded,
  onRename,
  onAddSubtask,
  onContextMenu,
  onStartDrag,
  onUpdateDragTarget,
  onMoveTask,
  onCancelDrag,
}) => {
  const [subtaskTitle, setSubtaskTitle] = useState("");

  function handleDragStart(e: React.DragEvent, id: string, title: string, priority: Priority) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    onStartDrag(id, title, priority);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (dragState.taskId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const height = rect.height;

    let position: DropPosition = "inside";
    if (relY < height * 0.28) {
      position = "before";
    } else if (relY > height * 0.72) {
      position = "after";
    } else {
      position = "inside";
    }

    onUpdateDragTarget(targetId, position);
  }

  function handleDragLeave(_e: React.DragEvent, targetId: string) {
    if (dragState.targetId === targetId) {
      onUpdateDragTarget("", "");
    }
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragState.taskId || dragState.taskId === targetId) {
      onCancelDrag();
      return;
    }
    const pos = dragState.position || "after";
    onMoveTask(dragState.taskId, targetId, pos);
  }

  function handleFooterDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragState.taskId) return;
    onMoveTask(dragState.taskId, "ROOT_END", "root_bottom");
  }

  function handleCommitSubtask(parentId: string) {
    if (subtaskTitle.trim()) {
      onAddSubtask(subtaskTitle.trim(), parentId);
      setSubtaskTitle("");
    }
    onSetInlineFor("");
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
      {rows.length === 0 ? (
        <div
          style={{ color: "var(--muted)" }}
          className="flex-1 flex flex-col items-center justify-center text-center p-8"
        >
          <span className="text-sm">No tasks found</span>
          <span className="text-xs opacity-60 mt-1">Add a task below to get started</span>
        </div>
      ) : (
        rows.map((row) => {
          const isTarget = dragState.targetId === row.id;
          const dropBefore = isTarget && dragState.position === "before";
          const dropAfter = isTarget && dragState.position === "after";
          const dropInside = isTarget && dragState.position === "inside";

          return (
            <React.Fragment key={row.id}>
              <TaskCard
                row={row}
                isDragging={dragState.taskId === row.id}
                dropBefore={dropBefore}
                dropAfter={dropAfter}
                dropInside={dropInside}
                onToggleDone={onToggleDone}
                onToggleExpanded={onToggleExpanded}
                onRename={onRename}
                onAddSubtask={(id) => {
                  onSetInlineFor(id);
                  setSubtaskTitle("");
                }}
                onContextMenu={onContextMenu}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />

              {/* Inline Subtask Input when activated */}
              {inlineFor === row.id && (
                <div
                  style={{ paddingLeft: `${(row.depth + 1) * 18}px` }}
                  className="flex items-center gap-2 py-1 animate-in fade-in duration-100"
                >
                  <CornerDownRight size={14} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitSubtask(row.id);
                      if (e.key === "Escape") onSetInlineFor("");
                    }}
                    onBlur={() => handleCommitSubtask(row.id)}
                    placeholder="New subtask… (Enter to save)"
                    style={{
                      backgroundColor: "var(--input)",
                      borderColor: "var(--accent)",
                      color: "var(--text)",
                    }}
                    className="flex-1 text-sm px-2.5 py-1.5 rounded-xl border focus:outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })
      )}

      {/* Footer Drop Area (Move to end of root list) */}
      {dragState.taskId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            onUpdateDragTarget("ROOT_END", "root_bottom");
          }}
          onDragLeave={() => {
            if (dragState.targetId === "ROOT_END") onUpdateDragTarget("", "");
          }}
          onDrop={handleFooterDrop}
          style={{
            borderColor:
              dragState.targetId === "ROOT_END"
                ? "var(--accent)"
                : "var(--hairline)",
            backgroundColor:
              dragState.targetId === "ROOT_END"
                ? "var(--accent-soft)"
                : "transparent",
            color:
              dragState.targetId === "ROOT_END"
                ? "var(--accent)"
                : "var(--muted)",
          }}
          className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all"
        >
          <span className="text-sm font-semibold">↓</span>
          <span className="text-xs font-medium">Drop here to move to the end</span>
        </div>
      )}
    </div>
  );
};
