export interface SearchResult { id: string; type: "project" | "file" | "user" | "template" | "snippet"; title: string; description: string; url: string; score: number; highlights: string[]; }
class SearchIndexService {
  private documents: Map<string, { type: SearchResult["type"]; title: string; description: string; url: string; content: string }> = new Map();
  index(id: string, data: { type: SearchResult["type"]; title: string; description: string; url: string; content: string }): void { this.documents.set(id, data); }
  search(query: string, type?: SearchResult["type"], limit: number = 20): SearchResult[] {
    const q = query.toLowerCase(); let results: SearchResult[] = [];
    for (const [id, doc] of this.documents) {
      if (type && doc.type !== type) continue;
      const searchable = `${doc.title} ${doc.description} ${doc.content}`.toLowerCase();
      if (!searchable.includes(q)) continue;
      const score = (searchable.split(q).length - 1) * 10;
      results.push({ id, type: doc.type, title: doc.title, description: doc.description, url: doc.url, score, highlights: [searchable.substring(Math.max(0, searchable.indexOf(q) - 30), searchable.indexOf(q) + q.length + 30)] });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  remove(id: string): boolean { return this.documents.delete(id); }
  getCount(): number { return this.documents.size; }
}
export const searchIndexService = new SearchIndexService();
