import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/react";
import {
  X, Plus, Bug, Lightbulb, Wrench, ChevronLeft, Send, FileCode,
  CircleDot, Clock, CheckCircle2, Loader2, Filter, ArrowUpDown,
  User as UserIcon, Reply, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.VITE_API_URL || "";

type IssueStatus = "open" | "in-progress" | "closed";
type IssueLabel = "bug" | "feature" | "improvement";

interface CodeReference {
  filePath: string;
  lineStart: number;
  lineEnd?: number;
}

interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  label: IssueLabel;
  assigneeId: string | null;
  createdBy: string;
  codeReferences: CodeReference[] | null;
  createdAt: string;
  updatedAt: string;
  creatorUsername?: string;
  creatorAvatar?: string;
}

interface IssueComment {
  id: string;
  issueId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  username?: string;
  avatarUrl?: string;
}

interface Collaborator {
  id: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
}

interface IssueCounts {
  open: number;
  "in-progress": number;
  closed: number;
  total: number;
}

const statusConfig: Record<IssueStatus, { icon: typeof CircleDot; color: string; label: string }> = {
  open: { icon: CircleDot, color: "text-green-400", label: "Open" },
  "in-progress": { icon: Clock, color: "text-yellow-400", label: "In Progress" },
  closed: { icon: CheckCircle2, color: "text-muted-foreground", label: "Closed" },
};

const labelConfig: Record<IssueLabel, { icon: typeof Bug; color: string; bgColor: string; label: string }> = {
  bug: { icon: Bug, color: "text-red-400", bgColor: "bg-red-500/10", label: "Bug" },
  feature: { icon: Lightbulb, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Feature" },
  improvement: { icon: Wrench, color: "text-purple-400", bgColor: "bg-purple-500/10", label: "Improvement" },
};

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

function ThreadedComments({
  comments,
  parentId = null,
  depth = 0,
  onReply,
  replyingTo,
  replyText,
  setReplyText,
  onSubmitReply,
  collapsedThreads,
  toggleThread,
}: {
  comments: IssueComment[];
  parentId?: string | null;
  depth?: number;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onSubmitReply: () => void;
  collapsedThreads: Set<string>;
  toggleThread: (id: string) => void;
}) {
  const children = comments.filter(c => c.parentId === parentId);
  if (children.length === 0) return null;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border/30 pl-2" : ""}>
      {children.map(c => {
        const replies = comments.filter(r => r.parentId === c.id);
        const hasReplies = replies.length > 0;
        const isCollapsed = collapsedThreads.has(c.id);
        return (
          <div key={c.id} className="mb-2" data-testid={`comment-${c.id}`}>
            <div className="bg-muted/30 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-medium">{c.username || "unknown"}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                <button
                  onClick={() => onReply(c.id)}
                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                  data-testid={`reply-btn-${c.id}`}
                >
                  <Reply className="w-2.5 h-2.5" /> Reply
                </button>
              </div>
              <p className="text-xs whitespace-pre-wrap">{c.content}</p>
              {hasReplies && (
                <button
                  onClick={() => toggleThread(c.id)}
                  className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground mt-1"
                >
                  {isCollapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                  {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
            {replyingTo === c.id && (
              <div className="flex items-center gap-1 mt-1 ml-4">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmitReply(); } }}
                  className="flex-1 bg-muted/30 border border-border/50 rounded px-2 py-1 text-xs outline-none focus:border-primary/50"
                  placeholder="Write a reply..."
                  autoFocus
                  data-testid={`reply-input-${c.id}`}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onSubmitReply} disabled={!replyText.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            )}
            {hasReplies && !isCollapsed && (
              <ThreadedComments
                comments={comments}
                parentId={c.id}
                depth={depth + 1}
                onReply={onReply}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={onSubmitReply}
                collapsedThreads={collapsedThreads}
                toggleThread={toggleThread}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function IssueTrackerPanel({
  projectId,
  onClose,
  onNavigateToFile,
}: {
  projectId: string;
  onClose: () => void;
  onNavigateToFile?: (filePath: string, line: number) => void;
}) {
  const { user } = useUser();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [counts, setCounts] = useState<IssueCounts>({ open: 0, "in-progress": 0, closed: 0, total: 0 });
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "">("");
  const [filterLabel, setFilterLabel] = useState<IssueLabel | "">("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<IssueStatus>("open");
  const [formLabel, setFormLabel] = useState<IssueLabel>("bug");
  const [formAssignee, setFormAssignee] = useState("");
  const [formCodeRefPath, setFormCodeRefPath] = useState("");
  const [formCodeRefLine, setFormCodeRefLine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const topLevelComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);

  const toggleThread = useCallback((id: string) => {
    setCollapsedThreads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterLabel) params.set("label", filterLabel);
      params.set("sortOrder", sortOrder);
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues?${params}`, { credentials: "include" });
      if (res.ok) setIssues(await res.json());
    } catch {}
    setLoading(false);
  }, [projectId, filterStatus, filterLabel, sortOrder]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues/counts`, { credentials: "include" });
      if (res.ok) setCounts(await res.json());
    } catch {}
  }, [projectId]);

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/collaborators`, { credentials: "include" });
      if (res.ok) setCollaborators(await res.json());
    } catch {}
  }, [projectId]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);
  useEffect(() => { fetchCounts(); fetchCollaborators(); }, [fetchCounts, fetchCollaborators]);

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const codeReferences: CodeReference[] = [];
      if (formCodeRefPath.trim() && formCodeRefLine.trim()) {
        codeReferences.push({ filePath: formCodeRefPath.trim(), lineStart: parseInt(formCodeRefLine) || 1 });
      }
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
          label: formLabel,
          assigneeId: formAssignee || null,
          codeReferences: codeReferences.length ? codeReferences : null,
        }),
      });
      if (res.ok) {
        setFormTitle(""); setFormDescription(""); setFormStatus("open"); setFormLabel("bug"); setFormAssignee("");
        setFormCodeRefPath(""); setFormCodeRefLine("");
        setShowCreateForm(false);
        fetchIssues();
        fetchCounts();
      }
    } catch {}
    setSubmitting(false);
  };

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ...updated } : i));
        if (selectedIssue?.id === issueId) setSelectedIssue(prev => prev ? { ...prev, ...updated } : null);
        fetchCounts();
      }
    } catch {}
  };

  const openIssueDetail = async (issue: Issue) => {
    setSelectedIssue(issue);
    setCommentsLoading(true);
    setReplyingTo(null);
    setReplyText("");
    setCollapsedThreads(new Set());
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues/${issue.id}/comments`, { credentials: "include" });
      if (res.ok) setComments(await res.json());
    } catch {}
    setCommentsLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedIssue) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues/${selectedIssue.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [...prev, { ...comment, username: user?.username || "You" }]);
        setNewComment("");
      }
    } catch {}
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(prev => prev === commentId ? null : commentId);
    setReplyText("");
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !selectedIssue || !replyingTo) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues/${selectedIssue.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText.trim(), parentId: replyingTo }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [...prev, { ...comment, username: user?.username || "You" }]);
        setReplyingTo(null);
        setReplyText("");
      }
    } catch {}
  };

  if (selectedIssue) {
    const sc = statusConfig[selectedIssue.status as IssueStatus];
    const lc = labelConfig[selectedIssue.label as IssueLabel] || labelConfig.bug;
    const LabelIcon = lc.icon;
    const assignee = collaborators.find(c => c.userId === selectedIssue.assigneeId);

    return (
      <div className="h-full flex flex-col bg-card/50">
        <div className="h-8 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIssue(null)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              Issue Detail
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-border/30">
            <h3 className="text-sm font-semibold mb-2">{selectedIssue.title}</h3>

            <div className="flex flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-1">
                <select
                  value={selectedIssue.status}
                  onChange={(e) => handleStatusChange(selectedIssue.id, e.target.value as IssueStatus)}
                  className="text-[10px] bg-muted/30 border border-border/50 rounded px-1.5 py-0.5"
                  data-testid="issue-status-select"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${lc.bgColor} ${lc.color}`}>
                <LabelIcon className="w-3 h-3" /> {lc.label}
              </span>
              {assignee && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <UserIcon className="w-3 h-3" /> {assignee.username}
                </span>
              )}
            </div>

            {selectedIssue.description && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-2">{selectedIssue.description}</p>
            )}

            {selectedIssue.codeReferences && selectedIssue.codeReferences.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Code References:</span>
                {selectedIssue.codeReferences.map((ref, i) => (
                  <button
                    key={i}
                    onClick={() => onNavigateToFile?.(ref.filePath, ref.lineStart)}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
                    data-testid={`code-ref-${i}`}
                  >
                    <FileCode className="w-3 h-3" />
                    {ref.filePath}:{ref.lineStart}{ref.lineEnd ? `-${ref.lineEnd}` : ""}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[10px] text-muted-foreground mt-2">
              Created by {selectedIssue.creatorUsername || "unknown"} {timeAgo(selectedIssue.createdAt)}
            </div>
          </div>

          <div className="p-3">
            <div className="text-[11px] font-semibold text-muted-foreground mb-2">
              Comments ({comments.length})
            </div>
            {commentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <ThreadedComments
                  comments={comments}
                  parentId={null}
                  depth={0}
                  onReply={handleReply}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSubmitReply={handleSubmitReply}
                  collapsedThreads={collapsedThreads}
                  toggleThread={toggleThread}
                />
                {topLevelComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-2 border-t border-border/30 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              className="flex-1 bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
              placeholder="Add a comment..."
              data-testid="input-issue-comment"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleAddComment} disabled={!newComment.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="h-full flex flex-col bg-card/50">
        <div className="h-8 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Issue</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Title *</label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="h-7 text-xs mt-0.5"
              placeholder="Issue title"
              data-testid="input-issue-title"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 min-h-[60px] mt-0.5 resize-y"
              placeholder="Describe the issue..."
              data-testid="input-issue-description"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as IssueStatus)}
                className="w-full h-7 text-xs bg-muted/30 border border-border/50 rounded px-2 mt-0.5"
                data-testid="select-issue-status"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium">Label</label>
              <select
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value as IssueLabel)}
                className="w-full h-7 text-xs bg-muted/30 border border-border/50 rounded px-2 mt-0.5"
                data-testid="select-issue-label"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Assignee</label>
            <select
              value={formAssignee}
              onChange={(e) => setFormAssignee(e.target.value)}
              className="w-full h-7 text-xs bg-muted/30 border border-border/50 rounded px-2 mt-0.5"
              data-testid="select-issue-assignee"
            >
              <option value="">Unassigned</option>
              {collaborators.map(c => (
                <option key={c.userId} value={c.userId}>{c.username || c.userId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Code Reference (optional)</label>
            <div className="flex gap-1 mt-0.5">
              <Input
                value={formCodeRefPath}
                onChange={(e) => setFormCodeRefPath(e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="file/path.ts"
                data-testid="input-code-ref-path"
              />
              <Input
                value={formCodeRefLine}
                onChange={(e) => setFormCodeRefLine(e.target.value)}
                className="h-7 text-xs w-16"
                placeholder="Line"
                type="number"
                data-testid="input-code-ref-line"
              />
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-border/30 shrink-0">
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleCreate}
            disabled={submitting || !formTitle.trim()}
            data-testid="button-create-issue"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
            Create Issue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/50">
      <div className="h-8 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Issues
          </span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium" data-testid="issue-count-badge">
            {counts.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateForm(true)} title="New Issue" data-testid="button-new-issue">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as IssueStatus | "")}
            className="text-[10px] bg-muted/30 border border-border/50 rounded px-1.5 py-0.5"
            data-testid="filter-status"
          >
            <option value="">All Status</option>
            <option value="open">Open ({counts.open})</option>
            <option value="in-progress">In Progress ({counts["in-progress"]})</option>
            <option value="closed">Closed ({counts.closed})</option>
          </select>
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value as IssueLabel | "")}
            className="text-[10px] bg-muted/30 border border-border/50 rounded px-1.5 py-0.5"
            data-testid="filter-label"
          >
            <option value="">All Labels</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
          </select>
        </div>
        <button
          onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground ml-auto"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
          data-testid="sort-toggle"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortOrder === "desc" ? "Newest" : "Oldest"}
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/20 shrink-0">
        {(Object.entries(statusConfig) as [IssueStatus, typeof statusConfig.open][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <span key={key} className={`inline-flex items-center gap-0.5 text-[10px] ${cfg.color}`}>
              <Icon className="w-3 h-3" /> {counts[key] || 0}
            </span>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto" data-testid="issues-list">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            <Bug className="w-6 h-6 mx-auto mb-2 opacity-20" />
            <p>No issues found</p>
            <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setShowCreateForm(true)}>
              Create one
            </Button>
          </div>
        ) : (
          issues.map(issue => {
            const sc = statusConfig[issue.status as IssueStatus] || statusConfig.open;
            const lc = labelConfig[issue.label as IssueLabel] || labelConfig.bug;
            const StatusIcon = sc.icon;
            const LabelIcon = lc.icon;
            return (
              <div
                key={issue.id}
                onClick={() => openIssueDetail(issue)}
                className="px-3 py-2 border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                data-testid={`issue-item-${issue.id}`}
              >
                <div className="flex items-start gap-2">
                  <StatusIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sc.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{issue.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-0.5 text-[10px] ${lc.color}`}>
                        <LabelIcon className="w-2.5 h-2.5" /> {lc.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(issue.createdAt)}</span>
                      {issue.creatorUsername && (
                        <span className="text-[10px] text-muted-foreground">by {issue.creatorUsername}</span>
                      )}
                      {issue.codeReferences && issue.codeReferences.length > 0 && (
                        <span className="text-[10px] text-blue-400">
                          <FileCode className="w-2.5 h-2.5 inline" /> {issue.codeReferences.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
