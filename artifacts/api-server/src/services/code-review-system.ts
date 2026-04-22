export interface CodeReview { id: string; projectId: string; title: string; description: string; author: string; reviewers: string[]; status: "open" | "approved" | "changes_requested" | "merged" | "closed"; files: { path: string; additions: number; deletions: number }[]; comments: { id: string; author: string; file: string; line: number; body: string; resolved: boolean; createdAt: Date }[]; createdAt: Date; }
class CodeReviewSystemService {
  private reviews: Map<string, CodeReview> = new Map();
  create(data: { projectId: string; title: string; description: string; author: string; reviewers: string[]; files: { path: string; additions: number; deletions: number }[] }): CodeReview {
    const id = `cr-${Date.now()}`; const r: CodeReview = { id, ...data, status: "open", comments: [], createdAt: new Date() }; this.reviews.set(id, r); return r;
  }
  addComment(reviewId: string, data: { author: string; file: string; line: number; body: string }): CodeReview | null {
    const r = this.reviews.get(reviewId); if (!r) return null;
    r.comments.push({ id: `cmt-${Date.now()}`, ...data, resolved: false, createdAt: new Date() }); return r;
  }
  approve(id: string): CodeReview | null { const r = this.reviews.get(id); if (!r) return null; r.status = "approved"; return r; }
  requestChanges(id: string): CodeReview | null { const r = this.reviews.get(id); if (!r) return null; r.status = "changes_requested"; return r; }
  merge(id: string): CodeReview | null { const r = this.reviews.get(id); if (!r) return null; r.status = "merged"; return r; }
  get(id: string): CodeReview | null { return this.reviews.get(id) || null; }
  listByProject(projectId: string): CodeReview[] { return Array.from(this.reviews.values()).filter(r => r.projectId === projectId); }
}
export const codeReviewSystemService = new CodeReviewSystemService();
