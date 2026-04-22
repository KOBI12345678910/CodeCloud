export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string;
  tags: string[];
  projectId: string;
  createdBy: string;
  isPublic: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

class CodeSnippetsService {
  private snippets: Map<string, CodeSnippet> = new Map();

  create(data: Omit<CodeSnippet, "id" | "likes" | "createdAt" | "updatedAt">): CodeSnippet {
    const id = `snip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snippet: CodeSnippet = { ...data, id, likes: 0, createdAt: new Date(), updatedAt: new Date() };
    this.snippets.set(id, snippet);
    return snippet;
  }

  update(id: string, updates: Partial<Pick<CodeSnippet, "title" | "code" | "description" | "tags" | "isPublic">>): CodeSnippet | null {
    const s = this.snippets.get(id); if (!s) return null; Object.assign(s, updates, { updatedAt: new Date() }); return s;
  }

  delete(id: string): boolean { return this.snippets.delete(id); }
  get(id: string): CodeSnippet | null { return this.snippets.get(id) || null; }

  list(projectId?: string, language?: string): CodeSnippet[] {
    let all = Array.from(this.snippets.values());
    if (projectId) all = all.filter(s => s.projectId === projectId);
    if (language) all = all.filter(s => s.language === language);
    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  search(query: string): CodeSnippet[] {
    const q = query.toLowerCase();
    return Array.from(this.snippets.values()).filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)));
  }

  like(id: string): boolean { const s = this.snippets.get(id); if (!s) return false; s.likes++; return true; }
}

export const codeSnippetsService = new CodeSnippetsService();
