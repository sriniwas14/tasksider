import { useState, useEffect, useRef, useCallback } from "react";
import { TaskItem, FlatRow, Priority, DropPosition, DragState } from "../types";

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

  // Compute rows, counts, and stats
  const rebuild = useCallback((): { rows: FlatRow[]; topRows: FlatRow[]; openCount: number } => {
    let open = 0;
    function countOpen(list: TaskItem[]) {
      for (const t of list) {
        if (!t.archived && !t.done) open++;
        countOpen(t.children);
      }
    }
    countOpen(tasks);

    const q = query.trim().toLowerCase();
    function matchTitle(t: TaskItem): boolean {
      return !q || (t.title || "").toLowerCase().includes(q);
    }
    function hasMatch(t: TaskItem): boolean {
      if (matchTitle(t)) return true;
      for (const c of t.children) {
        if (hasMatch(c)) return true;
      }
      return false;
    }

    function stats(t: TaskItem): { done: number; total: number } {
      let done = 0;
      let total = 0;
      for (const c of t.children) {
        if (!showArchived && c.archived) continue;
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
        const sa = stats(a);
        out.push({
          id: a.id,
          title: a.title,
          done: a.done,
          priority: a.priority,
          expanded: true,
          archived: !!a.archived,
          depth,
          rootId,
          hasChildren: a.children.length > 0,
          doneCount: sa.done,
          totalCount: sa.total,
        });
        pushAll(a.children, depth + 1, rootId);
      }
    }

    function walk(list: TaskItem[], depth: number, rootId: string) {
      for (const t of list) {
        if (!showArchived && t.archived) continue;
        const rid = depth === 0 ? t.id : rootId;
        const st = stats(t);
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
            hasChildren: t.children.length > 0,
            doneCount: st.done,
            totalCount: st.total,
          });
          if (t.expanded) walk(t.children, depth + 1, rid);
        } else {
          if (!hasMatch(t)) continue;
          out.push({
            id: t.id,
            title: t.title,
            done: t.done,
            priority: t.priority,
            expanded: true,
            archived: !!t.archived,
            depth,
            rootId: rid,
            hasChildren: t.children.length > 0,
            doneCount: st.done,
            totalCount: st.total,
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
    return { rows: out, topRows, openCount: open };
  }, [tasks, query, showArchived]);

  const { rows, topRows, openCount } = rebuild();

  // Task Actions
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
      function setDoneRecursive(t: TaskItem, v: boolean) {
        t.done = v;
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
    [updateTasks]
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
        }
        return list;
      });
    },
    [updateTasks]
  );

  const removeTask = useCallback(
    (id: string) => {
      updateTasks((list) => {
        const r = findNode(id, list);
        if (r) {
          r.list.splice(r.index, 1);
        }
        return list;
      });
    },
    [updateTasks]
  );

  const archiveTask = useCallback(
    (id: string) => {
      function setArchivedRecursive(t: TaskItem, v: boolean) {
        t.archived = v;
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
          list.push(node);
          success = true;
          return list;
        }

        const tgt = findNode(targetId, list);
        if (!tgt) return list;

        const [node] = src.list.splice(src.index, 1);

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

  return {
    tasks,
    rows,
    topRows,
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
    expand,
    setPriority,
    renameTask,
    removeTask,
    archiveTask,
    unarchiveTask,
    moveTask,
    isDescendant,
  };
}
