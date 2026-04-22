export interface ChangelogEntry {
  id: string;
  version: string;
  date: Date;
  categories: { type: string; items: string[] }[];
  breaking: string[];
  summary: string;
}

class DiffChangelogService {
  private entries: ChangelogEntry[] = [];

  generate(version: string, diff: string): ChangelogEntry {
    const lines = diff.split("\n").filter(l => l.startsWith("+") || l.startsWith("-"));
    const added = lines.filter(l => l.startsWith("+")).length;
    const removed = lines.filter(l => l.startsWith("-")).length;

    const categories: { type: string; items: string[] }[] = [];
    if (added > removed) categories.push({ type: "Added", items: [`${added - removed} new lines of code`] });
    if (removed > 0) categories.push({ type: "Removed", items: [`${removed} lines removed`] });
    if (diff.includes("fix") || diff.includes("bug")) categories.push({ type: "Fixed", items: ["Bug fixes applied"] });
    if (diff.includes("feat") || diff.includes("feature")) categories.push({ type: "Features", items: ["New features added"] });
    if (diff.includes("refactor")) categories.push({ type: "Changed", items: ["Code refactored"] });
    if (diff.includes("deps") || diff.includes("package")) categories.push({ type: "Dependencies", items: ["Dependencies updated"] });

    const breaking = diff.includes("BREAKING") ? ["Breaking changes detected — review migration guide"] : [];

    const entry: ChangelogEntry = {
      id: `cl-${Date.now()}`, version, date: new Date(),
      categories: categories.length > 0 ? categories : [{ type: "Changed", items: ["General updates"] }],
      breaking,
      summary: `Version ${version}: ${added} additions, ${removed} deletions across ${lines.length} changes`,
    };
    this.entries.unshift(entry);
    return entry;
  }

  list(): ChangelogEntry[] { return this.entries; }
  get(id: string): ChangelogEntry | null { return this.entries.find(e => e.id === id) || null; }

  render(entry: ChangelogEntry): string {
    let md = `# ${entry.version} (${entry.date.toISOString().split("T")[0]})\n\n`;
    md += `${entry.summary}\n\n`;
    for (const cat of entry.categories) {
      md += `## ${cat.type}\n`;
      for (const item of cat.items) md += `- ${item}\n`;
      md += "\n";
    }
    if (entry.breaking.length > 0) {
      md += "## ⚠️ Breaking Changes\n";
      for (const b of entry.breaking) md += `- ${b}\n`;
    }
    return md;
  }
}

export const diffChangelogService = new DiffChangelogService();
