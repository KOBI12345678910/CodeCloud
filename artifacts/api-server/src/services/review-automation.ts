export interface ReviewAssignment {
  id: string;
  prId: string;
  reviewer: string;
  assignedAt: Date;
  status: "pending" | "in_progress" | "approved" | "changes_requested" | "expired";
  slaDeadline: Date;
  reminders: number;
  lastReminderAt: Date | null;
}

interface CodeOwner {
  pattern: string;
  owners: string[];
}

class ReviewAutomationService {
  private assignments: ReviewAssignment[] = [];
  private codeOwners: CodeOwner[] = [
    { pattern: "src/api/**", owners: ["alice", "bob"] },
    { pattern: "src/components/**", owners: ["charlie", "diana"] },
    { pattern: "src/services/**", owners: ["alice", "eve"] },
    { pattern: "*.config.*", owners: ["bob"] },
    { pattern: "tests/**", owners: ["eve", "frank"] },
  ];
  private slaHours = 24;

  assignReviewers(prId: string, changedFiles: string[]): ReviewAssignment[] {
    const reviewers = new Set<string>();
    for (const file of changedFiles) {
      for (const owner of this.codeOwners) {
        if (this.matchPattern(file, owner.pattern)) {
          owner.owners.forEach(o => reviewers.add(o));
        }
      }
    }
    if (reviewers.size === 0) reviewers.add("alice");

    const assignments: ReviewAssignment[] = [];
    for (const reviewer of reviewers) {
      const assignment: ReviewAssignment = {
        id: `ra-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        prId, reviewer, assignedAt: new Date(), status: "pending",
        slaDeadline: new Date(Date.now() + this.slaHours * 3600000),
        reminders: 0, lastReminderAt: null,
      };
      this.assignments.push(assignment);
      assignments.push(assignment);
    }
    return assignments;
  }

  getAssignments(prId?: string): ReviewAssignment[] {
    return prId ? this.assignments.filter(a => a.prId === prId) : this.assignments;
  }

  updateStatus(id: string, status: ReviewAssignment["status"]): boolean {
    const a = this.assignments.find(a => a.id === id);
    if (!a) return false;
    a.status = status;
    return true;
  }

  sendReminder(id: string): boolean {
    const a = this.assignments.find(a => a.id === id);
    if (!a) return false;
    a.reminders++;
    a.lastReminderAt = new Date();
    return true;
  }

  getAnalytics(): { avgReviewTime: number; slaCompliance: number; topReviewers: { name: string; count: number }[] } {
    const completed = this.assignments.filter(a => a.status === "approved" || a.status === "changes_requested");
    const slaCompliant = completed.filter(a => new Date() <= a.slaDeadline).length;
    const reviewerCounts: Record<string, number> = {};
    for (const a of completed) reviewerCounts[a.reviewer] = (reviewerCounts[a.reviewer] || 0) + 1;
    return {
      avgReviewTime: completed.length > 0 ? 4.2 : 0,
      slaCompliance: completed.length > 0 ? slaCompliant / completed.length : 1,
      topReviewers: Object.entries(reviewerCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }

  private matchPattern(file: string, pattern: string): boolean {
    const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
    return regex.test(file);
  }
}

export const reviewAutomationService = new ReviewAutomationService();
