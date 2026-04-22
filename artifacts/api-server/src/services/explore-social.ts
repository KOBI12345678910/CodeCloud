export interface ExploreProject {
  id: string;
  name: string;
  description: string;
  owner: string;
  language: string;
  stars: number;
  forks: number;
  trending: boolean;
  tags: string[];
  updatedAt: Date;
}

class ExploreSocialService {
  private projects: Map<string, ExploreProject> = new Map();

  addProject(data: Omit<ExploreProject, "stars" | "forks" | "trending" | "updatedAt">): ExploreProject {
    const project: ExploreProject = { ...data, stars: 0, forks: 0, trending: false, updatedAt: new Date() };
    this.projects.set(data.id, project);
    return project;
  }

  getTrending(limit: number = 20): ExploreProject[] {
    return Array.from(this.projects.values()).sort((a, b) => b.stars - a.stars).slice(0, limit);
  }

  search(query: string, language?: string): ExploreProject[] {
    const q = query.toLowerCase();
    let results = Array.from(this.projects.values()).filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.includes(q)));
    if (language) results = results.filter(p => p.language === language);
    return results;
  }

  star(projectId: string): boolean { const p = this.projects.get(projectId); if (!p) return false; p.stars++; p.trending = p.stars > 10; return true; }
  unstar(projectId: string): boolean { const p = this.projects.get(projectId); if (!p) return false; p.stars = Math.max(0, p.stars - 1); return true; }
  fork(projectId: string): ExploreProject | null {
    const p = this.projects.get(projectId); if (!p) return null;
    p.forks++;
    const forked = { ...p, id: `${p.id}-fork-${Date.now()}`, name: `${p.name}-fork`, stars: 0, forks: 0 };
    this.projects.set(forked.id, forked);
    return forked;
  }

  getByLanguage(language: string): ExploreProject[] { return Array.from(this.projects.values()).filter(p => p.language === language); }
  getByTag(tag: string): ExploreProject[] { return Array.from(this.projects.values()).filter(p => p.tags.includes(tag)); }
}

export const exploreSocialService = new ExploreSocialService();
