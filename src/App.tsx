import { useState, useEffect } from "react";
import { useTaskStore } from "./store/taskStore";
import { Header } from "./components/Header";
import { TaskTree } from "./components/TaskTree";
import { PriorityMenu } from "./components/PriorityMenu";
import { Priority } from "./types";
import { Plus } from "lucide-react";

export function App() {
  const {
    rows,
    openCount,
    query,
    setQuery,
    showArchived,
    setShowArchived,
    dragState,
    startDrag,
    updateDragTarget,
    cancelDrag,
    addTask,
    toggleDone,
    toggleExpanded,
    setPriority,
    renameTask,
    removeTask,
    archiveTask,
    unarchiveTask,
    moveTask,
  } = useTaskStore();

  const [inlineFor, setInlineFor] = useState<string>("");
  const [newRootTitle, setNewRootTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: string;
    isArchived: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    taskId: "",
    isArchived: false,
  });

  // Global keyboard shortcuts (Escape cancels drag / closes context menu)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (dragState.taskId) {
          cancelDrag();
        } else if (contextMenu.visible) {
          setContextMenu((prev) => ({ ...prev, visible: false }));
        } else if (inlineFor) {
          setInlineFor("");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState.taskId, contextMenu.visible, inlineFor, cancelDrag]);

  async function handleCloseWindow() {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        await appWindow.hide();
      }
    } catch (e) {
      console.warn("Could not hide Tauri window:", e);
    }
  }

  function handleContextMenu(e: React.MouseEvent, id: string, archived: boolean) {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId: id,
      isArchived: archived,
    });
  }

  function handleAddRootTask(e: React.FormEvent) {
    e.preventDefault();
    if (newRootTitle.trim()) {
      addTask(newRootTitle.trim());
      setNewRootTitle("");
    }
  }

  return (
    <div className="relative w-full h-screen flex flex-col bg-gradient-to-b from-[#191924] to-[#14141c] text-[#e6e9f5] border-l border-[#89b4fa]/25 shadow-2xl overflow-hidden select-none">
      {/* Accent edge glow on the left border */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-[#89b4fa] opacity-35 pointer-events-none" />

      {/* Header with Search and Open Count */}
      <Header
        openCount={openCount}
        query={query}
        onQueryChange={setQuery}
        onClose={handleCloseWindow}
      />

      {/* Task Tree & Hierarchical List */}
      <TaskTree
        rows={rows}
        dragState={dragState}
        inlineFor={inlineFor}
        onSetInlineFor={setInlineFor}
        onToggleDone={toggleDone}
        onToggleExpanded={toggleExpanded}
        onRename={renameTask}
        onAddSubtask={(title, parentId) => addTask(title, parentId)}
        onContextMenu={handleContextMenu}
        onStartDrag={startDrag}
        onUpdateDragTarget={updateDragTarget}
        onMoveTask={moveTask}
        onCancelDrag={cancelDrag}
      />

      {/* Bottom Task Quick Add Input Bar */}
      <form onSubmit={handleAddRootTask} className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] bg-[#14141c]/60">
        <div className="relative flex items-center">
          <input
            type="text"
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            placeholder="+ Add a new task… (Enter to add)"
            className="w-full h-9 pl-3 pr-9 rounded-xl bg-[#20202f] border border-[rgba(255,255,255,0.08)] text-sm text-[#e6e9f5] placeholder-[#8a8fa8] focus:outline-none focus:border-[#89b4fa] transition-colors"
          />
          <button
            type="submit"
            disabled={!newRootTitle.trim()}
            className="absolute right-1.5 p-1 rounded-lg text-[#89b4fa] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Add task"
          >
            <Plus size={16} />
          </button>
        </div>
      </form>

      {/* Footer Info & Show Archived Toggle */}
      <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-[#8a8fa8] border-t border-[rgba(255,255,255,0.04)] bg-[#14141c]">
        <span>Double-click to rename · Drag ⠿ to reorder</span>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-1.5 hover:text-[#e6e9f5] transition-colors"
        >
          <span className="text-xs">{showArchived ? "☑" : "☐"}</span>
          <span>Show Archived</span>
        </button>
      </div>

      {/* Floating Priority & Actions Context Menu */}
      {contextMenu.visible && (
        <PriorityMenu
          x={contextMenu.x}
          y={contextMenu.y}
          taskId={contextMenu.taskId}
          isArchived={contextMenu.isArchived}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
          onAddSubtask={(id) => {
            setInlineFor(id);
          }}
          onSetPriority={(id, p: Priority) => setPriority(id, p)}
          onArchive={(id) => archiveTask(id)}
          onUnarchive={(id) => unarchiveTask(id)}
          onDelete={(id) => removeTask(id)}
        />
      )}
    </div>
  );
}

export default App;
