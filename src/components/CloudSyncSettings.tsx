import React, { useState } from "react";
import { SyncStatus } from "../types";
import {
  Cloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface CloudSyncSettingsProps {
  syncStatus: SyncStatus;
  onStartAuth: (clientId?: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export const CloudSyncSettings: React.FC<CloudSyncSettingsProps> = ({
  syncStatus,
  onStartAuth,
  onDisconnect,
  onSyncNow,
}) => {
  const [customClientId, setCustomClientId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 30) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const handleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await onStartAuth(customClientId.trim() || undefined);
    } catch (_) {
      // Error handled via syncStatus.error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex items-center gap-1.5 font-medium text-[10px] uppercase tracking-wider"
        style={{ color: "var(--muted)" }}
      >
        <Cloud size={12} style={{ color: "var(--accent)" }} />
        <span>Cloud Synchronization</span>
      </div>

      <div
        style={{
          backgroundColor: "var(--input)",
          borderColor: "var(--hairline)",
        }}
        className="p-3 rounded-xl border flex flex-col gap-3"
      >
        {syncStatus.connected ? (
          /* Connected State */
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  style={{
                    backgroundColor: "rgba(137, 180, 250, 0.15)",
                    color: "var(--accent)",
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Cloud size={15} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate leading-tight">
                    {syncStatus.email || "Google Account"}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                    <CheckCircle2 size={10} className="shrink-0" />
                    <span>Connected to Drive AppData</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onDisconnect}
                style={{ color: "var(--muted)" }}
                className="px-2 py-1 rounded-lg text-[10px] hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                title="Disconnect Google Account"
              >
                <LogOut size={12} />
                <span>Disconnect</span>
              </button>
            </div>

            <div
              style={{
                borderColor: "var(--hairline)",
                color: "var(--muted)",
              }}
              className="pt-2 border-t flex items-center justify-between text-[11px]"
            >
              <span>Last synced: {formatRelativeTime(syncStatus.lastSynced)}</span>

              <button
                type="button"
                disabled={syncStatus.syncing}
                onClick={onSyncNow}
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
                className="px-2.5 py-1 rounded-lg font-medium text-[10px] flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RefreshCw
                  size={11}
                  className={syncStatus.syncing ? "animate-spin" : ""}
                />
                <span>{syncStatus.syncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <div
                style={{
                  backgroundColor: "rgba(137, 180, 250, 0.15)",
                  color: "var(--accent)",
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              >
                <Cloud size={15} />
              </div>
              <div className="flex flex-col text-[11px]">
                <span className="font-semibold text-xs leading-tight">
                  Google Drive AppData Sync
                </span>
                <span
                  style={{ color: "var(--muted)" }}
                  className="mt-0.5 leading-normal"
                >
                  Sync your tasks seamlessly across devices without dealing with
                  API keys. Stored privately in your Drive.
                </span>
              </div>
            </div>

            {/* Sign in with Google Button */}
            <button
              type="button"
              disabled={isSubmitting || syncStatus.syncing}
              onClick={handleSignIn}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--bg)",
              }}
              className="w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              {isSubmitting || syncStatus.syncing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Connecting in Browser…</span>
                </>
              ) : (
                <>
                  {/* Google "G" Logo SVG */}
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Privacy Note */}
            <div
              style={{ color: "var(--muted)" }}
              className="flex items-center gap-1.5 text-[9px] px-1"
            >
              <ShieldCheck size={11} className="shrink-0 text-emerald-400" />
              <span>
                Zero access to your personal files. Only stores tasks.json.
              </span>
            </div>

            {/* Advanced: Custom Client ID Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ color: "var(--muted)" }}
                className="flex items-center gap-1 text-[10px] hover:text-white transition-colors"
              >
                {showAdvanced ? (
                  <ChevronDown size={11} />
                ) : (
                  <ChevronRight size={11} />
                )}
                <span>Advanced: Custom Client ID</span>
              </button>

              {showAdvanced && (
                <div className="mt-2 flex flex-col gap-1.5 animate-in fade-in duration-100">
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="Custom Google Desktop Client ID (optional)"
                    style={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--hairline)",
                      color: "var(--text)",
                    }}
                    className="w-full px-2.5 py-1.5 text-[10px] rounded-lg border focus:outline-none focus:border-[var(--accent)] font-mono placeholder:font-sans placeholder:text-[var(--muted)]"
                  />
                  <p style={{ color: "var(--muted)" }} className="text-[9px]">
                    Leave blank to use Tasksider's built-in OAuth configuration.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error notification banner if any */}
        {syncStatus.error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-start gap-1.5">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{syncStatus.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
