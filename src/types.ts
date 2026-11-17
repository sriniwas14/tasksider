export type Priority = 0 | 1 | 2 | 3;

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  expanded: boolean;
  archived: boolean;
  children: TaskItem[];
  updatedAt?: number;
  deleted?: boolean;
  dueDate?: string; // Format: "YYYY-MM-DD"
  duration?: number; // Target duration in minutes
  timeSpent?: number; // Accumulated time spent in seconds
}

export interface SyncStatus {
  connected: boolean;
  databaseUrl?: string;
  lastSynced?: number;
  syncing: boolean;
  error?: string;
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
  dueDate?: string; // Format: "YYYY-MM-DD"
  duration?: number; // Target duration in minutes
  timeSpent?: number; // Accumulated time spent in seconds
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

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function parseDurationInput(input: string): number | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  const hmMatch = clean.match(
    /^(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?$/
  );
  if (hmMatch) {
    const hours = parseFloat(hmMatch[1]);
    const mins = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
    return Math.round(hours * 60 + mins);
  }

  const mMatch = clean.match(/^(\d+)\s*m(?:in(?:ute)?s?)?$/);
  if (mMatch) {
    return parseInt(mMatch[1], 10);
  }

  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }

  return null;
}
