import { useState, useCallback, useMemo } from "react";
import {
  MessageSquare, Check, X, AlertCircle, Clock, Send,
  ChevronDown, ChevronRight, FileCode, User, Loader2,
  CheckCircle, XCircle, Eye, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  fileId: string | null;
  filePath: string | null;
  lineNumber: number | null;
  lineEndNumber: number | null;
  content: string;
  resolved: string;
  parentId: string | null;
  createdAt: string;
  userName: string | null;
}

interface Review {
  id: string;
  projectId: string;
  requesterId: string;
  reviewerId: string;
  title: string;
  description: string | null;
  status: "pending" | "in_review" | "approved" | "changes_requested" | "dismissed";
  branch: string | null;
  commitHash: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName?: string | null;
  reviewerName?: string | null;
}

interface CodeReviewProps {
  projectId: string;
  currentUserId: string;
  onNavigateToLine?: (fileId: string, filePath: string, line: number) => void;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  in_review: { label: "In Review", icon: Eye, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-500/10 text-green-400 border-green-500/30" },
  changes_requested: { label: "Changes Requested", icon: XCircle, color: "bg-red-500/10 text-red-400 border-red-500/30" },
  dismissed: { label: "Dismissed", icon: X, color: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CodeReview({ projectId, currentUserId, onNavigateToLine }: CodeReviewProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [newReview, setNewReview] = useState({ title: "", description: "", reviewerId: "", branch: "" });
  const [newComment, setNewComment] = useState("");
  const [commentFile, setCommentFile] = useState("");
  const [commentLine, setCommentLine] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const apiUrl = import.meta.env.VITE_API_URL || "";

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/reviews${statusParam}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch {
      toast({ title: "Failed to load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, apiUrl, toast]);

  const fetchReviewDetails = useCallback(async (reviewId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/reviews/${reviewId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedReview(data.review);
        setComments(data.comments || []);
      }
    } catch {
      toast({ title: "Failed to load review", variant: "destructive" });
    }
  }, [projectId, apiUrl, toast]);

  const createReview = useCallback(async () => {
    if (!newReview.title.trim() || !newReview.reviewerId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newReview),
      });
      if (res.ok) {
        toast({ title: "Review requested" });
        setShowCreateForm(false);
        setNewReview({ title: "", description: "", reviewerId: "", branch: "" });
        fetchReviews();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to create review", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to create review", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [newReview, projectId, apiUrl, toast, fetchReviews]);

  const updateStatus = useCallback(async (reviewId: string, status: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: `Review ${status.replace("_", " ")}` });
        fetchReviewDetails(reviewId);
        fetchReviews();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to update review", variant: "destructive" });
    }
  }, [projectId, apiUrl, toast, fetchReviewDetails, fetchReviews]);

  const addComment = useCallback(async () => {
    if (!selectedReview || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/reviews/${selectedReview.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: newComment,
          filePath: commentFile || null,
          lineNumber: commentLine ? parseInt(commentLine, 10) : null,
        }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        setCommentFile("");
        setCommentLine("");
      }
    } catch {
      toast({ title: "Failed to add comment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [selectedReview, newComment, commentFile, commentLine, projectId, apiUrl, toast]);

  const resolveComment = useCallback(async (commentId: string, resolved: boolean) => {
    if (!selectedReview) return;
    try {
      await fetch(`${apiUrl}/api/projects/${projectId}/reviews/${selectedReview.id}/comments/${commentId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resolved }),
      });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, resolved: resolved ? "true" : "false" } : c));
    } catch {
      toast({ title: "Failed to resolve comment", variant: "destructive" });
    }
  }, [selectedReview, projectId, apiUrl, toast]);

  const groupedComments = useMemo(() => {
    const groups = new Map<string, ReviewComment[]>();
    const general: ReviewComment[] = [];

    for (const c of comments) {
      if (c.filePath) {
        const key = c.filePath;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      } else {
        general.push(c);
      }
    }

    return { fileGroups: groups, general };
  }, [comments]);

  const toggleFileGroup = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  useState(() => { fetchReviews(); });

  if (selectedReview) {
    const config = STATUS_CONFIG[selectedReview.status];
    const StatusIcon = config.icon;
    const isReviewer = selectedReview.reviewerId === currentUserId;
    const unresolvedCount = comments.filter((c) => c.resolved !== "true" && !c.parentId).length;

    return (
      <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-gray-200">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(215,20%,25%)]">
          <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-white">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h3 className="text-sm font-medium truncate flex-1">{selectedReview.title}</h3>
          <Badge variant="outline" className={`text-[10px] ${config.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {selectedReview.description && (
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-[hsl(215,20%,25%)]">
            {selectedReview.description}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] text-gray-500 border-b border-[hsl(215,20%,25%)]">
          <span>By {selectedReview.requesterName || "Unknown"}</span>
          {selectedReview.branch && <span className="font-mono bg-[hsl(215,20%,20%)] px-1.5 py-0.5 rounded">{selectedReview.branch}</span>}
          <span>{timeAgo(selectedReview.createdAt)}</span>
          {unresolvedCount > 0 && (
            <span className="text-yellow-400">{unresolvedCount} unresolved</span>
          )}
        </div>

        {isReviewer && (selectedReview.status === "pending" || selectedReview.status === "in_review") && (
          <div className="flex gap-2 px-3 py-2 border-b border-[hsl(215,20%,25%)]">
            <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => updateStatus(selectedReview.id, "approved")}>
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => updateStatus(selectedReview.id, "changes_requested")}>
              <AlertCircle className="w-3 h-3 mr-1" /> Request Changes
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={() => updateStatus(selectedReview.id, "dismissed")}>
              Dismiss
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {groupedComments.general.length > 0 && (
            <div className="border-b border-[hsl(215,20%,25%)]">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase">General</div>
              {groupedComments.general.map((c) => (
                <CommentItem key={c.id} comment={c} onResolve={resolveComment} onNavigate={onNavigateToLine} />
              ))}
            </div>
          )}

          {Array.from(groupedComments.fileGroups.entries()).map(([filePath, fileComments]) => (
            <div key={filePath} className="border-b border-[hsl(215,20%,25%)]">
              <button
                onClick={() => toggleFileGroup(filePath)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:bg-[hsl(215,20%,18%)]"
              >
                {expandedFiles.has(filePath) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <FileCode className="w-3 h-3" />
                <span className="font-mono truncate">{filePath}</span>
                <span className="ml-auto text-gray-600">{fileComments.length}</span>
              </button>
              {expandedFiles.has(filePath) && fileComments.map((c) => (
                <CommentItem key={c.id} comment={c} onResolve={resolveComment} onNavigate={onNavigateToLine} />
              ))}
            </div>
          ))}

          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No comments yet</p>
            </div>
          )}
        </div>

        <div className="border-t border-[hsl(215,20%,25%)] px-3 py-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={commentFile}
              onChange={(e) => setCommentFile(e.target.value)}
              placeholder="File path (optional)"
              className="h-6 text-[11px] flex-1"
            />
            <Input
              value={commentLine}
              onChange={(e) => setCommentLine(e.target.value)}
              placeholder="Line"
              className="h-6 text-[11px] w-16"
              type="number"
            />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="text-xs min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addComment();
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="h-7 text-xs" onClick={addComment} disabled={!newComment.trim() || submitting}>
              {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
              Comment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-gray-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(215,20%,25%)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Code Reviews</h3>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? <X className="w-3 h-3" /> : <MessageSquare className="w-3 h-3 mr-1" />}
          {showCreateForm ? "" : "Request"}
        </Button>
      </div>

      {showCreateForm && (
        <div className="px-3 py-2 space-y-2 border-b border-[hsl(215,20%,25%)]">
          <Input
            value={newReview.title}
            onChange={(e) => setNewReview((p) => ({ ...p, title: e.target.value }))}
            placeholder="Review title"
            className="h-7 text-xs"
          />
          <Textarea
            value={newReview.description}
            onChange={(e) => setNewReview((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            className="text-xs min-h-[40px] resize-none"
          />
          <div className="flex gap-2">
            <Input
              value={newReview.reviewerId}
              onChange={(e) => setNewReview((p) => ({ ...p, reviewerId: e.target.value }))}
              placeholder="Reviewer ID"
              className="h-7 text-xs flex-1"
            />
            <Input
              value={newReview.branch}
              onChange={(e) => setNewReview((p) => ({ ...p, branch: e.target.value }))}
              placeholder="Branch"
              className="h-7 text-xs flex-1"
            />
          </div>
          <Button size="sm" className="h-7 text-xs w-full" onClick={createReview} disabled={submitting || !newReview.title.trim() || !newReview.reviewerId.trim()}>
            {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Request Review
          </Button>
        </div>
      )}

      <div className="flex gap-1 px-3 py-1.5 border-b border-[hsl(215,20%,25%)]">
        {["all", "pending", "in_review", "changes_requested", "approved"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setTimeout(fetchReviews, 0); }}
            className={`px-2 py-0.5 text-[10px] rounded ${statusFilter === s ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {s === "all" ? "All" : s === "changes_requested" ? "Changes" : s === "in_review" ? "In Review" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No reviews yet</p>
            <p className="text-[10px] mt-1 text-gray-600">Request a review to get started</p>
          </div>
        ) : (
          reviews.map((review) => {
            const cfg = STATUS_CONFIG[review.status];
            const Icon = cfg.icon;
            return (
              <button
                key={review.id}
                onClick={() => fetchReviewDetails(review.id)}
                className="w-full text-left px-3 py-2 border-b border-[hsl(215,20%,18%)] hover:bg-[hsl(215,20%,15%)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color.split(" ")[1]}`} />
                  <span className="text-xs font-medium truncate flex-1">{review.title}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(review.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{review.requesterName || "Unknown"}</span>
                  <span>→</span>
                  <span>{review.reviewerName || "Reviewer"}</span>
                  {review.branch && (
                    <span className="font-mono bg-[hsl(215,20%,20%)] px-1 py-0.5 rounded ml-auto">{review.branch}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onResolve,
  onNavigate,
}: {
  comment: ReviewComment;
  onResolve: (id: string, resolved: boolean) => void;
  onNavigate?: (fileId: string, filePath: string, line: number) => void;
}) {
  const isResolved = comment.resolved === "true";

  return (
    <div className={`px-3 py-2 text-xs border-b border-[hsl(215,20%,18%)] ${isResolved ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-gray-300">{comment.userName || "Unknown"}</span>
        {comment.lineNumber && (
          <button
            onClick={() => comment.filePath && comment.lineNumber && onNavigate?.(comment.fileId || "", comment.filePath, comment.lineNumber)}
            className="font-mono text-blue-400 hover:underline"
          >
            L{comment.lineNumber}{comment.lineEndNumber ? `-${comment.lineEndNumber}` : ""}
          </button>
        )}
        <span className="ml-auto text-[10px] text-gray-600">{timeAgo(comment.createdAt)}</span>
        <button
          onClick={() => onResolve(comment.id, !isResolved)}
          className={`p-0.5 rounded ${isResolved ? "text-green-400" : "text-gray-500 hover:text-green-400"}`}
          title={isResolved ? "Unresolve" : "Resolve"}
        >
          {isResolved ? <CheckCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        </button>
      </div>
      <p className="text-gray-400 whitespace-pre-wrap">{comment.content}</p>
    </div>
  );
}
