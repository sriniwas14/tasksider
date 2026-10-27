import { useState, useEffect, useCallback } from "react";
import { useTaskStore } from "./store/taskStore";
import { Header } from "./components/Header";
import { TaskTree } from "./components/TaskTree";
import { PriorityMenu } from "./components/PriorityMenu";
import { SettingsDialog } from "./components/SettingsDialog";
import { Theme, getTheme, applyTheme, DEFAULT_THEME_ID } from "./themes";
import {
  DEFAULT_FONT_ID,
  DEFAULT_FONT_SIZE_ID,
  getFont,
  getFontSize,
  applyTypography,
} from "./fonts";
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
    syncStatus,
    startGoogleAuth,
    disconnectGoogle,
    syncNow,
  } = useTaskStore();

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("tasksider_theme");
    return getTheme(saved || DEFAULT_THEME_ID);
  });
  const [fontId, setFontId] = useState<string>(() => {
    return localStorage.getItem("tasksider_font_id") || DEFAULT_FONT_ID;
  });
  const [fontSizeId, setFontSizeId] = useState<string>(() => {
    return localStorage.getItem("tasksider_font_size_id") || DEFAULT_FONT_SIZE_ID;
  });
  const [customFont, setCustomFont] = useState<string>(() => {
    return localStorage.getItem("tasksider_custom_font") || "";
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("tasksider_sidebar_width");
    return saved ? Number(saved) : 380;
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

  // Apply typography (Font & Font Size) & persist
  useEffect(() => {
    const selectedFont = customFont ? customFont : getFont(fontId).fontFamily;
    const selectedSize = getFontSize(fontSizeId).size;
    applyTypography(selectedFont, selectedSize);
    localStorage.setItem("tasksider_font_id", fontId);
    localStorage.setItem("tasksider_font_size_id", fontSizeId);
    if (customFont) {
      localStorage.setItem("tasksider_custom_font", customFont);
    } else {
      localStorage.removeItem("tasksider_custom_font");
    }
  }, [fontId, fontSizeId, customFont]);

  // Update sidebar width in backend and persist
  const updateSidebarWidth = useCallback(async (width: number) => {
    const clamped = Math.round(Math.min(Math.max(280, width), 850));
    setSidebarWidth(clamped);
    localStorage.setItem("tasksider_sidebar_width", String(clamped));
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_sidebar_width", { width: clamped });
      }
    } catch (e) {
      console.warn("Could not set sidebar width:", e);
    }
  }, []);

  // Restore saved width on initial mount
  useEffect(() => {
    const saved = Number(localStorage.getItem("tasksider_sidebar_width")) || 380;
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("set_sidebar_width", { width: saved });
      });
    }
  }, []);

  // Interactive Drag-to-Resize on the left border
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Sidebar is anchored to right screen edge: moving mouse left increases width
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.round(Math.min(Math.max(280, startWidth + delta), 850));
      setSidebarWidth(newWidth);
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        import("@tauri-apps/api/core").then(({ invoke }) => {
          invoke("set_sidebar_width", { width: newWidth });
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      localStorage.setItem("tasksider_sidebar_width", String(sidebarWidth));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

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
        fontFamily: "var(--app-font-family)",
        fontSize: "var(--app-font-size)",
      }}
      className="relative w-full h-screen flex flex-col border-l shadow-2xl overflow-hidden select-none transition-colors duration-200"
    >
      {/* Interactive Left-Border Drag-to-Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize z-40 group select-none hover:bg-[var(--accent)]/15 transition-colors"
        title="Drag left edge to resize sidebar"
      >
        <div className="w-0.5 h-full bg-transparent group-hover:bg-[var(--accent)] transition-colors mx-auto" />
      </div>

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
          syncStatus={syncStatus}
          onStartAuth={startGoogleAuth}
          onDisconnect={disconnectGoogle}
          onSyncNow={syncNow}
          fontId={fontId}
          onChangeFont={setFontId}
          fontSizeId={fontSizeId}
          onChangeFontSize={setFontSizeId}
          customFont={customFont}
          onChangeCustomFont={setCustomFont}
          sidebarWidth={sidebarWidth}
          onChangeSidebarWidth={updateSidebarWidth}
        />
      )}
    </div>
  );
}

export default App;
