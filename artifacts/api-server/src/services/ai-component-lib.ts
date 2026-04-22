export interface ComponentPattern {
  id: string;
  name: string;
  type: "button" | "card" | "form" | "modal" | "list" | "layout" | "navigation" | "other";
  occurrences: number;
  files: string[];
  extractable: boolean;
  suggestedProps: string[];
  complexity: "simple" | "medium" | "complex";
}

export interface ComponentLibrary {
  id: string;
  projectId: string;
  patterns: ComponentPattern[];
  totalComponents: number;
  extractableCount: number;
  documentation: string;
  analyzedAt: Date;
}

class AIComponentLibService {
  private libraries: ComponentLibrary[] = [];

  analyze(projectId: string, files: { path: string; content: string }[]): ComponentLibrary {
    const patterns: ComponentPattern[] = [];
    let counter = 0;

    const componentFiles = files.filter(f => f.path.endsWith(".tsx") || f.path.endsWith(".jsx"));

    for (const file of componentFiles) {
      const content = file.content;
      if (content.includes("<button") || content.includes("<Button")) {
        const existing = patterns.find(p => p.type === "button");
        if (existing) { existing.occurrences++; existing.files.push(file.path); }
        else patterns.push({ id: `cp-${++counter}`, name: "Button", type: "button", occurrences: 1, files: [file.path], extractable: true, suggestedProps: ["variant", "size", "onClick", "disabled", "children"], complexity: "simple" });
      }
      if (content.includes("className=\"card") || content.includes("Card")) {
        const existing = patterns.find(p => p.type === "card");
        if (existing) { existing.occurrences++; existing.files.push(file.path); }
        else patterns.push({ id: `cp-${++counter}`, name: "Card", type: "card", occurrences: 1, files: [file.path], extractable: true, suggestedProps: ["title", "description", "children", "footer"], complexity: "simple" });
      }
      if (content.includes("<form") || content.includes("<Form")) {
        patterns.push({ id: `cp-${++counter}`, name: `Form-${file.path.split("/").pop()}`, type: "form", occurrences: 1, files: [file.path], extractable: true, suggestedProps: ["onSubmit", "initialValues", "validation"], complexity: "medium" });
      }
      if (content.includes("modal") || content.includes("Modal") || content.includes("Dialog")) {
        patterns.push({ id: `cp-${++counter}`, name: "Modal", type: "modal", occurrences: 1, files: [file.path], extractable: true, suggestedProps: ["isOpen", "onClose", "title", "children"], complexity: "medium" });
      }
    }

    const lib: ComponentLibrary = {
      id: `lib-${Date.now()}`, projectId, patterns,
      totalComponents: patterns.length,
      extractableCount: patterns.filter(p => p.extractable).length,
      documentation: this.generateDocs(patterns),
      analyzedAt: new Date(),
    };
    this.libraries.push(lib);
    return lib;
  }

  list(projectId?: string): ComponentLibrary[] {
    return projectId ? this.libraries.filter(l => l.projectId === projectId) : this.libraries;
  }

  private generateDocs(patterns: ComponentPattern[]): string {
    let md = "# Component Library\n\n";
    for (const p of patterns) {
      md += `## ${p.name}\n- Type: ${p.type}\n- Occurrences: ${p.occurrences}\n- Props: ${p.suggestedProps.join(", ")}\n- Files: ${p.files.join(", ")}\n\n`;
    }
    return md;
  }
}

export const aiComponentLibService = new AIComponentLibService();
