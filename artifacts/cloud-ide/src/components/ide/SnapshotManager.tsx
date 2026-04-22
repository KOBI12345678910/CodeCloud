import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, RotateCcw, Trash2, Plus, X, RefreshCw, Clock, HardDrive, FileText, ChevronDown, ChevronRight, Zap, Timer, Rocket, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SnapshotItem {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: "creating" | "ready" | "restoring" | "failed" | "deleted";
  trigger: "manual" | "auto" | "pre_deploy" | "scheduled";
  sizeBytes: number;
  fileCount: number;
  restoredFromId: string | null;
  isAutomatic: boolean;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

function TriggerIcon({ trigger }: { trigger: string }) {
  switch (trigger) {
    case "manual": return <Camera className="w-3 h-3 text-blue-500" />;
    case "auto": return <Zap className="w-3 h-3 text-yellow-500" />;
    case "pre_deploy": return <Rocket className="w-3 h-3 text-purple-500" />;
    case "scheduled": return <Timer className="w-3 h-3 text-green-500" />;
    default: return <Camera className="w-3 h-3" />;
  }
}

function TriggerBadge({ trigger }: { trigger: string }) {
  const colors: Record<string, string> = {
    manual: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    auto: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    pre_deploy: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    scheduled: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  const labels: Record<string, string> = { manual: "Manual", auto: "Auto", pre_deploy: "Pre-Deploy", scheduled: "Scheduled" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${colors[trigger] || colors.manual}`}>
      {labels[trigger] || trigger}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: "bg-green-500",
    creating: "bg-blue-500 animate-pulse",
    restoring: "bg-yellow-500 animate-pulse",
    failed: "bg-red-500",
    deleted: "bg-gray-500",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || colors.ready}`} />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SnapshotManager({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ snapshots: SnapshotItem[]; total: number }>({
    queryKey: ["snapshots", projectId],
    queryFn: () => fetch(`${API}/projects/${projectId}/snapshots`, { credentials: "include" }).then(r => r.json()),
  });

  const snapshots = data?.snapshots || [];

  const create = useMutation({
    mutationFn: () => fetch(`${API}/projects/${projectId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: snapshotName.trim(), description: description.trim() || undefined, trigger: "manual" }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshots", projectId] }); setSnapshotName(""); setDescription(""); setShowCreate(false); },
  });

  const restore = useMutation({
    mutationFn: (snapshotId: string) => fetch(`${API}/snapshots/${snapshotId}/restore`, {
      method: "POST", credentials: "include",
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshots", projectId] }); setConfirmRestore(null); },
  });

  const remove = useMutation({
    mutationFn: (snapshotId: string) => fetch(`${API}/snapshots/${snapshotId}`, {
      method: "DELETE", credentials: "include",
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshots", projectId] }),
  });

  return (
    <div className="h-full flex flex-col bg-background" data-testid="snapshot-manager-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium">Container Snapshots</span>
          <span className="text-[10px] text-muted-foreground">({data?.total || 0})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3 h-3" /> New Snapshot
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30 space-y-2">
          <Input
            value={snapshotName}
            onChange={e => setSnapshotName(e.target.value)}
            placeholder="Snapshot name (e.g., Before refactor)"
            className="h-7 text-xs"
            onKeyDown={e => e.key === "Enter" && snapshotName.trim() && create.mutate()}
          />
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-7 text-xs"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={() => create.mutate()}
              disabled={!snapshotName.trim() || create.isPending}>
              <Camera className="w-3 h-3" /> {create.isPending ? "Creating..." : "Create Snapshot"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
          {create.isError && <p className="text-[10px] text-red-500">{(create.error as Error).message}</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Camera className="w-8 h-8 opacity-40" />
            <p className="text-xs">No snapshots yet</p>
            <p className="text-[10px]">Create a snapshot to save your container state</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {snapshots.map(snap => (
              <div key={snap.id} className="group">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedId(expandedId === snap.id ? null : snap.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedId === snap.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <StatusDot status={snap.status} />
                    <TriggerIcon trigger={snap.trigger} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{snap.name}</span>
                      <TriggerBadge trigger={snap.trigger} />
                      {snap.restoredFromId && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium border bg-orange-500/10 text-orange-500 border-orange-500/20">
                          Restored
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {timeAgo(snap.createdAt)}</span>
                      <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {snap.fileCount} files</span>
                      <span className="flex items-center gap-0.5"><HardDrive className="w-2.5 h-2.5" /> {formatBytes(snap.sizeBytes || 0)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {snap.status === "ready" && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
                        onClick={e => { e.stopPropagation(); setConfirmRestore(snap.id); }}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500"
                      onClick={e => { e.stopPropagation(); remove.mutate(snap.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {confirmRestore === snap.id && (
                  <div className="px-3 py-2 bg-yellow-500/5 border-y border-yellow-500/20">
                    <p className="text-[10px] text-yellow-600 mb-2">
                      Restoring this snapshot will replace all current files and environment variables. This action creates a new snapshot of the current state first.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]"
                        onClick={() => restore.mutate(snap.id)} disabled={restore.isPending}>
                        {restore.isPending ? "Restoring..." : "Confirm Restore"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                        onClick={() => setConfirmRestore(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {expandedId === snap.id && (
                  <div className="px-3 pb-3 bg-muted/20 space-y-2">
                    {snap.description && (
                      <p className="text-[10px] text-muted-foreground">{snap.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Created:</span>{" "}
                        <span>{new Date(snap.createdAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className="capitalize">{snap.status}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Files:</span>{" "}
                        <span>{snap.fileCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span>{" "}
                        <span>{formatBytes(snap.sizeBytes || 0)}</span>
                      </div>
                      {snap.expiresAt && (
                        <div>
                          <span className="text-muted-foreground">Expires:</span>{" "}
                          <span className="flex items-center gap-0.5 inline-flex">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(snap.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {snap.restoredFromId && (
                        <div>
                          <span className="text-muted-foreground">Restored From:</span>{" "}
                          <span className="font-mono text-[9px]">{snap.restoredFromId.slice(0, 8)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {snap.status === "ready" && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1"
                          onClick={() => setConfirmRestore(snap.id)}>
                          <RotateCcw className="w-3 h-3" /> Restore This Snapshot
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-red-500 ml-auto"
                        onClick={() => remove.mutate(snap.id)} disabled={remove.isPending}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
