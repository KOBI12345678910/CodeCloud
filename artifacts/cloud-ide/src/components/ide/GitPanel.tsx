import { useState, useEffect, useCallback } from "react";
import {
  GitBranch, GitCommit as GitCommitIcon, Plus, Minus, Check, RefreshCw,
  ChevronDown, ChevronRight, FileCode, Loader2, FolderGit2,
  Clock, User, Diff, GitMerge, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  files: number;
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  lastCommit?: string;
}

interface GitFileStatus {
  file: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed";
  staged: boolean;
}

interface GitStatus {
  initialized: boolean;
  branch: string;
  clean: boolean;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

interface DiffHunk {
  header: string;
  lines: Array<{ type: "add" | "remove" | "context"; content: string }>;
}

interface GitDiff {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

const STATUS_COLORS: Record<string, string> = {
  modified: "text-yellow-400",
  added: "text-green-400",
  deleted: "text-red-400",
  untracked: "text-blue-400",
  renamed: "text-purple-400",
};

const STATUS_LABELS: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  untracked: "U",
  renamed: "R",
};

interface GitPanelProps {
  projectId: string;
  files?: Array<{ name: string; status?: string }>;
}

export default function GitPanel({ projectId, files = [] }: GitPanelProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"changes" | "history" | "branches">("changes");
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diffView, setDiffView] = useState<GitDiff | null>(null);
  const [changesExpanded, setChangesExpanded] = useState(true);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API_BASE}/api/projects/${projectId}/git${path}`, {
      credentials: "include",
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [projectId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, b] = await Promise.all([
        apiFetch("/status"),
        apiFetch("/log?limit=20"),
        apiFetch("/branches"),
      ]);
      setStatus(s);
      setCommits(c);
      setBranches(b);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleInit = async () => {
    try {
      await apiFetch("/init", { method: "POST" });
      toast({ title: "Git repository initialized" });
      refresh();
    } catch {
      toast({ title: "Failed to initialize", variant: "destructive" });
    }
  };

  const handleStageFile = async (file: string) => {
    await apiFetch("/stage", { method: "POST", body: JSON.stringify({ file }) });
    refresh();
  };

  const handleUnstageFile = async (file: string) => {
    await apiFetch("/unstage", { method: "POST", body: JSON.stringify({ file }) });
    refresh();
  };

  const handleStageAll = async () => {
    const allFiles = (status?.files || []).filter((f) => !f.staged).map((f) => f.file);
    await apiFetch("/stage", { method: "POST", body: JSON.stringify({ all: true, files: allFiles }) });
    refresh();
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    try {
      await apiFetch("/commit", { method: "POST", body: JSON.stringify({ message: commitMsg.trim() }) });
      setCommitMsg("");
      toast({ title: "Changes committed" });
      refresh();
    } catch {
      toast({ title: "Commit failed", variant: "destructive" });
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranch.trim()) return;
    try {
      await apiFetch("/branches", { method: "POST", body: JSON.stringify({ name: newBranch.trim() }) });
      setNewBranch("");
      setShowNewBranch(false);
      toast({ title: `Branch '${newBranch.trim()}' created` });
      refresh();
    } catch {
      toast({ title: "Branch creation failed", variant: "destructive" });
    }
  };

  const handleCheckout = async (branch: string) => {
    try {
      await apiFetch("/checkout", { method: "POST", body: JSON.stringify({ branch }) });
      toast({ title: `Switched to '${branch}'` });
      refresh();
    } catch {
      toast({ title: "Checkout failed", variant: "destructive" });
    }
  };

  const handleViewDiff = async (file: string) => {
    try {
      const diff = await apiFetch(`/diff?file=${encodeURIComponent(file)}`);
      setDiffView(diff);
    } catch {
      toast({ title: "Failed to load diff", variant: "destructive" });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (status && !status.initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center" data-testid="git-panel-init">
        <FolderGit2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="font-medium mb-1">No Git repository</p>
        <p className="text-xs text-muted-foreground mb-4">Initialize a Git repository to track changes</p>
        <Button onClick={handleInit} size="sm" data-testid="button-git-init">
          <FolderGit2 className="w-4 h-4 mr-2" /> Initialize Repository
        </Button>
      </div>
    );
  }

  if (diffView) {
    return (
      <div className="flex flex-col h-full bg-[hsl(222,47%,11%)]" data-testid="git-diff-view">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-[hsl(222,47%,13%)]">
          <div className="flex items-center gap-2 text-xs">
            <Diff className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{diffView.file}</span>
            <span className="text-green-400">+{diffView.additions}</span>
            <span className="text-red-400">-{diffView.deletions}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDiffView(null)}>
            <ChevronRight className="w-3 h-3 rotate-90" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto font-mono text-xs">
          {diffView.hunks.map((hunk, hi) => (
            <div key={hi}>
              <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px]">{hunk.header}</div>
              {hunk.lines.map((line, li) => (
                <div
                  key={li}
                  className={`px-3 py-0.5 ${
                    line.type === "add" ? "bg-green-500/10 text-green-300" :
                    line.type === "remove" ? "bg-red-500/10 text-red-300" :
                    "text-muted-foreground"
                  }`}
                >
                  <span className="inline-block w-4 text-center opacity-50">
                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                  </span>
                  {line.content}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stagedFiles = status?.files.filter((f) => f.staged) || [];
  const unstagedFiles = status?.files.filter((f) => !f.staged) || [];

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="git-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors" data-testid="current-branch">
                <GitBranch className="w-3 h-3" />
                <span className="font-medium">{status?.branch || "main"}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {branches.map((b) => (
                <DropdownMenuItem
                  key={b.name}
                  onClick={() => !b.current && handleCheckout(b.name)}
                  className={b.current ? "text-primary" : ""}
                  data-testid={`branch-${b.name}`}
                >
                  {b.current && <Check className="w-3 h-3 mr-2" />}
                  {!b.current && <GitBranch className="w-3 h-3 mr-2 opacity-30" />}
                  {b.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowNewBranch(true)}>
                <Plus className="w-3 h-3 mr-2" /> New Branch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          {(["changes", "history", "branches"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-1 text-[10px] rounded transition-colors capitalize ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${t}`}
            >
              {t}
            </button>
          ))}
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {showNewBranch && (
        <div className="px-3 py-2 border-b border-border/30 flex gap-2">
          <Input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder="branch-name"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
            data-testid="input-new-branch"
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleCreateBranch}>Create</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setShowNewBranch(false)}>Cancel</Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "changes" && (
          <div data-testid="tab-changes-content">
            <div className="px-3 py-2 border-b border-border/30">
              <div className="flex gap-2">
                <Input
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Commit message"
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCommit()}
                  data-testid="input-commit-message"
                />
                <Button size="sm" className="h-8 text-xs px-3" onClick={handleCommit} disabled={!commitMsg.trim()} data-testid="button-commit">
                  <Check className="w-3 h-3 mr-1" /> Commit
                </Button>
              </div>
            </div>

            {stagedFiles.length > 0 && (
              <div>
                <button
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-white/5"
                  onClick={() => setChangesExpanded(!changesExpanded)}
                >
                  <span>Staged ({stagedFiles.length})</span>
                </button>
                {stagedFiles.map((f) => (
                  <div key={f.file} className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 group text-xs">
                    <FileCode className="w-3 h-3 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.file}</span>
                    <span className={`text-[10px] font-mono ${STATUS_COLORS[f.status]}`}>{STATUS_LABELS[f.status]}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => handleUnstageFile(f.file)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Changes ({unstagedFiles.length || files.length})
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleStageAll} data-testid="button-stage-all">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {(unstagedFiles.length > 0 ? unstagedFiles : files.map((f) => ({ file: f.name, status: f.status || "modified", staged: false } as GitFileStatus))).map((f) => (
                <div key={f.file} className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 group text-xs cursor-pointer" onClick={() => handleViewDiff(f.file)}>
                  <FileCode className="w-3 h-3 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.file}</span>
                  <span className={`text-[10px] font-mono ${STATUS_COLORS[f.status] || "text-yellow-400"}`}>
                    {STATUS_LABELS[f.status] || "M"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleStageFile(f.file); }}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {unstagedFiles.length === 0 && files.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground/50 text-center">No changes</p>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div data-testid="tab-history-content">
            {commits.length === 0 ? (
              <p className="px-3 py-8 text-xs text-muted-foreground/50 text-center">No commits yet</p>
            ) : (
              commits.map((c) => (
                <div key={c.hash} className="px-3 py-2 border-b border-border/20 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-2">
                    <CircleDot className="w-3 h-3 text-primary mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="font-mono">{c.shortHash}</span>
                        <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> {c.author}</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {formatDate(c.date)}</span>
                        <span>{c.files} file{c.files !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "branches" && (
          <div data-testid="tab-branches-content">
            <div className="px-3 py-2 border-b border-border/30">
              <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setShowNewBranch(true)} data-testid="button-new-branch">
                <Plus className="w-3 h-3 mr-1" /> New Branch
              </Button>
            </div>
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => !b.current && handleCheckout(b.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${b.current ? "text-primary" : ""}`}
                data-testid={`branch-item-${b.name}`}
              >
                <GitBranch className={`w-3 h-3 ${b.current ? "text-primary" : "text-muted-foreground"}`} />
                <span className="flex-1 text-left truncate">{b.name}</span>
                {b.current && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">current</span>}
                {b.lastCommit && <span className="text-[10px] text-muted-foreground/50 truncate max-w-[120px]">{b.lastCommit}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
