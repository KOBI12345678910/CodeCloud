import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, GitPullRequest, GitMerge, Plus, RefreshCw, Check, XCircle,
  Clock, MessageSquare, FileCode, ChevronDown, ChevronRight,
  ExternalLink, CircleDot, AlertCircle, Send, Loader2,
  CheckCircle2, MinusCircle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface GitHubPRProps {
  projectId: string;
  onClose: () => void;
}

type PRState = "open" | "closed" | "merged";
type View = "list" | "create" | "detail";

interface PRItem {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  draft: boolean;
  user: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  comments: number;
  review_comments: number;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  mergeable: boolean | null;
  mergeable_state: string;
  body: string;
}

interface ReviewComment {
  id: number;
  path: string;
  line: number | null;
  body: string;
  user: { login: string; avatar_url: string };
  created_at: string;
}

interface CICheck {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at: string;
}

const safeFetch = async (url: string, opts?: RequestInit) => {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || r.statusText); }
  return r.json();
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CIStatusIcon({ conclusion }: { conclusion: string | null }) {
  if (!conclusion) return <Timer className="w-3 h-3 text-yellow-500 animate-pulse" />;
  if (conclusion === "success") return <CheckCircle2 className="w-3 h-3 text-green-500" />;
  if (conclusion === "failure") return <XCircle className="w-3 h-3 text-red-500" />;
  return <MinusCircle className="w-3 h-3 text-muted-foreground" />;
}

function PRStateBadge({ pr }: { pr: PRItem }) {
  if (pr.merged_at) return <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-400"><GitMerge className="w-3 h-3" />Merged</span>;
  if (pr.state === "closed") return <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400"><XCircle className="w-3 h-3" />Closed</span>;
  if (pr.draft) return <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"><CircleDot className="w-3 h-3" />Draft</span>;
  return <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/15 text-green-400"><GitPullRequest className="w-3 h-3" />Open</span>;
}

export function GitHubPR({ projectId, onClose }: GitHubPRProps) {
  const [view, setView] = useState<View>("list");
  const [ghToken, setGhToken] = useState(() => localStorage.getItem("gh_token") || "");
  const [owner, setOwner] = useState(() => localStorage.getItem("gh_owner") || "");
  const [repo, setRepo] = useState(() => localStorage.getItem("gh_repo") || "");
  const [configured, setConfigured] = useState(() => !!(ghToken && owner && repo));
  const [filterState, setFilterState] = useState<PRState | "all">("open");
  const [selectedPR, setSelectedPR] = useState<PRItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["comments", "ci", "files"]));
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newHead, setNewHead] = useState("");
  const [newBase, setNewBase] = useState("main");
  const [isDraft, setIsDraft] = useState(false);
  const [commentText, setCommentText] = useState("");
  const qc = useQueryClient();

  const qp = `owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const ghHeaders: Record<string, string> = { "X-GitHub-Token": ghToken, "Content-Type": "application/json" };

  const saveConfig = useCallback(() => {
    localStorage.setItem("gh_token", ghToken);
    localStorage.setItem("gh_owner", owner);
    localStorage.setItem("gh_repo", repo);
    setConfigured(true);
  }, [ghToken, owner, repo]);

  const { data: prs = [], isLoading: prsLoading, refetch: refetchPRs } = useQuery<PRItem[]>({
    queryKey: ["github-prs", projectId, owner, repo, filterState],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls?${qp}&state=${filterState === "all" ? "all" : filterState}`, { headers: ghHeaders }),
    enabled: configured,
  });

  const { data: branches = [] } = useQuery<{ name: string }[]>({
    queryKey: ["github-branches", projectId, owner, repo],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/branches?${qp}`, { headers: ghHeaders }),
    enabled: configured && view === "create",
  });

  const { data: prDetail } = useQuery<PRItem>({
    queryKey: ["github-pr-detail", projectId, selectedPR?.number],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}?${qp}`, { headers: ghHeaders }),
    enabled: !!selectedPR && view === "detail",
  });

  const activePR = prDetail || selectedPR;

  const { data: reviewComments = [] } = useQuery<ReviewComment[]>({
    queryKey: ["github-pr-comments", projectId, selectedPR?.number],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}/comments?${qp}`, { headers: ghHeaders }),
    enabled: !!selectedPR && view === "detail",
  });

  const { data: prFiles = [] } = useQuery<{ filename: string; status: string; additions: number; deletions: number; changes: number }[]>({
    queryKey: ["github-pr-files", projectId, selectedPR?.number],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}/files?${qp}`, { headers: ghHeaders }),
    enabled: !!selectedPR && view === "detail",
  });

  const { data: ciStatus } = useQuery<{ checkRuns: CICheck[]; overallState: string }>({
    queryKey: ["github-ci", projectId, activePR?.head?.sha],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/github/ci-status?${qp}&ref=${activePR!.head.sha}`, { headers: ghHeaders }),
    enabled: !!activePR && view === "detail",
    refetchInterval: 30000,
  });

  const createPR = useMutation({
    mutationFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({ owner, repo, title: newTitle, body: newBody, head: newHead, base: newBase, draft: isDraft }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-prs", projectId] });
      setView("list"); setNewTitle(""); setNewBody(""); setNewHead(""); setIsDraft(false);
    },
  });

  const mergePR = useMutation({
    mutationFn: (method: string) => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}/merge`, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({ owner, repo, mergeMethod: method }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-prs", projectId] });
      setSelectedPR(null); setView("list");
    },
  });

  const closePR = useMutation({
    mutationFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}/close`, {
      method: "PATCH",
      headers: ghHeaders,
      body: JSON.stringify({ owner, repo }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-prs", projectId] });
      setSelectedPR(null); setView("list");
    },
  });

  const addComment = useMutation({
    mutationFn: () => safeFetch(`${API}/projects/${projectId}/github/pulls/${selectedPR!.number}/comments`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({ owner, repo, body: commentText }),
    }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["github-pr-comments", projectId, selectedPR?.number] });
    },
  });

  const toggleSection = useCallback((s: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);

  if (!configured) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
          <span className="text-xs font-medium flex items-center gap-1.5"><GitPullRequest className="w-3.5 h-3.5" /> GitHub PR Integration</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}><X className="w-3 h-3" /></Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
          <GitPullRequest className="w-10 h-10 text-muted-foreground opacity-30" />
          <p className="text-xs text-muted-foreground">Connect to a GitHub repository</p>
          <div className="w-full max-w-xs space-y-2">
            <Input value={ghToken} onChange={e => setGhToken(e.target.value)} placeholder="GitHub Personal Access Token" type="password" className="h-7 text-xs" />
            <div className="flex gap-2">
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" className="h-7 text-xs" />
              <Input value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" className="h-7 text-xs" />
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={saveConfig} disabled={!ghToken || !owner || !repo}>Connect</Button>
          </div>
          <p className="text-[9px] text-muted-foreground">Token needs repo scope. Stored in browser only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background" data-testid="github-pr-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          {view !== "list" && (
            <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => { setView("list"); setSelectedPR(null); }}>
              ← Back
            </Button>
          )}
          <span className="text-xs font-medium flex items-center gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5" />
            {view === "list" ? "Pull Requests" : view === "create" ? "Create PR" : `#${selectedPR?.number}`}
          </span>
          <span className="text-[9px] text-muted-foreground">{owner}/{repo}</span>
        </div>
        <div className="flex items-center gap-1">
          {view === "list" && (
            <>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={() => refetchPRs()}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={() => setView("create")}>
                <Plus className="w-3 h-3" /> New PR
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setConfigured(false); localStorage.removeItem("gh_token"); localStorage.removeItem("gh_owner"); localStorage.removeItem("gh_repo"); }}>
            Disconnect
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}><X className="w-3 h-3" /></Button>
        </div>
      </div>

      {view === "list" && (
        <>
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 shrink-0">
            {(["open", "closed", "all"] as const).map(s => (
              <button key={s} className={`px-2 py-0.5 rounded text-[10px] font-medium ${filterState === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setFilterState(s as PRState | "all")}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {prsLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : prs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <GitPullRequest className="w-8 h-8 opacity-30" />
                <p className="text-xs">No {filterState !== "all" ? filterState : ""} pull requests</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {prs.map(pr => (
                  <button key={pr.number} className="w-full text-left px-3 py-2 hover:bg-muted/20 transition-colors"
                    onClick={() => { setSelectedPR(pr); setView("detail"); }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <PRStateBadge pr={pr} />
                          <span className="text-xs font-medium truncate">{pr.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                          <span>#{pr.number}</span>
                          <span>{pr.user.login}</span>
                          <span>{pr.head.ref} → {pr.base.ref}</span>
                          <span>{timeAgo(pr.updated_at)}</span>
                          {pr.comments + pr.review_comments > 0 && (
                            <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{pr.comments + pr.review_comments}</span>
                          )}
                          {pr.changed_files > 0 && (
                            <span className="flex items-center gap-0.5"><FileCode className="w-2.5 h-2.5" />{pr.changed_files}</span>
                          )}
                        </div>
                      </div>
                      {pr.additions !== undefined && (
                        <div className="text-[9px] shrink-0">
                          <span className="text-green-500">+{pr.additions}</span>{" "}
                          <span className="text-red-500">-{pr.deletions}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === "create" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="PR title" className="h-7 text-xs" />
          <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Description (optional, supports Markdown)"
            className="w-full h-20 bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs resize-none outline-none" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-muted-foreground mb-0.5 block">Head branch</label>
              <select value={newHead} onChange={e => setNewHead(e.target.value)}
                className="w-full h-7 bg-muted/30 border border-border/50 rounded px-2 text-xs outline-none">
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5 text-muted-foreground text-xs">→</div>
            <div className="flex-1">
              <label className="text-[9px] text-muted-foreground mb-0.5 block">Base branch</label>
              <select value={newBase} onChange={e => setNewBase(e.target.value)}
                className="w-full h-7 bg-muted/30 border border-border/50 rounded px-2 text-xs outline-none">
                {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                {branches.length === 0 && <option value="main">main</option>}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="rounded" />
            Create as draft
          </label>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => createPR.mutate()}
              disabled={!newTitle || !newHead || !newBase || createPR.isPending}>
              {createPR.isPending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Creating...</> : "Create Pull Request"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setView("list")}>Cancel</Button>
          </div>
          {createPR.isError && <p className="text-[10px] text-red-500">{(createPR.error as Error).message}</p>}
        </div>
      )}

      {view === "detail" && activePR && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border/30">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <PRStateBadge pr={activePR} />
                  <span className="text-xs font-medium">{activePR.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span>{activePR.user.login}</span>
                  <span className="font-mono bg-muted/40 px-1 rounded">{activePR.head.ref}</span>
                  <span>→</span>
                  <span className="font-mono bg-muted/40 px-1 rounded">{activePR.base.ref}</span>
                  <a href={activePR.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-foreground">
                    <ExternalLink className="w-2.5 h-2.5" /> View on GitHub
                  </a>
                </div>
                {activePR.body && <p className="text-[10px] text-muted-foreground mt-1.5 whitespace-pre-wrap line-clamp-3">{activePR.body}</p>}
              </div>
            </div>
            {activePR.state === "open" && !activePR.merged_at && (
              <div className="flex items-center gap-1 mt-2">
                <Button size="sm" className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => mergePR.mutate("merge")} disabled={mergePR.isPending}>
                  <GitMerge className="w-3 h-3" /> Merge
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1"
                  onClick={() => mergePR.mutate("squash")} disabled={mergePR.isPending}>Squash</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1"
                  onClick={() => mergePR.mutate("rebase")} disabled={mergePR.isPending}>Rebase</Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-red-500"
                  onClick={() => closePR.mutate()} disabled={closePR.isPending}>
                  <XCircle className="w-3 h-3" /> Close
                </Button>
              </div>
            )}
            {(mergePR.isError || closePR.isError) && (
              <p className="text-[10px] text-red-500 mt-1">{((mergePR.error || closePR.error) as Error).message}</p>
            )}
          </div>

          <div className="divide-y divide-border/20">
            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("ci")}>
                {expandedSections.has("ci") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                CI Status
                {ciStatus && (
                  <span className={`ml-1 px-1 rounded text-[9px] ${ciStatus.overallState === "success" ? "bg-green-500/15 text-green-500" : ciStatus.overallState === "failure" ? "bg-red-500/15 text-red-500" : "bg-yellow-500/15 text-yellow-500"}`}>
                    {ciStatus.overallState}
                  </span>
                )}
              </button>
              {expandedSections.has("ci") && ciStatus && (
                <div className="px-3 pb-2 space-y-0.5">
                  {ciStatus.checkRuns.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground">No CI checks configured</p>
                  ) : (
                    ciStatus.checkRuns.map(check => (
                      <a key={check.id} href={check.html_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 py-0.5 text-[10px] hover:text-foreground text-muted-foreground">
                        <CIStatusIcon conclusion={check.conclusion} />
                        <span className="truncate">{check.name}</span>
                        {check.conclusion && <span className="text-[8px] opacity-60">{check.conclusion}</span>}
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("files")}>
                {expandedSections.has("files") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Changed Files <span className="text-[9px] opacity-60">({prFiles.length})</span>
              </button>
              {expandedSections.has("files") && (
                <div className="px-3 pb-2 space-y-0.5 max-h-32 overflow-y-auto">
                  {prFiles.map(f => (
                    <div key={f.filename} className="flex items-center gap-1.5 py-0.5 text-[10px]">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.status === "added" ? "bg-green-500" : f.status === "removed" ? "bg-red-500" : "bg-yellow-500"}`} />
                      <span className="font-mono truncate flex-1">{f.filename}</span>
                      <span className="text-green-500 text-[9px]">+{f.additions}</span>
                      <span className="text-red-500 text-[9px]">-{f.deletions}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("comments")}>
                {expandedSections.has("comments") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Comments <span className="text-[9px] opacity-60">({reviewComments.length})</span>
              </button>
              {expandedSections.has("comments") && (
                <div className="px-3 pb-2 space-y-2 max-h-40 overflow-y-auto">
                  {reviewComments.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground">No review comments yet</p>
                  ) : (
                    reviewComments.map(c => (
                      <div key={c.id} className="border border-border/30 rounded p-1.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <img src={c.user.avatar_url} className="w-3.5 h-3.5 rounded-full" alt="" />
                          <span className="text-[10px] font-medium">{c.user.login}</span>
                          {c.path && <span className="text-[8px] font-mono text-muted-foreground">{c.path}{c.line ? `:${c.line}` : ""}</span>}
                          <span className="text-[8px] text-muted-foreground ml-auto">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{c.body}</p>
                      </div>
                    ))
                  )}
                  {activePR.state === "open" && (
                    <div className="flex items-center gap-1 mt-1">
                      <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..."
                        className="h-6 text-[10px] flex-1" onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) addComment.mutate(); }} />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => addComment.mutate()}
                        disabled={!commentText.trim() || addComment.isPending}>
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-1 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground shrink-0">
        <span>{prs.length} PR{prs.length !== 1 ? "s" : ""}</span>
        <span>{owner}/{repo}</span>
      </div>
    </div>
  );
}
