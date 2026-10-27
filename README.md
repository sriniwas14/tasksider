# Tasksider 📋

A modern, fast, cross-platform desktop sidebar task manager built with **Tauri v2**, **React**, **TypeScript**, and **Tailwind CSS**.

Tasksider brings the sleek dark aesthetics and power features of the Quickshell `taskside` Linux desktop widget to **macOS**, **Linux**, and **Windows**.

---

## ✨ Features

- 🪟 **Right-Docked Frameless Drawer**: Stays cleanly anchored to the right edge of your screen with a translucent dark gradient (`#191924` to `#14141c`) and subtle blue accent glow.
- ⚡ **Global Shortcut & Tray**: Toggle anywhere with `Alt+Space` or `Cmd/Ctrl + Shift + T`, click the system tray icon, or execute `tasksider` from your terminal/launcher.
- 🌳 **Deep Hierarchical Subtasks**: Nest tasks indefinitely with instant collapsible branches and live subtask completion rollups (`done/total`).
- 🎯 **Priority Tagging**: Color-coded P0 (Critical), P1 (High), P2 (Normal), and P3 (None) priority badges with matching border and glow tints.
- ⠿ **Drag-and-Drop Reordering**: Smoothly drag tasks to reorder, reparent into subtasks ("drop inside"), or move to the end of the root list.
- 🔍 **Smart Subtree Search**: Search filters tasks while preserving matching paths and ancestors.
- 🔄 **Zero-Config Migration**: Automatically detects and loads tasks from existing `~/.config/taskside/tasks.json` on Linux.
- 💾 **Debounced Autosave**: Changes persist smoothly without disk thrashing to standard OS configuration paths:
  - **Linux**: `~/.config/tasksider/tasks.json`
  - **macOS**: `~/Library/Application Support/tasksider/tasks.json`
  - **Windows**: `%APPDATA%\tasksider\tasks.json`

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 18+)
- [Rust & Cargo](https://rustup.rs/)
- Platform build dependencies (e.g., `libwebkit2gtk-4.1-dev` on Linux, Xcode command line tools on macOS)

### Installation
```bash
git clone https://github.com/your-username/tasksider.git
cd tasksider
bun install
```

### Running Development Server
```bash
bun run tauri dev
```
> **Tip:** You can also run `bun run dev` in pure browser mode for rapid web UI prototyping (uses `localStorage` automatically when running outside Tauri).

### Building Installers
```bash
bun run tauri build
```
Generates native release packages:
- **macOS**: `.app` and `.dmg`
- **Linux**: `.deb`, `.AppImage`, and `.tar.gz`
- **Windows**: `.msi` and `.exe`

---

## ⌨️ Keyboard & Mouse Controls

| Action | Control |
| :--- | :--- |
| **Toggle Sidebar** | `Alt + Space` or `Cmd / Ctrl + Shift + T` (Global) |
| **Close Sidebar** | `Escape` or top-right `×` |
| **Add Root Task** | Type in bottom bar + press `Enter` |
| **Add Subtask** | Hover card + click `+` or Right-Click → "Add subtask" |
| **Rename Task** | Double-click title |
| **Toggle Done** | Click checkbox (cascades done state recursively) |
| **Set Priority** | Right-click task card → Select P0–P3 |
| **Reorder / Reparent** | Drag ⠿ handle: drop above/below or inside a task |
| **Archive Task** | Right-click task card → "Archive" |

---

## 🛠️ Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend**: Tauri v2, Rust (`dirs`, `tauri-plugin-global-shortcut`, `tauri-plugin-single-instance`, `tray-icon`).
- **Persistence**: Single-file JSON atomic store with debounced serialization.
