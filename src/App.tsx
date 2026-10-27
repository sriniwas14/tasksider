import { useState, useEffect } from "react";
import { useTaskStore } from "./store/taskStore";
import { Header } from "./components/Header";
import { TaskTree } from "./components/TaskTree";
import { PriorityMenu } from "./components/PriorityMenu";
import { SettingsDialog } from "./components/SettingsDialog";
import { Theme, getTheme, applyTheme, DEFAULT_THEME_ID } from "./themes";
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

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tasksider_theme");
    return getTheme(saved || DEFAULT_THEME_ID);
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  // Apply theme dynamically to CSS variables & persist
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("tasksider_theme", theme.id);
  }, [theme]);

  // Global keyboard shortcuts (Escape cancels drag / closes modals)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (dragState.taskId) {
          cancelDrag();
        } else if (contextMenu.visible) {
          setContextMenu((prev) => ({ ...prev, visible: false }));
        } else if (inlineFor) {
          setInlineFor("");
        } else {
          handleCloseWindow();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, dragState.taskId, contextMenu.visible, inlineFor, cancelDrag]);

  async function handleCloseWindow() {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("hide_window");
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
    <div
      style={{
        background: `linear-gradient(to bottom, var(--bg-top), var(--bg))`,
        color: "var(--text)",
        borderLeftColor: "var(--hairline-bright)",
      }}
      className="relative w-full h-screen flex flex-col border-l shadow-2xl overflow-hidden select-none transition-colors duration-200"
    >
      {/* Accent edge glow on the left border */}
      <div
        style={{ backgroundColor: "var(--accent)" }}
        className="absolute top-0 bottom-0 left-0 w-[1.5px] opacity-40 pointer-events-none"
      />

      {/* Header with Search, Open Count, and Cog */}
      <Header
        openCount={openCount}
        query={query}
        onQueryChange={setQuery}
        onOpenSettings={() => setSettingsOpen(true)}
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
      <form
        onSubmit={handleAddRootTask}
        style={{
          borderTopColor: "var(--hairline)",
          backgroundColor: "var(--bg)",
        }}
        className="px-4 py-2 border-t"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            placeholder="+ Add a new task… (Enter to add)"
            style={{
              backgroundColor: "var(--input)",
              borderColor: "var(--hairline)",
              color: "var(--text)",
            }}
            className="w-full h-9 pl-3 pr-9 rounded-xl border text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="submit"
            disabled={!newRootTitle.trim()}
            style={{ color: "var(--accent)" }}
            className="absolute right-1.5 p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Add task"
          >
            <Plus size={16} />
          </button>
        </div>
      </form>

      {/* Footer Info & Show Archived Toggle */}
      <div
        style={{
          borderTopColor: "var(--hairline)",
          backgroundColor: "var(--bg)",
          color: "var(--muted)",
        }}
        className="px-4 py-2.5 flex items-center justify-between text-[10px] border-t"
      >
        <span>Double-click to rename · Drag ⠿ to reorder</span>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-1.5 hover:text-[var(--text)] transition-colors"
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

      {/* Theme Settings Dialog */}
      {settingsOpen && (
        <SettingsDialog
          currentTheme={theme}
          onSelectTheme={(selected) => setTheme(selected)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
