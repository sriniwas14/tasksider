<div align="center">

# 📋 Tasksider

**A sleek, lightning-fast, cross-platform sidebar task manager.**  
*Native desktop drawer utility built with Tauri v2, React 19, TypeScript, and Tailwind CSS v4.*

[![Build macOS Application](https://github.com/sriniwas14/tasksider/actions/workflows/build-macos.yml/badge.svg)](https://github.com/sriniwas14/tasksider/actions/workflows/build-macos.yml)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Installation](#-installation) • [Shortcuts](#-shortcuts--controls) • [Architecture](#-architecture) • [Building](#-building-from-source)

</div>

---

## 💡 About Tasksider

**Tasksider** brings the minimalist aesthetic and workflow efficiency of Linux Wayland desktop widgets (like Quickshell's `taskside`) to **macOS**, **Linux**, and **Windows**.

Instead of a heavy electron app or a cluttered browser tab, Tasksider lives as a translucent, right-docked drawer that toggles smoothly with a single keystroke (`Alt + Space` or `Cmd/Ctrl + Shift + T`) or from your system tray.

```
┌──────────────────────────────────────────────┐
│  Tasksider                     [ 3 open ] ×  │
│  Tuesday, Oct 27                             │
│  [ ⌕ Search tasks...                       ] │
│ ──────────────────────────────────────────── │
│  [⠿] ▾ [✓] Welcome to Tasksider       [ P0 ] │
│        [⠿] [✓] Subtask 1              [ P1 ] │
│        [⠿] [ ] Subtask 2              [ P2 ] │
│  [⠿]   [ ] Ship Tasksider release     [ P0 ] │
│  [⠿]   [ ] Review PRs                 [ P3 ] │
│                                              │
│  [ + Add a new task... (Enter to add)      ] │
│  Double-click to rename · Drag ⠿ to reorder  │
└──────────────────────────────────────────────┘
```

---

## ✨ Features

- 🪟 **Right-Docked Frameless HUD**: Stays anchored to the right display edge with a dark glass gradient (`#191924` to `#14141c`), cyan/blue accent glow, and custom dark scrollbars.
- ⚡ **Global Shortcuts & Tray**: Toggle anywhere on your desktop with `Alt + Space` or `Cmd / Ctrl + Shift + T`, click the system tray icon, or run `tasksider` from terminal or application launchers.
- 🌳 **Deep Hierarchical Subtasks**: Indefinitely nest subtasks with instant collapsible chevrons (`▸` / `▾`) and live completion rollups (`done/total`).
- 🎯 **P0–P3 Priority System**: Color-coded badges with dynamic card border and glow tinting:
  - <span style="color:#ff5555">●</span> **P0 · Critical** (`#ff5555`)
  - <span style="color:#ff9f43">●</span> **P1 · High** (`#ff9f43`)
  - <span style="color:#f2c94c">●</span> **P2 · Normal** (`#f2c94c`)
  - <span style="color:#6b7280">●</span> **P3 · None** (`#6b7280`)
- ⠿ **Drag-and-Drop Reordering**: Drag cards to reorder, reparent inside another task as a subtask, or drop at the bottom to move to the root end.
- 🔍 **Subtree-Preserving Search**: Live search filters tasks while intelligently keeping matched paths and ancestor hierarchy visible.
- 🔄 **Zero-Config Linux Migration**: Automatically imports existing tasks from `~/.config/taskside/tasks.json` on first run if found.
- 💾 **Debounced Atomic Autosave**: Updates persist instantly without disk thrashing to standard OS application paths.

---

## 📥 Installation

### macOS
Download the latest Universal `.dmg` from [GitHub Releases](https://github.com/sriniwas14/tasksider/releases) or the [Actions Artifacts](https://github.com/sriniwas14/tasksider/actions).
1. Open `Tasksider_universal.dmg`.
2. Drag `Tasksider.app` into `/Applications`.
3. *Note on macOS Gatekeeper:* If macOS prompts that the developer cannot be verified (unsigned binary):
   ```bash
   xattr -cr /Applications/Tasksider.app
   ```

### Linux
Download the `.AppImage` or `.deb` from the [Releases](https://github.com/sriniwas14/tasksider/releases) page:
```bash
chmod +x Tasksider_amd64.AppImage
./Tasksider_amd64.AppImage
```

---

## ⌨️ Shortcuts & Controls

| Action | Shortcut / Control |
| :--- | :--- |
| **Toggle Sidebar** | `Alt + Space` or `Cmd / Ctrl + Shift + T` (Global) |
| **Close Sidebar** | `Escape` or top-right `×` |
| **Add Root Task** | Type in bottom bar and press `Enter` |
| **Add Subtask** | Hover card & click `+` or Right-Click → "Add subtask" |
| **Rename Task** | Double-click title |
| **Toggle Done** | Click checkbox (cascades recursively to subtasks) |
| **Set Priority** | Right-click card → select P0, P1, P2, or P3 |
| **Reorder / Reparent** | Drag ⠿ handle: drop above/below or inside a task |
| **Archive Task** | Right-click card → "Archive" (view with "Show Archived") |
| **Delete Task** | Right-click card → "Delete" |

---

## 📂 Data Storage Locations

Tasks are stored in a human-readable, plain-text `tasks.json` file:

| Operating System | Path |
| :--- | :--- |
| **Linux** | `~/.config/tasksider/tasks.json` |
| **macOS** | `~/Library/Application Support/tasksider/tasks.json` |
| **Windows** | `%APPDATA%\tasksider\tasks.json` |

---

## 🛠️ Architecture

```
tasksider/
├── .github/workflows/
│   └── build-macos.yml        # CI/CD: Universal macOS DMG/App build
├── src/
│   ├── components/
│   │   ├── Header.tsx         # Title, search pill, and open count badge
│   │   ├── TaskTree.tsx       # Drag-and-drop container & drop zones
│   │   ├── TaskCard.tsx       # Individual task row with priority tinting
│   │   └── PriorityMenu.tsx   # Right-click context menu
│   ├── store/
│   │   └── taskStore.ts       # Recursive tree traversal & debounced save
│   ├── types.ts               # Task models & priority color tokens
│   ├── App.tsx                # Main sidebar frame & keyboard listeners
│   └── index.css              # Tailwind v4 styles & dark scrollbars
└── src-tauri/
    ├── src/
    │   ├── lib.rs             # Screen docking, system tray, & persistence
    │   └── main.rs            # Binary entrypoint
    ├── tauri.conf.json        # Frameless translucent window configuration
    └── Cargo.toml             # Tauri v2, tray-icon, global-shortcut
```

---

## 🚀 Building from Source

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 18+)
- [Rust & Cargo](https://rustup.rs/)
- Linux build dependencies (if building on Linux):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
  ```

### Development
```bash
# Clone the repository
git clone https://github.com/sriniwas14/tasksider.git
cd tasksider

# Install dependencies
bun install

# Run desktop dev environment
bun run tauri dev
```

> **Pro Tip:** You can also run `bun run dev` in pure browser mode for rapid web UI prototyping (automatically uses `localStorage` outside of Tauri).

### Production Build
```bash
bun run tauri build
```
Binaries are placed in `src-tauri/target/release/bundle/`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
