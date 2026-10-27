export type Priority = 0 | 1 | 2 | 3;

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  expanded: boolean;
  archived: boolean;
  children: TaskItem[];
}

export interface FlatRow {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  expanded: boolean;
  archived: boolean;
  depth: number;
  rootId: string;
  hasChildren: boolean;
  doneCount: number;
  totalCount: number;
}

export type DropPosition = "before" | "after" | "inside" | "root_bottom";

export interface DragState {
  taskId: string;
  taskTitle: string;
  taskPriority: Priority;
  targetId: string;
  position: DropPosition | "";
}

export const PRIO_COLORS: Record<Priority, string> = {
  0: "#ff5555",
  1: "#ff9f43",
  2: "#f2c94c",
  3: "#6b7280",
};

export const PRIO_LABELS: Record<Priority, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
  3: "P3",
};

export const PRIO_FULL_LABELS: Record<Priority, string> = {
  0: "P0 · Critical",
  1: "P1 · High",
  2: "P2 · Normal",
  3: "P3 · None",
};
