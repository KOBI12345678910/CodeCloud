export interface GitHubRepo {
  id: string;
  fullName: string;
  description: string;
  private: boolean;
  defaultBranch: string;
  language: string;
  stars: number;
  url: string;
}

export interface GitHubSync {
  id: string;
  projectId: string;
  repoFullName: string;
  branch: string;
  direction: "push" | "pull" | "bidirectional";
  lastSynced: Date | null;
  status: "connected" | "syncing" | "error" | "disconnected";
  autoSync: boolean;
}

class GitHubIntegrationService {
  private syncs: Map<string, GitHubSync> = new Map();

  connect(projectId: string, repoFullName: string, branch: string = "main", direction: GitHubSync["direction"] = "bidirectional"): GitHubSync {
    const id = `gh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sync: GitHubSync = { id, projectId, repoFullName, branch, direction, lastSynced: null, status: "connected", autoSync: true };
    this.syncs.set(id, sync);
    return sync;
  }

  disconnect(id: string): boolean { const s = this.syncs.get(id); if (!s) return false; s.status = "disconnected"; return true; }
  get(id: string): GitHubSync | null { return this.syncs.get(id) || null; }
  getByProject(projectId: string): GitHubSync | null { return Array.from(this.syncs.values()).find(s => s.projectId === projectId) || null; }
  list(): GitHubSync[] { return Array.from(this.syncs.values()); }

  sync(id: string): GitHubSync | null {
    const s = this.syncs.get(id); if (!s) return null;
    s.status = "syncing";
    s.lastSynced = new Date();
    s.status = "connected";
    return s;
  }

  listRepos(): GitHubRepo[] {
    return [
      { id: "1", fullName: "user/my-app", description: "My application", private: false, defaultBranch: "main", language: "TypeScript", stars: 42, url: "https://github.com/user/my-app" },
      { id: "2", fullName: "user/api-server", description: "API backend", private: true, defaultBranch: "main", language: "TypeScript", stars: 10, url: "https://github.com/user/api-server" },
    ];
  }

  createPR(syncId: string, title: string, description: string, branch: string): { url: string; number: number } | null {
    const s = this.syncs.get(syncId); if (!s) return null;
    return { url: `https://github.com/${s.repoFullName}/pull/1`, number: 1 };
  }
}

export const githubIntegrationService = new GitHubIntegrationService();
