export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed" | "wontfix";
  priority: "critical" | "high" | "medium" | "low";
  assignee: string | null;
  labels: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  comments: { id: string; userId: string; text: string; createdAt: Date }[];
}

class IssueTrackerService {
  private issues: Map<string, Issue> = new Map();

  create(data: { projectId: string; title: string; description: string; priority?: Issue["priority"]; labels?: string[]; createdBy: string }): Issue {
    const id = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const issue: Issue = {
      id, projectId: data.projectId, title: data.title, description: data.description,
      status: "open", priority: data.priority || "medium", assignee: null,
      labels: data.labels || [], createdBy: data.createdBy, createdAt: new Date(), updatedAt: new Date(), comments: [],
    };
    this.issues.set(id, issue);
    return issue;
  }

  update(id: string, updates: Partial<Pick<Issue, "title" | "description" | "status" | "priority" | "assignee" | "labels">>): Issue | null {
    const issue = this.issues.get(id); if (!issue) return null;
    Object.assign(issue, updates, { updatedAt: new Date() });
    return issue;
  }

  addComment(id: string, userId: string, text: string): Issue | null {
    const issue = this.issues.get(id); if (!issue) return null;
    issue.comments.push({ id: `c-${issue.comments.length + 1}`, userId, text, createdAt: new Date() });
    issue.updatedAt = new Date();
    return issue;
  }

  get(id: string): Issue | null { return this.issues.get(id) || null; }
  list(projectId: string, status?: Issue["status"]): Issue[] {
    let all = Array.from(this.issues.values()).filter(i => i.projectId === projectId);
    if (status) all = all.filter(i => i.status === status);
    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  delete(id: string): boolean { return this.issues.delete(id); }

  getStats(projectId: string): Record<string, number> {
    const issues = Array.from(this.issues.values()).filter(i => i.projectId === projectId);
    const stats: Record<string, number> = { total: issues.length };
    for (const i of issues) stats[i.status] = (stats[i.status] || 0) + 1;
    return stats;
  }
}

export const issueTrackerService = new IssueTrackerService();
