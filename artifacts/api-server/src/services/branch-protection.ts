export interface BranchRule {
  id: string;
  pattern: string;
  requireReviews: boolean;
  requiredReviewers: number;
  requirePassingTests: boolean;
  requiredChecks: string[];
  blockForcePush: boolean;
  requireSignedCommits: boolean;
  enforceNamingConvention: boolean;
  namingPattern: string | null;
  allowDeletions: boolean;
  allowAdminBypass: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProtectionCheckResult {
  allowed: boolean;
  violations: string[];
  branch: string;
  rule: string | null;
}

class BranchProtectionService {
  private rules: Map<string, BranchRule> = new Map();

  createRule(data: Omit<BranchRule, "id" | "createdAt" | "updatedAt">): BranchRule {
    const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rule: BranchRule = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    this.rules.set(id, rule);
    return rule;
  }

  updateRule(id: string, updates: Partial<Omit<BranchRule, "id" | "createdAt">>): BranchRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;
    Object.assign(rule, updates, { updatedAt: new Date() });
    return rule;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRule(id: string): BranchRule | null {
    return this.rules.get(id) || null;
  }

  listRules(): BranchRule[] {
    return Array.from(this.rules.values());
  }

  checkPush(branch: string, opts: { forcePush?: boolean; signed?: boolean; testsPass?: boolean; reviewCount?: number; checks?: Record<string, boolean> }): ProtectionCheckResult {
    const rule = this.findMatchingRule(branch);
    if (!rule || !rule.enabled) return { allowed: true, violations: [], branch, rule: null };

    const violations: string[] = [];

    if (rule.blockForcePush && opts.forcePush) {
      violations.push("Force push is blocked on this branch");
    }
    if (rule.requireSignedCommits && !opts.signed) {
      violations.push("Commits must be signed");
    }
    if (rule.requirePassingTests && !opts.testsPass) {
      violations.push("All tests must pass before push");
    }
    if (rule.requireReviews && (opts.reviewCount || 0) < rule.requiredReviewers) {
      violations.push(`Requires ${rule.requiredReviewers} review(s), got ${opts.reviewCount || 0}`);
    }
    if (rule.requiredChecks.length > 0 && opts.checks) {
      for (const check of rule.requiredChecks) {
        if (!opts.checks[check]) violations.push(`Required check "${check}" has not passed`);
      }
    }

    return { allowed: violations.length === 0, violations, branch, rule: rule.id };
  }

  checkBranchName(name: string): { valid: boolean; pattern: string | null; message: string | null } {
    for (const rule of this.rules.values()) {
      if (!rule.enabled || !rule.enforceNamingConvention || !rule.namingPattern) continue;
      try {
        const regex = new RegExp(rule.namingPattern);
        if (!regex.test(name)) {
          return { valid: false, pattern: rule.namingPattern, message: `Branch name "${name}" does not match required pattern: ${rule.namingPattern}` };
        }
      } catch { continue; }
    }
    return { valid: true, pattern: null, message: null };
  }

  private findMatchingRule(branch: string): BranchRule | null {
    for (const rule of this.rules.values()) {
      try {
        if (new RegExp(rule.pattern).test(branch)) return rule;
      } catch {
        if (rule.pattern === branch) return rule;
      }
    }
    return null;
  }
}

export const branchProtectionService = new BranchProtectionService();
