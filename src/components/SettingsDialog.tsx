import React, { useEffect } from "react";
import { Theme } from "../themes";
import { ThemeCombobox } from "./ThemeCombobox";
import { X, Sliders, Palette, Command, Radio, CheckCircle2 } from "lucide-react";

interface SettingsDialogProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preferences"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--hairline-bright)",
          color: "var(--text)",
        }}
        className="w-full max-w-sm rounded-2xl border shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 relative"
      >
        {/* Header */}
        <div
          style={{ borderColor: "var(--hairline)" }}
          className="flex items-center justify-between px-4 py-3 border-b"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            >
              <Sliders size={15} />
            </div>
            <div>
              <h2 className="font-semibold text-xs leading-tight">Preferences</h2>
              <p style={{ color: "var(--muted)" }} className="text-[10px]">
                Theme & sidebar configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "var(--muted)" }}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            title="Close Settings (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 flex flex-col gap-3.5 text-xs">
          {/* Section: Theme / Appearance */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-1.5 font-medium text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              <Palette size={12} style={{ color: "var(--accent)" }} />
              <span>Appearance</span>
            </div>
            <p
              style={{ color: "var(--muted)" }}
              className="text-[11px] -mt-1 leading-normal"
            >
              Select your color palette:
            </p>
            <ThemeCombobox
              currentTheme={currentTheme}
              onSelectTheme={onSelectTheme}
            />
          </div>

          {/* Section: Global Shortcuts */}
          <div
            className="flex flex-col gap-2 pt-2.5 border-t"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div
              className="flex items-center gap-1.5 font-medium text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              <Command size={12} style={{ color: "var(--accent)" }} />
              <span>Keyboard Shortcuts</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div
                style={{
                  backgroundColor: "var(--input)",
                  borderColor: "var(--hairline)",
                }}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between"
              >
                <span className="text-[11px]">Toggle Sidebar</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                    Alt
                  </kbd>
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                    +
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                    Space
                  </kbd>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--input)",
                  borderColor: "var(--hairline)",
                }}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between"
              >
                <span className="text-[11px]">Alternative Toggle</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                    Ctrl/Cmd
                  </kbd>
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                    +
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                    Shift
                  </kbd>
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                    +
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                    T
                  </kbd>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--input)",
                  borderColor: "var(--hairline)",
                }}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between"
              >
                <span className="text-[11px]">Hide / Close Modal</span>
                <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[9px]">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          {/* Section: Background Daemon */}
          <div
            className="flex flex-col gap-2 pt-2.5 border-t"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div
              className="flex items-center gap-1.5 font-medium text-[10px] uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              <Radio size={12} style={{ color: "var(--accent)" }} />
              <span>Background Daemon</span>
            </div>
            <div
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--hairline)",
              }}
              className="p-2.5 rounded-lg border flex items-start gap-2 text-[11px]"
            >
              <CheckCircle2
                size={14}
                className="shrink-0 mt-0.5"
                style={{ color: "var(--accent)" }}
              />
              <span style={{ color: "var(--muted)" }} className="leading-snug">
                Tasksider runs in the system tray. Closing the window or pressing
                Escape minimizes it to the background for instant toggling.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderColor: "var(--hairline)",
            color: "var(--muted)",
          }}
          className="px-4 py-2 border-t text-[10px] flex items-center justify-between"
        >
          <span className="font-mono text-[9px] opacity-70">Tasksider v0.1.0</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
            }}
            className="px-3 py-1 rounded-lg font-semibold text-[11px] transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
