import React, { useState } from "react";
import { SyncStatus } from "../types";
import {
  Database,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Share2,
  ExternalLink,
  Info,
} from "lucide-react";

interface CloudSyncSettingsProps {
  syncStatus: SyncStatus;
  onConnect: (url: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export const CloudSyncSettings: React.FC<CloudSyncSettingsProps> = ({
  syncStatus,
  onConnect,
  onDisconnect,
  onSyncNow,
}) => {
  const [urlInput, setUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsSubmitting(true);
    try {
      await onConnect(urlInput.trim());
      setUrlInput("");
    } catch (_) {
      // Error is caught and stored in syncStatus.error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!syncStatus.databaseUrl) return;
    try {
      await navigator.clipboard.writeText(syncStatus.databaseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy URL to clipboard", err);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex items-center gap-1.5 font-medium text-[10px] uppercase tracking-wider"
        style={{ color: "var(--muted)" }}
      >
        <Database size={12} style={{ color: "var(--accent)" }} />
        <span>Firebase Database Sync</span>
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  style={{
                    backgroundColor: "rgba(137, 180, 250, 0.15)",
                    color: "var(--accent)",
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Database size={15} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate leading-tight">
                    Firebase Realtime Database
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                    <CheckCircle2 size={10} className="shrink-0" />
                    <span>Connected & Synced</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onDisconnect}
                style={{ color: "var(--muted)" }}
                className="px-2 py-1 rounded-lg text-[10px] hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                title="Disconnect Firebase database"
              >
                <LogOut size={12} />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Configured Database URL & Share Action */}
            <div
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--hairline)",
              }}
              className="p-2.5 rounded-xl border flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
                  Database Endpoint
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">Live</span>
              </div>

              <div
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--text)",
                }}
                className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono break-all select-all leading-relaxed"
              >
                {syncStatus.databaseUrl}
              </div>

              {/* Share / Copy URL Button */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  style={{
                    backgroundColor: copied ? "rgba(34, 197, 94, 0.15)" : "var(--accent)",
                    color: copied ? "#4ade80" : "var(--bg)",
                  }}
                  className="w-full py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-green-400" />
                      <span>Copied Share URL to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={13} />
                      <span>Share / Copy Database URL</span>
                    </>
                  )}
                </button>
              </div>

              <p style={{ color: "var(--muted)" }} className="text-[9.5px] leading-relaxed">
                Share this URL with anyone you want to collaborate with. When they paste it into their Tasksider Settings, your tasks sync automatically across devices.
              </p>
            </div>

            {/* Sync Now / Last Synced Status */}
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
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <div
                style={{
                  backgroundColor: "rgba(137, 180, 250, 0.15)",
                  color: "var(--accent)",
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              >
                <Database size={15} />
              </div>
              <div className="flex flex-col text-[11px]">
                <span className="font-semibold text-xs leading-tight">
                  Firebase Realtime Database
                </span>
                <span
                  style={{ color: "var(--muted)" }}
                  className="mt-0.5 leading-normal"
                >
                  Store your task database in Firebase or paste a shared URL to collaborate in real-time.
                </span>
              </div>
            </div>

            {/* Database URL Form */}
            <form onSubmit={handleConnect} className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="firebase-url-input"
                  className="text-[10px] font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Firebase Database URL or Shared Link
                </label>
                <input
                  id="firebase-url-input"
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-project-default-rtdb.firebaseio.com/tasks"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--hairline)",
                    color: "var(--text)",
                  }}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border focus:outline-none focus:border-[var(--accent)] font-mono placeholder:font-sans placeholder:text-[var(--muted)]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || syncStatus.syncing || !urlInput.trim()}
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--bg)",
                }}
                className="w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
              >
                {isSubmitting || syncStatus.syncing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Connecting & Syncing…</span>
                  </>
                ) : (
                  <>
                    <Database size={13} />
                    <span>Connect & Sync</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Setup / Help Accordion */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                style={{ color: "var(--muted)" }}
                className="flex items-center gap-1 text-[10px] hover:text-white transition-colors"
              >
                {showGuide ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <span>How to set up or join a shared database</span>
              </button>

              {showGuide && (
                <div
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--hairline)",
                    color: "var(--muted)",
                  }}
                  className="mt-2 p-2.5 rounded-xl border flex flex-col gap-2 text-[10px] leading-relaxed animate-in fade-in duration-100"
                >
                  <div className="flex items-start gap-1.5">
                    <Info size={12} className="shrink-0 text-[var(--accent)] mt-0.5" />
                    <span>
                      <strong className="text-[var(--text)]">Joining someone else:</strong> Paste their shared database URL above and click <em>Connect & Sync</em>.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <ExternalLink size={12} className="shrink-0 text-[var(--accent)] mt-0.5" />
                    <span>
                      <strong className="text-[var(--text)]">Creating your own:</strong> In the Firebase Console, create a free <em>Realtime Database</em>, set Rules to <code>{`{".read": true, ".write": true}`}</code>, and copy its URL.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error notification banner */}
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
