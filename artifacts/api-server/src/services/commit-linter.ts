export interface CommitRule {
  id: string;
  name: string;
  pattern: RegExp;
  message: string;
  severity: "error" | "warning";
  enabled: boolean;
}

export interface LintResult {
  valid: boolean;
  errors: { rule: string; message: string }[];
  warnings: { rule: string; message: string }[];
  suggestion: string | null;
}

const CONVENTIONAL_TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

class CommitLinterService {
  private rules: CommitRule[] = [
    { id: "conventional-format", name: "Conventional Commit Format", pattern: /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.+/, message: "Commit must follow conventional format: type(scope): description", severity: "error", enabled: true },
    { id: "max-subject-length", name: "Subject Length", pattern: /^.{1,72}$/m, message: "Subject line must be 72 characters or fewer", severity: "error", enabled: true },
    { id: "no-trailing-period", name: "No Trailing Period", pattern: /^[^]*[^.]$/, message: "Subject should not end with a period", severity: "warning", enabled: true },
    { id: "lowercase-subject", name: "Lowercase Subject", pattern: /^[a-z]+(\(.+\))?!?:\s[a-z]/, message: "Type and description should start lowercase", severity: "warning", enabled: true },
    { id: "no-empty-body-separator", name: "Body Separator", pattern: /^[^\n]+(\n\n|$)/, message: "Separate subject from body with a blank line", severity: "error", enabled: true },
    { id: "no-wip", name: "No WIP", pattern: /^(?!.*\bWIP\b)/i, message: "WIP commits should not be pushed", severity: "warning", enabled: true },
  ];

  lint(message: string): LintResult {
    const errors: { rule: string; message: string }[] = [];
    const warnings: { rule: string; message: string }[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!rule.pattern.test(message)) {
        if (rule.severity === "error") errors.push({ rule: rule.name, message: rule.message });
        else warnings.push({ rule: rule.name, message: rule.message });
      }
    }

    const suggestion = errors.length > 0 ? this.suggest(message) : null;
    return { valid: errors.length === 0, errors, warnings, suggestion };
  }

  getRules(): CommitRule[] {
    return this.rules.map(r => ({ ...r, pattern: r.pattern }));
  }

  toggleRule(id: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  addRule(rule: Omit<CommitRule, "id">): CommitRule {
    const entry: CommitRule = { ...rule, id: `cr-${Date.now()}` };
    this.rules.push(entry);
    return entry;
  }

  private suggest(message: string): string {
    const trimmed = message.trim();
    const match = trimmed.match(/^(\w+)[\s:]+(.*)$/);
    if (match) {
      const type = match[1].toLowerCase();
      const desc = match[2].replace(/\.$/, "").toLowerCase();
      const validType = CONVENTIONAL_TYPES.includes(type) ? type : "feat";
      return `${validType}: ${desc}`;
    }
    return `feat: ${trimmed.toLowerCase().slice(0, 70)}`;
  }
}

export const commitLinterService = new CommitLinterService();
