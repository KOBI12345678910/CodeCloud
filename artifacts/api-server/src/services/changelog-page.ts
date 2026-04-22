export interface ChangelogItem {
  id: string;
  version: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "bugfix" | "breaking";
  tags: string[];
  publishedAt: Date;
  author: string;
}

class ChangelogPageService {
  private items: ChangelogItem[] = [];

  add(data: Omit<ChangelogItem, "id" | "publishedAt">): ChangelogItem {
    const item: ChangelogItem = { ...data, id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, publishedAt: new Date() };
    this.items.push(item);
    return item;
  }

  list(type?: ChangelogItem["type"]): ChangelogItem[] {
    let result = [...this.items].reverse();
    if (type) result = result.filter(i => i.type === type);
    return result;
  }

  get(id: string): ChangelogItem | null { return this.items.find(i => i.id === id) || null; }
  update(id: string, updates: Partial<Omit<ChangelogItem, "id" | "publishedAt">>): ChangelogItem | null {
    const item = this.items.find(i => i.id === id); if (!item) return null;
    Object.assign(item, updates); return item;
  }
  delete(id: string): boolean { const idx = this.items.findIndex(i => i.id === id); if (idx === -1) return false; this.items.splice(idx, 1); return true; }
}

export const changelogPageService = new ChangelogPageService();
