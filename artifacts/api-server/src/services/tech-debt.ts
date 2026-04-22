export interface TechDebtItem {
  id: string;
  type: "todo" | "deprecated" | "outdated-dep" | "missing-test" | "code-smell";
  file: string;
  line: number | null;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  effort: "trivial" | "small" | "medium" | "large";
  detectedAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
}

export interface TechDebtReport {
  generatedAt: Date;
  totalItems: number;
  resolvedItems: number;
  score: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  items: TechDebtItem[];
}

class TechDebtService {
  private items: TechDebtItem[] = [];

  scan(files: { path: string; content: string }[]): TechDebtItem[] {
    const found: TechDebtItem[] = [];
    let counter = 0;

    for (const file of files) {
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)/i.test(line)) {
          found.push(this.createItem(`td-${++counter}`, "todo", file.path, i + 1,
            line.trim(), "low", "trivial"));
        }
        if (/@deprecated|\.deprecated\b/i.test(line)) {
          found.push(this.createItem(`td-${++counter}`, "deprecated", file.path, i + 1,
            "Deprecated API usage detected", "medium", "medium"));
        }
        if (/any\b/.test(line) && file.path.endsWith(".ts")) {
          found.push(this.createItem(`td-${++counter}`, "code-smell", file.path, i + 1,
            "Usage of 'any' type — consider explicit typing", "low", "small"));
        }
        if (/console\.(log|debug)\(/.test(line) && !file.path.includes("test")) {
          found.push(this.createItem(`td-${++counter}`, "code-smell", file.path, i + 1,
            "Console statement in production code", "low", "trivial"));
        }
      }
    }

    this.items = [...this.items, ...found];
    return found;
  }

  getReport(): TechDebtReport {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const item of this.items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    }

    const resolved = this.items.filter(i => i.resolved).length;
    const total = this.items.length;
    const score = total === 0 ? 100 : Math.round((resolved / total) * 100);

    return {
      generatedAt: new Date(), totalItems: total, resolvedItems: resolved,
      score, byType, bySeverity, items: this.items,
    };
  }

  resolve(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;
    item.resolved = true;
    item.resolvedAt = new Date();
    return true;
  }

  getItems(type?: string, severity?: string): TechDebtItem[] {
    let results = [...this.items];
    if (type) results = results.filter(i => i.type === type);
    if (severity) results = results.filter(i => i.severity === severity);
    return results;
  }

  private createItem(id: string, type: TechDebtItem["type"], file: string, line: number | null,
    description: string, severity: TechDebtItem["severity"], effort: TechDebtItem["effort"]): TechDebtItem {
    return { id, type, file, line, description, severity, effort, detectedAt: new Date(), resolved: false, resolvedAt: null };
  }
}

export const techDebtService = new TechDebtService();
