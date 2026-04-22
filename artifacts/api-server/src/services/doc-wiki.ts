export interface WikiPage {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  content: string;
  parentId: string | null;
  order: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class DocWikiService {
  private pages: Map<string, WikiPage> = new Map();

  create(data: { projectId: string; slug: string; title: string; content: string; parentId?: string; createdBy: string }): WikiPage {
    const id = `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const page: WikiPage = {
      id, projectId: data.projectId, slug: data.slug, title: data.title, content: data.content,
      parentId: data.parentId || null, order: this.pages.size,
      createdBy: data.createdBy, updatedBy: data.createdBy, createdAt: new Date(), updatedAt: new Date(),
    };
    this.pages.set(id, page);
    return page;
  }

  update(id: string, updates: Partial<Pick<WikiPage, "title" | "content" | "slug" | "parentId" | "order">>, updatedBy: string): WikiPage | null {
    const page = this.pages.get(id);
    if (!page) return null;
    Object.assign(page, updates, { updatedBy, updatedAt: new Date() });
    return page;
  }

  delete(id: string): boolean { return this.pages.delete(id); }
  get(id: string): WikiPage | null { return this.pages.get(id) || null; }

  listByProject(projectId: string): WikiPage[] {
    return Array.from(this.pages.values()).filter(p => p.projectId === projectId).sort((a, b) => a.order - b.order);
  }

  getBySlug(projectId: string, slug: string): WikiPage | null {
    return Array.from(this.pages.values()).find(p => p.projectId === projectId && p.slug === slug) || null;
  }

  search(projectId: string, query: string): WikiPage[] {
    const q = query.toLowerCase();
    return Array.from(this.pages.values()).filter(p => p.projectId === projectId && (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)));
  }

  getTree(projectId: string): any[] {
    const pages = this.listByProject(projectId);
    const roots = pages.filter(p => !p.parentId);
    const buildTree = (parent: WikiPage): any => ({
      ...parent, children: pages.filter(p => p.parentId === parent.id).map(buildTree),
    });
    return roots.map(buildTree);
  }
}

export const docWikiService = new DocWikiService();
