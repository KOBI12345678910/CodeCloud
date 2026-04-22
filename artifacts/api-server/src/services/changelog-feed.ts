export interface ChangelogEntry {
  id: string;
  projectId: string;
  version: string;
  title: string;
  description: string;
  changes: { type: "added" | "changed" | "fixed" | "removed"; text: string }[];
  publishedAt: Date;
}

class ChangelogFeedService {
  private entries: ChangelogEntry[] = [];

  add(data: Omit<ChangelogEntry, "id" | "publishedAt">): ChangelogEntry {
    const entry: ChangelogEntry = { ...data, id: `cl-${Date.now()}`, publishedAt: new Date() };
    this.entries.push(entry);
    return entry;
  }

  list(projectId: string): ChangelogEntry[] { return this.entries.filter(e => e.projectId === projectId).reverse(); }
  get(id: string): ChangelogEntry | null { return this.entries.find(e => e.id === id) || null; }
  delete(id: string): boolean { const i = this.entries.findIndex(e => e.id === id); if (i === -1) return false; this.entries.splice(i, 1); return true; }

  toRSS(projectId: string, baseUrl: string): string {
    const items = this.list(projectId);
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Changelog</title><link>${baseUrl}</link><description>Project Changelog</description>
${items.map(i => `<item><title>${i.title}</title><description>${i.description}</description><pubDate>${i.publishedAt.toUTCString()}</pubDate><guid>${i.id}</guid></item>`).join("\n")}
</channel></rss>`;
  }

  toAtom(projectId: string, baseUrl: string): string {
    const items = this.list(projectId);
    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Changelog</title><link href="${baseUrl}"/><id>${baseUrl}</id>
${items.map(i => `<entry><title>${i.title}</title><summary>${i.description}</summary><updated>${i.publishedAt.toISOString()}</updated><id>${i.id}</id></entry>`).join("\n")}
</feed>`;
  }
}

export const changelogFeedService = new ChangelogFeedService();
