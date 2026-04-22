export interface CommitReview {
  commitHash: string;
  author: string;
  message: string;
  reviewedAt: Date;
  score: number;
  findings: CommitFinding[];
  summary: string;
}

export interface CommitFinding {
  type: "security" | "performance" | "best-practice" | "test-coverage";
  severity: "info" | "warning" | "error";
  file: string;
  line: number | null;
  message: string;
  suggestion: string;
}

class AICommitReviewService {
  private reviews: Map<string, CommitReview> = new Map();

  review(commitHash: string, author: string, message: string, diff: string): CommitReview {
    const findings = this.analyzeDiff(diff);
    const score = Math.max(0, 100 - findings.reduce((s, f) => s + (f.severity === "error" ? 20 : f.severity === "warning" ? 10 : 2), 0));

    const review: CommitReview = {
      commitHash, author, message, reviewedAt: new Date(), score, findings,
      summary: score >= 90 ? "Clean commit — no significant issues" :
        score >= 70 ? "Minor issues found — review suggested improvements" :
        "Issues detected — address before merging",
    };
    this.reviews.set(commitHash, review);
    return review;
  }

  getReview(commitHash: string): CommitReview | null {
    return this.reviews.get(commitHash) || null;
  }

  getReviews(limit = 20): CommitReview[] {
    return Array.from(this.reviews.values())
      .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime())
      .slice(0, limit);
  }

  private analyzeDiff(diff: string): CommitFinding[] {
    const findings: CommitFinding[] = [];
    const lines = diff.split("\n");
    let currentFile = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("+++")) {
        currentFile = line.replace("+++ b/", "");
        continue;
      }

      if (!line.startsWith("+") || line.startsWith("+++")) continue;
      const content = line.slice(1);

      if (/password\s*=\s*["'][^"']+["']|api_?key\s*=\s*["'][^"']+["']|secret\s*=\s*["'][^"']+["']/i.test(content)) {
        findings.push({ type: "security", severity: "error", file: currentFile, line: i, message: "Hardcoded credential detected", suggestion: "Use environment variables for secrets" });
      }
      if (/eval\(|new Function\(|innerHTML\s*=/.test(content)) {
        findings.push({ type: "security", severity: "warning", file: currentFile, line: i, message: "Potentially unsafe code pattern", suggestion: "Avoid eval/innerHTML — use safer alternatives" });
      }
      if (/console\.(log|debug|info)\(/.test(content) && !currentFile.includes("test")) {
        findings.push({ type: "best-practice", severity: "info", file: currentFile, line: i, message: "Console statement in production code", suggestion: "Remove or use a proper logging library" });
      }
      if (/SELECT\s+\*\s+FROM/i.test(content)) {
        findings.push({ type: "performance", severity: "warning", file: currentFile, line: i, message: "SELECT * query — fetches unnecessary columns", suggestion: "Select only required columns" });
      }
      if (/\.forEach\(.*await/.test(content)) {
        findings.push({ type: "performance", severity: "warning", file: currentFile, line: i, message: "Await inside forEach — runs sequentially", suggestion: "Use Promise.all with map for parallel execution" });
      }
    }

    return findings;
  }
}

export const aiCommitReviewService = new AICommitReviewService();
