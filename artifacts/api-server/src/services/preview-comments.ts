export interface PreviewComment {
  id: string;
  deploymentId: string;
  userId: string;
  userName: string;
  text: string;
  x: number;
  y: number;
  page: string;
  resolved: boolean;
  replies: { id: string; userId: string; userName: string; text: string; createdAt: Date }[];
  createdAt: Date;
}

class PreviewCommentsService {
  private comments: Map<string, PreviewComment> = new Map();

  create(data: Omit<PreviewComment, "id" | "resolved" | "replies" | "createdAt">): PreviewComment {
    const id = `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const comment: PreviewComment = { ...data, id, resolved: false, replies: [], createdAt: new Date() };
    this.comments.set(id, comment);
    return comment;
  }

  reply(id: string, userId: string, userName: string, text: string): PreviewComment | null {
    const c = this.comments.get(id); if (!c) return null;
    c.replies.push({ id: `reply-${c.replies.length + 1}`, userId, userName, text, createdAt: new Date() });
    return c;
  }

  resolve(id: string): boolean { const c = this.comments.get(id); if (!c) return false; c.resolved = true; return true; }
  get(id: string): PreviewComment | null { return this.comments.get(id) || null; }
  list(deploymentId: string): PreviewComment[] { return Array.from(this.comments.values()).filter(c => c.deploymentId === deploymentId); }
  delete(id: string): boolean { return this.comments.delete(id); }
}

export const previewCommentsService = new PreviewCommentsService();
