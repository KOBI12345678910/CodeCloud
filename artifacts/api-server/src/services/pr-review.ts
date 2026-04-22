export interface PRReviewResult {
  prId: string;
  repository: string;
  title: string;
  author: string;
  status: "approved" | "changes_requested" | "commented";
  summary: string;
  comments: PRComment[];
  codeQuality: { score: number; issues: string[] };
  styleChecks: { passed: number; failed: number; warnings: number };
  reviewedAt: string;
}

export interface PRComment {
  file: string;
  line: number;
  severity: "suggestion" | "warning" | "error";
  message: string;
  suggestedFix?: string;
}

export function reviewPR(prId: string, repo: string, changes: { file: string; additions: number; deletions: number }[]): PRReviewResult {
  const comments: PRComment[] = [];
  const issues: string[] = [];

  for (const change of changes.slice(0, 5)) {
    if (Math.random() > 0.5) {
      comments.push({
        file: change.file,
        line: Math.floor(Math.random() * 100) + 1,
        severity: Math.random() > 0.7 ? "error" : Math.random() > 0.4 ? "warning" : "suggestion",
        message: ["Consider extracting this logic into a separate function", "This variable is declared but never used", "Missing error handling for async operation", "Magic number should be a named constant", "Consider using optional chaining here"][Math.floor(Math.random() * 5)],
        suggestedFix: Math.random() > 0.5 ? "const result = await handleError(operation());" : undefined,
      });
    }
    if (Math.random() > 0.7) issues.push(`Complex function in ${change.file}`);
  }

  const hasErrors = comments.some(c => c.severity === "error");
  return {
    prId,
    repository: repo,
    title: `PR #${prId}`,
    author: "developer",
    status: hasErrors ? "changes_requested" : comments.length > 0 ? "commented" : "approved",
    summary: `Reviewed ${changes.length} files. Found ${comments.length} items to address.`,
    comments,
    codeQuality: { score: Math.floor(Math.random() * 30) + 70, issues },
    styleChecks: { passed: Math.floor(Math.random() * 20) + 10, failed: Math.floor(Math.random() * 3), warnings: Math.floor(Math.random() * 5) },
    reviewedAt: new Date().toISOString(),
  };
}
