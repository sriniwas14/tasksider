import { useState, useEffect, useRef, useCallback } from "react";
import { TaskItem, FlatRow, Priority, DropPosition, DragState, SyncStatus } from "../types";

// Tauri API dynamic check to allow development in browser as well
let invoke: any = null;
try {
  import("@tauri-apps/api/core").then((module) => {
    invoke = module.invoke;
  });
} catch (_) {
  // web mode
}

function uid(): string {
  return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

function mk(title: string): TaskItem {
  return {
    id: uid(),
    title,
    done: false,
    priority: 3,
    expanded: true,
    archived: false,
    children: [],
    updatedAt: Date.now(),
  };
}

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: "welcome-1",
    title: "Welcome to Tasksider",
    done: false,
    priority: 0,
    expanded: true,
    archived: false,
    children: [
      {
        id: "sub-1",
        title: "Right-click a task to set priority or options",
        done: false,
        priority: 1,
        expanded: true,
        archived: false,
        children: [],
      },
      {
        id: "sub-2",
        title: "Click ▸ to collapse subtasks",
        done: false,
        priority: 2,
        expanded: true,
        archived: false,
        children: [],
      },
    ],
  },
  {
    id: "welcome-2",
    title: "Add your first task above",
    done: false,
    priority: 3,
    expanded: true,
    archived: false,
    children: [],
  },
];

interface NodeLookup {
  node: TaskItem;
  parent: TaskItem | null;
  list: TaskItem[];
  index: number;
}

function findNode(id: string, list: TaskItem[], parent: TaskItem | null = null): NodeLookup | null {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return { node: list[i], parent, list, index: i };
    }
    const res = findNode(id, list[i].children, list[i]);
    if (res) return res;
  }
  return null;
}

function ensureArchived(list: TaskItem[]) {
  for (const item of list) {
    if (item.archived === undefined) item.archived = false;
    if (item.children) ensureArchived(item.children);
  }
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showFutureTasks, setShowFutureTasksState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tasksider_show_future") === "true";
    } catch (_) {
      return false;
    }
  });

  const setShowFutureTasks = useCallback(
    (valueOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      setShowFutureTasksState((prev) => {
        const next =
          typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
        try {
          localStorage.setItem("tasksider_show_future", String(next));
        } catch (_) {}
        return next;
      });
    },
    []
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("tasksider_active_task_id") || null;
    } catch (_) {
      return null;
    }
  });

  const [activeTimerStart, setActiveTimerStart] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("tasksider_active_timer_start");
      return saved ? Number(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [activeElapsed, setActiveElapsed] = useState<number>(0);

  // 1-second live ticker effect for running timer
  useEffect(() => {
    if (!activeTaskId || !activeTimerStart) {
      setActiveElapsed(0);
      return;
    }

    const calcElapsed = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - activeTimerStart) / 1000));
      setActiveElapsed(diffSec);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTaskId, activeTimerStart]);

  const [dragState, setDragState] = useState<DragState>({
    taskId: "",
    taskTitle: "",
    taskPriority: 3,
    targetId: "",
    position: "",
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded = useRef(false);

  // Load tasks on mount
  useEffect(() => {
    async function load() {
      try {
        let loaded: TaskItem[] | null = null;
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
          invoke = tauriInvoke;
          const raw = await invoke("load_tasks");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.tasks)) {
              loaded = parsed.tasks;
            }
          }
        } else {
          // LocalStorage fallback for browser development
          const local = localStorage.getItem("tasksider_tasks");
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed && Array.isArray(parsed.tasks)) {
              loaded = parsed.tasks;
            }
          }
        }

        if (loaded && loaded.length > 0) {
          ensureArchived(loaded);
          setTasks(loaded);
        } else {
          setTasks(DEFAULT_TASKS);
        }
      } catch (err) {
        console.warn("Tasksider: could not load tasks, using defaults", err);
        setTasks(DEFAULT_TASKS);
      } finally {
        isLoaded.current = true;
      }
    }
    load();
  }, []);

  // Debounced auto-save
  const scheduleSave = useCallback((updatedTasks: TaskItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const payload = JSON.stringify({ tasks: updatedTasks });
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
          await tauriInvoke("save_tasks", { data: payload });
        } else {
          localStorage.setItem("tasksider_tasks", payload);
        }
      } catch (e) {
        console.warn("Tasksider save failed: ", e);
      }
    }, 400);
  }, []);

  const updateTasks = useCallback(
    (fn: (prev: TaskItem[]) => TaskItem[]) => {
      setTasks((prev) => {
        const next = fn(JSON.parse(JSON.stringify(prev)));
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

  // Compute rows, counts, and stats
  const rebuild = useCallback((): {
    rows: FlatRow[];
    topRows: FlatRow[];
    openCount: number;
    futureCount: number;
  } => {
    const todayStr = getTodayDateString();

    function isFutureTask(t: TaskItem): boolean {
      return !!(t.dueDate && t.dueDate > todayStr);
    }

    let open = 0;
    function countOpen(list: TaskItem[]) {
      for (const t of list) {
        if (!t.archived && !t.done) {
          if (showFutureTasks || !isFutureTask(t)) {
            open++;
          }
        }
        if (showFutureTasks || !isFutureTask(t)) {
          countOpen(t.children);
        }
      }
    }
    countOpen(tasks);

    let futureCount = 0;
    function countFuture(list: TaskItem[]) {
      for (const t of list) {
        if (!t.archived && !t.done && isFutureTask(t)) {
          futureCount++;
        }
        countFuture(t.children);
      }
    }
    countFuture(tasks);

    const q = query.trim().toLowerCase();
    function matchTitle(t: TaskItem): boolean {
      return !q || (t.title || "").toLowerCase().includes(q);
    }
    function hasQueryMatch(t: TaskItem): boolean {
      if (matchTitle(t)) return true;
      for (const c of t.children) {
        if (!showArchived && c.archived) continue;
        if (!showFutureTasks && isFutureTask(c)) continue;
        if (hasQueryMatch(c)) return true;
      }
      return false;
    }

    function stats(t: TaskItem): { done: number; total: number } {
      let done = 0;
      let total = 0;
      for (const c of t.children) {
        if (!showArchived && c.archived) continue;
        if (!showFutureTasks && isFutureTask(c)) continue;
        total++;
        if (c.done) done++;
        const s = stats(c);
        done += s.done;
        total += s.total;
      }
      return { done, total };
    }

    const out: FlatRow[] = [];

    function pushAll(list: TaskItem[], depth: number, rootId: string) {
      for (const a of list) {
        if (!showArchived && a.archived) continue;
        if (!showFutureTasks && isFutureTask(a)) continue;
        const sa = stats(a);
        const visibleChildren = a.children.filter((c) => {
          if (!showArchived && c.archived) return false;
          if (!showFutureTasks && isFutureTask(c)) return false;
          return true;
        });
        out.push({
          id: a.id,
          title: a.title,
          done: a.done,
          priority: a.priority,
          expanded: true,
          archived: !!a.archived,
          depth,
          rootId,
          hasChildren: visibleChildren.length > 0,
          doneCount: sa.done,
          totalCount: sa.total,
          dueDate: a.dueDate,
          duration: a.duration,
          timeSpent: a.timeSpent,
        });
        pushAll(a.children, depth + 1, rootId);
      }
    }

    function walk(list: TaskItem[], depth: number, rootId: string) {
      for (const t of list) {
        if (!showArchived && t.archived) continue;
        if (!showFutureTasks && isFutureTask(t)) continue;
        const rid = depth === 0 ? t.id : rootId;
        const st = stats(t);
        const visibleChildren = t.children.filter((c) => {
          if (!showArchived && c.archived) return false;
          if (!showFutureTasks && isFutureTask(c)) return false;
          return true;
        });
        const hasChildren = visibleChildren.length > 0;

        if (!q) {
          out.push({
            id: t.id,
            title: t.title,
            done: t.done,
            priority: t.priority,
            expanded: t.expanded,
            archived: !!t.archived,
            depth,
            rootId: rid,
            hasChildren,
            doneCount: st.done,
            totalCount: st.total,
            dueDate: t.dueDate,
            duration: t.duration,
            timeSpent: t.timeSpent,
          });
          if (t.expanded) walk(t.children, depth + 1, rid);
        } else {
          if (!hasQueryMatch(t)) continue;
          out.push({
            id: t.id,
            title: t.title,
            done: t.done,
            priority: t.priority,
            expanded: true,
            archived: !!t.archived,
            depth,
            rootId: rid,
            hasChildren,
            doneCount: st.done,
            totalCount: st.total,
            dueDate: t.dueDate,
            duration: t.duration,
            timeSpent: t.timeSpent,
          });
          if (matchTitle(t)) {
            pushAll(t.children, depth + 1, rid);
          } else {
            walk(t.children, depth + 1, rid);
          }
        }
      }
    }

    walk(tasks, 0, "");
    const topRows = out.filter((r) => r.depth === 0);
    return { rows: out, topRows, openCount: open, futureCount };
  }, [tasks, query, showArchived, showFutureTasks]);

  const { rows, topRows, openCount, futureCount } = rebuild();

  // Task Actions
  const stopTimer = useCallback(() => {
    if (!activeTaskId || !activeTimerStart) {
      setActiveTaskId(null);
      setActiveTimerStart(null);
      setActiveElapsed(0);
      try {
        localStorage.removeItem("tasksider_active_task_id");
        localStorage.removeItem("tasksider_active_timer_start");
      } catch (_) {}
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeTimerStart) / 1000));
    const currentActiveId = activeTaskId;

    setActiveTaskId(null);
    setActiveTimerStart(null);
    setActiveElapsed(0);
    try {
      localStorage.removeItem("tasksider_active_task_id");
      localStorage.removeItem("tasksider_active_timer_start");
    } catch (_) {}

    if (elapsedSeconds > 0) {
      updateTasks((list) => {
        const r = findNode(currentActiveId, list);
        if (r) {
          r.node.timeSpent = (r.node.timeSpent || 0) + elapsedSeconds;
          r.node.updatedAt = Date.now();
        }
        return list;
      });
    }
  }, [activeTaskId, activeTimerStart, updateTasks]);

  const startTimer = useCallback(
    (taskId: string) => {
      if (activeTaskId === taskId) return;

      if (activeTaskId && activeTimerStart) {
        const elapsed = Math.max(0, Math.floor((Date.now() - activeTimerStart) / 1000));
        if (elapsed > 0) {
          const oldId = activeTaskId;
          updateTasks((list) => {
            const r = findNode(oldId, list);
            if (r) {
              r.node.timeSpent = (r.node.timeSpent || 0) + elapsed;
              r.node.updatedAt = Date.now();
            }
            return list;
          });
        }
      }

      const now = Date.now();
      setActiveTaskId(taskId);
      setActiveTimerStart(now);
      setActiveElapsed(0);
      try {
        localStorage.setItem("tasksider_active_task_id", taskId);
        localStorage.setItem("tasksider_active_timer_start", String(now));
      } catch (_) {}
    },
    [activeTaskId, activeTimerStart, updateTasks]
  );

  const setDuration = useCallback(
    (id: string, minutes?: number) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.node.duration = minutes && minutes > 0 ? minutes : undefined;
          r.node.updatedAt = Date.now();
        }
        return list;
      });
    },
    [updateTasks]
  );

  const addTask = useCallback(
    (title: string, parentId?: string): string => {
      const clean = (title || "").trim();
      if (!clean) return "";
      const t = mk(clean);
      updateTasks((list) => {
        if (!parentId) {
          list.push(t);
        } else {
          const r = findNode(parentId, list);
          if (r) {
            if (r.node.archived) t.archived = true;
            r.node.children.push(t);
            r.node.expanded = true;
          }
        }
        return list;
      });
      return t.id;
    },
    [updateTasks]
  );

  const toggleDone = useCallback(
    (id: string) => {
      if (activeTaskId === id) {
        stopTimer();
      }
      function setDoneRecursive(t: TaskItem, v: boolean) {
        t.done = v;
        t.updatedAt = Date.now();
        for (const c of t.children) setDoneRecursive(c, v);
      }
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          setDoneRecursive(r.node, !r.node.done);
        }
        return list;
      });
    },
    [activeTaskId, stopTimer, updateTasks]
  );

  const toggleExpanded = useCallback(
    (id: string) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.node.expanded = !r.node.expanded;
        }
        return list;
      });
    },
    [updateTasks]
  );

  const expand = useCallback(
    (id: string) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r && !r.node.expanded) {
          r.node.expanded = true;
        }
        return list;
      });
    },
    [updateTasks]
  );

  const setPriority = useCallback(
    (id: string, priority: Priority) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.node.priority = priority;
          r.node.updatedAt = Date.now();
        }
        return list;
      });
    },
    [updateTasks]
  );

  const setDueDate = useCallback(
    (id: string, dueDate?: string) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.node.dueDate = dueDate ? dueDate.trim() : undefined;
          r.node.updatedAt = Date.now();
        }
        return list;
      });
    },
    [updateTasks]
  );

  const renameTask = useCallback(
    (id: string, title: string) => {
      const clean = (title || "").trim();
      if (!clean) return;
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r && r.node.title !== clean) {
          r.node.title = clean;
          r.node.updatedAt = Date.now();
        }
        return list;
      });
    },
    [updateTasks]
  );

  const removeTask = useCallback(
    (id: string) => {
      if (activeTaskId === id) {
        stopTimer();
      }
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.list.splice(r.index, 1);
        }
        return list;
      });
    },
    [activeTaskId, stopTimer, updateTasks]
  );

  const archiveTask = useCallback(
    (id: string) => {
      function setArchivedRecursive(t: TaskItem, v: boolean) {
        t.archived = v;
        t.updatedAt = Date.now();
        for (const c of t.children) setArchivedRecursive(c, v);
      }
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) setArchivedRecursive(r.node, true);
        return list;
      });
    },
    [updateTasks]
  );

  const unarchiveTask = useCallback(
    (id: string) => {
      function setArchivedRecursive(t: TaskItem, v: boolean) {
        t.archived = v;
        t.updatedAt = Date.now();
        for (const c of t.children) setArchivedRecursive(c, v);
      }
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) setArchivedRecursive(r.node, false);
        return list;
      });
    },
    [updateTasks]
  );

  const isDescendant = useCallback(
    (parentId: string, targetId: string): boolean => {
      if (!parentId || !targetId) return false;
      const p = findNode(parentId, tasks);
      if (!p) return false;
      function search(node: TaskItem): boolean {
        if (node.id === targetId) return true;
        for (const c of node.children) {
          if (search(c)) return true;
        }
        return false;
      }
      for (const c of p.node.children) {
        if (search(c)) return true;
      }
      return false;
    },
    [tasks]
  );

  const moveTask = useCallback(
    (sourceId: string, targetId: string, position: DropPosition): boolean => {
      if (!sourceId || sourceId === targetId) return false;
      if (targetId && isDescendant(sourceId, targetId)) return false;

      let success = false;
      updateTasks((list) => {
        const src = findNode(sourceId, list);
        if (!src) return list;

        if (targetId === "ROOT_END" || position === "root_bottom") {
          const [node] = src.list.splice(src.index, 1);
          node.updatedAt = Date.now();
          list.push(node);
          success = true;
          return list;
        }

        const tgt = findNode(targetId, list);
        if (!tgt) return list;

        const [node] = src.list.splice(src.index, 1);
        node.updatedAt = Date.now();

        if (position === "inside") {
          tgt.node.children.push(node);
          tgt.node.expanded = true;
          success = true;
        } else {
          let targetIndex = tgt.index;
          if (src.list === tgt.list && src.index < tgt.index) {
            targetIndex--;
          }
          const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
          tgt.list.splice(insertIndex, 0, node);
          success = true;
        }

        return list;
      });

      setDragState({
        taskId: "",
        taskTitle: "",
        taskPriority: 3,
        targetId: "",
        position: "",
      });

      return success;
    },
    [isDescendant, updateTasks]
  );

  const startDrag = useCallback((id: string, title: string, priority: Priority) => {
    setDragState({
      taskId: id,
      taskTitle: title,
      taskPriority: priority,
      targetId: "",
      position: "",
    });
  }, []);

  const updateDragTarget = useCallback((targetId: string, position: DropPosition | "") => {
    setDragState((prev) => ({
      ...prev,
      targetId,
      position,
    }));
  }, []);

  const cancelDrag = useCallback(() => {
    setDragState({
      taskId: "",
      taskTitle: "",
      taskPriority: 3,
      targetId: "",
      position: "",
    });
  }, []);

  // --- Cloud Sync State & Operations ---
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    syncing: false,
  });

  const refreshSyncStatus = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
        const status = await tauriInvoke<SyncStatus>("get_sync_status");
        setSyncStatus(status);
      }
    } catch (e) {
      console.warn("Could not fetch sync status", e);
    }
  }, []);

  // Check sync status on mount
  useEffect(() => {
    refreshSyncStatus();
  }, [refreshSyncStatus]);

  const connectFirebase = useCallback(
    async (url: string) => {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: undefined }));
      try {
        const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
        const status = await tauriInvoke<SyncStatus>("set_firebase_url", {
          url: url.trim(),
        });
        setSyncStatus(status);

        // Reload tasks after initial sync
        const raw = await tauriInvoke<string>("load_tasks");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.tasks)) {
            ensureArchived(parsed.tasks);
            setTasks(parsed.tasks);
          }
        }
      } catch (err: any) {
        setSyncStatus((prev) => ({
          ...prev,
          syncing: false,
          error: typeof err === "string" ? err : err?.message || String(err),
        }));
        throw err;
      }
    },
    []
  );

  const disconnectFirebase = useCallback(async () => {
    try {
      const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
      const status = await tauriInvoke<SyncStatus>("disconnect_firebase");
      setSyncStatus(status);
    } catch (e) {
      console.warn("Could not disconnect Firebase", e);
    }
  }, []);

  const syncNow = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setSyncStatus((prev) => ({ ...prev, syncing: true, error: undefined }));
      }
      try {
        const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
        const updatedJson = await tauriInvoke<string | null>("sync_tasks_now");
        if (updatedJson) {
          const parsed = JSON.parse(updatedJson);
          if (parsed && Array.isArray(parsed.tasks)) {
            ensureArchived(parsed.tasks);
            setTasks(parsed.tasks);
          }
        }
        await refreshSyncStatus();
      } catch (err: any) {
        if (!quiet) {
          setSyncStatus((prev) => ({
            ...prev,
            syncing: false,
            error: typeof err === "string" ? err : err?.message || String(err),
          }));
          throw err;
        }
      }
    },
    [refreshSyncStatus]
  );

  // Background polling to automatically catch collaborator changes
  useEffect(() => {
    if (!syncStatus.connected) return;

    const interval = setInterval(() => {
      syncNow(true).catch(() => {});
    }, 25000);

    const onFocus = () => {
      syncNow(true).catch(() => {});
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncStatus.connected, syncNow]);

  return {
    tasks,
    rows,
    topRows,
    openCount,
    futureCount,
    query,
    setQuery,
    showArchived,
    setShowArchived,
    showFutureTasks,
    setShowFutureTasks,
    activeTaskId,
    activeElapsed,
    startTimer,
    stopTimer,
    setDuration,
    dragState,
    startDrag,
    updateDragTarget,
    cancelDrag,
    addTask,
    toggleDone,
    toggleExpanded,
    expand,
    setPriority,
    setDueDate,
    renameTask,
    removeTask,
    archiveTask,
    unarchiveTask,
    moveTask,
    isDescendant,
    syncStatus,
    syncNow,
    connectFirebase,
    disconnectFirebase,
    refreshSyncStatus,
  };
}
