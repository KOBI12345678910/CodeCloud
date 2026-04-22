import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Database, Download, RotateCcw, Trash2, Clock,
  HardDrive, Shield, RefreshCw, Plus, AlertTriangle, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface Backup {
  id: string;
  projectId: string;
  name: string;
  type: "scheduled" | "manual" | "pre_deploy" | "pre_migration";
  status: "pending" | "running" | "completed" | "failed" | "restoring";
  sizeMb: number;
  retentionDays: number;
  isAutomatic: boolean;
  errorMessage: string | null;
  restoredAt: string | null;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: Backup["status"] }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    completed: { color: "text-green-400", bg: "bg-green-400/10", label: "Completed" },
    running: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Running" },
    pending: { color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending" },
    failed: { color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
    restoring: { color: "text-purple-400", bg: "bg-purple-400/10", label: "Restoring" },
  };
  const c = config[status] || config.pending;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.color} ${c.bg}`}>{c.label}</span>;
}

function TypeBadge({ type }: { type: Backup["type"] }) {
  const config: Record<string, { color: string; bg: string }> = {
    scheduled: { color: "text-blue-400", bg: "bg-blue-400/10" },
    manual: { color: "text-gray-400", bg: "bg-gray-400/10" },
    pre_deploy: { color: "text-green-400", bg: "bg-green-400/10" },
    pre_migration: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  };
  const c = config[type] || config.manual;
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${c.color} ${c.bg}`}>{type.replace("_", " ")}</span>;
}

export default function SettingsBackupsPage() {
  const { theme } = useTheme();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [projectId] = useState("demo-project");
  const [storage, setStorage] = useState<{ usedMb: number; limitMb: number; backupCount: number } | null>(null);
  const [retention, setRetention] = useState<{ retentionDays: number; autoBackupEnabled: boolean; autoBackupInterval: string; nextBackup: string } | null>(null);

  const load = async () => {
    try {
      const [bkpRes, storRes, retRes] = await Promise.all([
        fetch(api(`/database-backups/project/${projectId}`)),
        fetch(api(`/database-backups/project/${projectId}/storage`)),
        fetch(api(`/database-backups/project/${projectId}/retention`)),
      ]);
      if (bkpRes.ok) {
        const d = await bkpRes.json();
        setBackups(d.backups || []);
      }
      if (storRes.ok) setStorage(await storRes.json());
      if (retRes.ok) setRetention(await retRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createBackup = async (type: Backup["type"] = "manual") => {
    setCreating(true);
    try {
      const r = await fetch(api(`/database-backups/${projectId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (r.ok) {
        setTimeout(load, 2500);
      }
    } catch {}
    setCreating(false);
  };

  const restoreBackup = async (id: string) => {
    if (!confirm("Are you sure you want to restore this backup? This will replace current data.")) return;
    setRestoring(id);
    try {
      await fetch(api(`/database-backups/${id}/restore`), { method: "POST" });
      setTimeout(load, 3500);
    } catch {}
    setRestoring(null);
  };

  const deleteBackup = async (id: string) => {
    if (!confirm("Delete this backup permanently?")) return;
    try {
      await fetch(api(`/database-backups/${id}`), { method: "DELETE" });
      load();
    } catch {}
  };

  const dark = theme === "dark";
  const card = dark ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="settings-backups-page">
      <header className={`border-b ${dark ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1000px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Database Backups</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={load}>
              <RefreshCw size={12} /> Refresh
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => createBackup("manual")} disabled={creating}>
              <Plus size={12} /> {creating ? "Creating..." : "New Backup"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={14} className="text-blue-400" />
              <span className="text-xs text-muted-foreground">Storage Used</span>
            </div>
            <div className="text-xl font-bold">{storage ? `${storage.usedMb} MB` : "..."}</div>
            {storage && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((storage.usedMb / storage.limitMb) * 100, 100)}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{storage.backupCount} backups / {storage.limitMb} MB limit</span>
              </div>
            )}
          </div>

          <div className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-green-400" />
              <span className="text-xs text-muted-foreground">Retention Policy</span>
            </div>
            <div className="text-xl font-bold">{retention?.retentionDays || 30} days</div>
            <span className="text-[10px] text-muted-foreground">
              {retention?.autoBackupEnabled ? `Auto-backup ${retention.autoBackupInterval}` : "Manual only"}
            </span>
          </div>

          <div className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-yellow-400" />
              <span className="text-xs text-muted-foreground">Next Scheduled</span>
            </div>
            <div className="text-xl font-bold">
              {retention?.nextBackup ? new Date(retention.nextBackup).toLocaleTimeString() : "..."}
            </div>
            <span className="text-[10px] text-muted-foreground">Point-in-time recovery up to 30 days</span>
          </div>
        </div>

        <div className={`rounded-xl border overflow-hidden ${card}`}>
          <div className="px-4 py-3 border-b border-border/30">
            <span className="text-sm font-semibold">Backup History</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No backups yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {backups.map(backup => (
                <div key={backup.id} className={`flex items-center justify-between px-4 py-3 ${dark ? "hover:bg-[#1c2230]" : "hover:bg-gray-50"} transition-colors`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${backup.status === "completed" ? "bg-green-400/10" : backup.status === "failed" ? "bg-red-400/10" : "bg-blue-400/10"}`}>
                      {backup.status === "completed" ? <CheckCircle size={14} className="text-green-400" /> :
                       backup.status === "failed" ? <AlertTriangle size={14} className="text-red-400" /> :
                       <RefreshCw size={14} className="text-blue-400 animate-spin" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{backup.name}</span>
                        <TypeBadge type={backup.type} />
                        <StatusBadge status={backup.status} />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatTimeAgo(backup.createdAt)} {backup.sizeMb > 0 && `| ${backup.sizeMb} MB`}
                        {backup.restoredAt && <span className="text-purple-400 ml-2">Restored {formatTimeAgo(backup.restoredAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {backup.status === "completed" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => {}}>
                          <Download size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Restore"
                          onClick={() => restoreBackup(backup.id)}
                          disabled={restoring === backup.id}>
                          <RotateCcw size={14} className={restoring === backup.id ? "animate-spin" : ""} />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" title="Delete"
                      onClick={() => deleteBackup(backup.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
