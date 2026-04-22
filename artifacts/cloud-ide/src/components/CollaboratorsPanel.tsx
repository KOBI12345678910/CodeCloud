import { useCallback, useEffect, useState } from "react";
import { useSession } from "@clerk/react";
import { UserPlus, X, Loader2, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Collaborator {
  id: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  role: "viewer" | "editor" | "admin";
  createdAt: string;
}

interface Props {
  projectId: string;
  ownerUsername?: string | null;
  ownerAvatarUrl?: string | null;
  canManage: boolean;
  onClose: () => void;
}

const API = import.meta.env.VITE_API_URL || "";

export function CollaboratorsPanel({ projectId, ownerUsername, ownerAvatarUrl, canManage, onClose }: Props) {
  const { session } = useSession();
  const [list, setList] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("editor");

  const authedFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const t = session ? await session.getToken() : null;
      const r = await fetch(`${API}/api${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
          ...(init?.headers || {}),
        },
      });
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`);
      return data as T;
    },
    [session],
  );

  const refresh = useCallback(async () => {
    try {
      const data = await authedFetch<Collaborator[]>(`/projects/${projectId}/collaborators`);
      setList(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [authedFetch, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await authedFetch(`/projects/${projectId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ username: identifier.trim(), role }),
      });
      setIdentifier("");
      await refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not invite");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    setBusy(true);
    setErr(null);
    try {
      await authedFetch(`/projects/${projectId}/collaborators/${userId}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="collaborators-panel"
    >
      <div
        className="bg-popover border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-sm">Manage collaborators</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Invite people to edit this project in real time.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted" data-testid="collaborators-close">
            <X className="w-4 h-4" />
          </button>
        </header>

        {canManage && (
          <form onSubmit={invite} className="px-5 py-4 border-b border-border space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Invite by username or email</label>
            <div className="flex items-center gap-2">
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="alex or alex@example.com"
                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                disabled={busy}
                data-testid="collaborator-input"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="bg-background border border-border rounded-md px-2 py-1.5 text-xs"
                disabled={busy}
                data-testid="collaborator-role"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" size="sm" disabled={busy || !identifier.trim()} data-testid="collaborator-invite">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              </Button>
            </div>
            {err && (
              <div className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
          </form>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            People with access
          </div>

          {ownerUsername && (
            <div className="flex items-center gap-3 py-2">
              {ownerAvatarUrl ? (
                <img src={ownerAvatarUrl} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                  {ownerUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ownerUsername}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Owner
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-6 flex justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No collaborators yet.{canManage ? " Invite someone above." : ""}
            </div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2" data-testid={`collab-row-${c.userId}`}>
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted text-foreground/70 text-xs flex items-center justify-center font-semibold">
                    {(c.username || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.username || "Unknown user"}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{c.role}</div>
                </div>
                {canManage && (
                  <button
                    onClick={() => void remove(c.userId)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors disabled:opacity-40"
                    title="Remove access"
                    data-testid={`collab-remove-${c.userId}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
