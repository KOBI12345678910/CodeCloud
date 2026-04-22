export interface StyleRule {
  id: string;
  name: string;
  from: string;
  to: string;
  category: "indentation" | "quotes" | "semicolons" | "trailing-comma" | "line-endings" | "other";
}

export interface MigrationPreview {
  file: string;
  original: string;
  transformed: string;
  changeCount: number;
}

export interface MigrationResult {
  id: string;
  rules: StyleRule[];
  filesChanged: number;
  totalChanges: number;
  timestamp: Date;
  reverted: boolean;
}

class StyleMigrationService {
  private history: MigrationResult[] = [];

  getAvailableRules(): StyleRule[] {
    return [
      { id: "tabs-to-spaces", name: "Tabs → Spaces (2)", from: "tabs", to: "spaces-2", category: "indentation" },
      { id: "spaces-to-tabs", name: "Spaces → Tabs", from: "spaces", to: "tabs", category: "indentation" },
      { id: "single-to-double", name: "Single → Double Quotes", from: "'", to: '"', category: "quotes" },
      { id: "double-to-single", name: "Double → Single Quotes", from: '"', to: "'", category: "quotes" },
      { id: "add-semicolons", name: "Add Semicolons", from: "no-semi", to: "semi", category: "semicolons" },
      { id: "remove-semicolons", name: "Remove Semicolons", from: "semi", to: "no-semi", category: "semicolons" },
      { id: "add-trailing-comma", name: "Add Trailing Commas", from: "none", to: "all", category: "trailing-comma" },
      { id: "crlf-to-lf", name: "CRLF → LF", from: "crlf", to: "lf", category: "line-endings" },
    ];
  }

  preview(content: string, ruleIds: string[]): MigrationPreview {
    const rules = this.getAvailableRules().filter(r => ruleIds.includes(r.id));
    let transformed = content;
    let changeCount = 0;

    for (const rule of rules) {
      const before = transformed;
      transformed = this.applyRule(transformed, rule);
      if (transformed !== before) changeCount++;
    }

    return { file: "preview", original: content, transformed, changeCount };
  }

  migrate(files: { path: string; content: string }[], ruleIds: string[]): MigrationResult {
    const rules = this.getAvailableRules().filter(r => ruleIds.includes(r.id));
    let totalChanges = 0;
    let filesChanged = 0;

    for (const file of files) {
      let transformed = file.content;
      for (const rule of rules) transformed = this.applyRule(transformed, rule);
      if (transformed !== file.content) {
        filesChanged++;
        totalChanges++;
      }
    }

    const result: MigrationResult = {
      id: `mig-${Date.now()}`, rules, filesChanged, totalChanges,
      timestamp: new Date(), reverted: false,
    };
    this.history.push(result);
    return result;
  }

  getHistory(): MigrationResult[] {
    return [...this.history].reverse();
  }

  revert(migrationId: string): boolean {
    const migration = this.history.find(m => m.id === migrationId);
    if (!migration || migration.reverted) return false;
    migration.reverted = true;
    return true;
  }

  private applyRule(content: string, rule: StyleRule): string {
    switch (rule.id) {
      case "tabs-to-spaces": return content.replace(/\t/g, "  ");
      case "spaces-to-tabs": return content.replace(/^( {2})+/gm, m => "\t".repeat(m.length / 2));
      case "single-to-double": return content.replace(/'/g, '"');
      case "double-to-single": return content.replace(/"/g, "'");
      case "crlf-to-lf": return content.replace(/\r\n/g, "\n");
      default: return content;
    }
  }
}

export const styleMigrationService = new StyleMigrationService();
