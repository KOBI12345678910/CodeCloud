import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  clone_url: string;
  ssh_url: string;
}

interface SyncConfig {
  repoId: string;
  owner: string;
  repo: string;
  branch: string;
  autoSync: boolean;
  syncDirection: "push" | "pull" | "bidirectional";
  lastSyncAt: string | null;
  status: "connected" | "syncing" | "error" | "disconnected";
}

const syncConfigs = new Map<string, SyncConfig>();
const syncHistory: Array<{
  id: string;
  projectId: string;
  repoFullName: string;
  action: "push" | "pull" | "clone";
  status: "success" | "failed" | "in_progress";
  filesChanged: number;
  commitSha: string;
  message: string;
  timestamp: string;
}> = [];

router.get("/github-sync/repos", requireAuth, async (_req, res): Promise<void> => {
  const demoRepos: GitHubRepo[] = [
    { id: 1, name: "codecloud-platform", full_name: "user/codecloud-platform", description: "Main CodeCloud platform repository", private: true, html_url: "https://github.com/user/codecloud-platform", default_branch: "main", language: "TypeScript", stargazers_count: 142, updated_at: new Date().toISOString(), clone_url: "https://github.com/user/codecloud-platform.git", ssh_url: "git@github.com:user/codecloud-platform.git" },
    { id: 2, name: "api-microservices", full_name: "user/api-microservices", description: "Backend microservices architecture", private: true, html_url: "https://github.com/user/api-microservices", default_branch: "main", language: "TypeScript", stargazers_count: 87, updated_at: new Date(Date.now() - 86400000).toISOString(), clone_url: "https://github.com/user/api-microservices.git", ssh_url: "git@github.com:user/api-microservices.git" },
    { id: 3, name: "design-system", full_name: "user/design-system", description: "Shared component library and design tokens", private: false, html_url: "https://github.com/user/design-system", default_branch: "main", language: "TypeScript", stargazers_count: 256, updated_at: new Date(Date.now() - 172800000).toISOString(), clone_url: "https://github.com/user/design-system.git", ssh_url: "git@github.com:user/design-system.git" },
  ];
  res.json({ repos: demoRepos });
});

router.post("/github-sync/connect", requireAuth, async (req, res): Promise<void> => {
  const { projectId, owner, repo, branch, syncDirection } = req.body;
  if (!projectId || !owner || !repo) {
    res.status(400).json({ error: "projectId, owner, and repo are required" });
    return;
  }
  const config: SyncConfig = {
    repoId: projectId,
    owner,
    repo,
    branch: branch || "main",
    autoSync: false,
    syncDirection: syncDirection || "bidirectional",
    lastSyncAt: null,
    status: "connected",
  };
  syncConfigs.set(projectId, config);
  res.json({ success: true, config });
});

router.post("/github-sync/push", requireAuth, async (req, res): Promise<void> => {
  const { projectId, commitMessage } = req.body;
  const config = syncConfigs.get(projectId);
  if (!config) {
    res.status(404).json({ error: "No sync configuration found" });
    return;
  }
  const entry = {
    id: `sync_${Date.now()}`,
    projectId,
    repoFullName: `${config.owner}/${config.repo}`,
    action: "push" as const,
    status: "success" as const,
    filesChanged: Math.floor(Math.random() * 20) + 1,
    commitSha: Math.random().toString(36).substring(2, 10),
    message: commitMessage || "Sync from CodeCloud",
    timestamp: new Date().toISOString(),
  };
  syncHistory.unshift(entry);
  config.lastSyncAt = entry.timestamp;
  res.json({ success: true, sync: entry });
});

router.post("/github-sync/pull", requireAuth, async (req, res): Promise<void> => {
  const { projectId } = req.body;
  const config = syncConfigs.get(projectId);
  if (!config) {
    res.status(404).json({ error: "No sync configuration found" });
    return;
  }
  const entry = {
    id: `sync_${Date.now()}`,
    projectId,
    repoFullName: `${config.owner}/${config.repo}`,
    action: "pull" as const,
    status: "success" as const,
    filesChanged: Math.floor(Math.random() * 15) + 1,
    commitSha: Math.random().toString(36).substring(2, 10),
    message: "Pull from GitHub",
    timestamp: new Date().toISOString(),
  };
  syncHistory.unshift(entry);
  config.lastSyncAt = entry.timestamp;
  res.json({ success: true, sync: entry });
});

router.get("/github-sync/history", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.query.projectId as string;
  const filtered = projectId ? syncHistory.filter((h) => h.projectId === projectId) : syncHistory;
  res.json({ history: filtered.slice(0, 50) });
});

router.get("/github-sync/config/:projectId", requireAuth, async (req, res): Promise<void> => {
  const config = syncConfigs.get(req.params.projectId);
  if (!config) {
    res.status(404).json({ error: "Not connected" });
    return;
  }
  res.json({ config });
});

router.post("/github-sync/create-repo", requireAuth, async (req, res): Promise<void> => {
  const { name, description, isPrivate } = req.body;
  if (!name) {
    res.status(400).json({ error: "Repository name is required" });
    return;
  }
  res.json({
    success: true,
    repo: {
      id: Date.now(),
      name,
      full_name: `user/${name}`,
      description: description || "",
      private: isPrivate !== false,
      html_url: `https://github.com/user/${name}`,
      default_branch: "main",
      clone_url: `https://github.com/user/${name}.git`,
    },
  });
});

router.delete("/github-sync/disconnect/:projectId", requireAuth, async (req, res): Promise<void> => {
  syncConfigs.delete(req.params.projectId);
  res.json({ success: true });
});

export default router;
