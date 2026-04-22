export interface DeployChangelog {
  id: string;
  projectId: string;
  fromVersion: string;
  toVersion: string;
  generatedAt: string;
  changes: ChangeEntry[];
  summary: string;
  contributors: string[];
  stats: { filesChanged: number; additions: number; deletions: number };
}

export interface ChangeEntry {
  type: "feature" | "fix" | "refactor" | "docs" | "chore" | "breaking";
  message: string;
  files: string[];
  author: string;
  commitHash: string;
  timestamp: string;
}

export function generateDeployChangelog(projectId: string, fromVersion: string, toVersion: string): DeployChangelog {
  const changes: ChangeEntry[] = [
    { type: "feature", message: "Add user profile settings page", files: ["src/pages/settings.tsx", "server/routes/profile.ts"], author: "alice", commitHash: "a1b2c3d", timestamp: new Date(Date.now() - 86400000).toISOString() },
    { type: "fix", message: "Fix login redirect loop on expired sessions", files: ["src/auth/redirect.ts"], author: "bob", commitHash: "e4f5g6h", timestamp: new Date(Date.now() - 72000000).toISOString() },
    { type: "refactor", message: "Migrate database queries to use prepared statements", files: ["server/db/queries.ts", "server/db/pool.ts"], author: "alice", commitHash: "i7j8k9l", timestamp: new Date(Date.now() - 50000000).toISOString() },
    { type: "fix", message: "Resolve memory leak in WebSocket connections", files: ["server/ws/handler.ts"], author: "charlie", commitHash: "m1n2o3p", timestamp: new Date(Date.now() - 36000000).toISOString() },
    { type: "chore", message: "Update dependencies to latest versions", files: ["package.json", "pnpm-lock.yaml"], author: "bot", commitHash: "q4r5s6t", timestamp: new Date(Date.now() - 20000000).toISOString() },
    { type: "feature", message: "Add dark mode toggle to navigation", files: ["src/components/Header.tsx", "src/styles/theme.css"], author: "bob", commitHash: "u7v8w9x", timestamp: new Date(Date.now() - 10000000).toISOString() },
  ];

  const contributors = [...new Set(changes.map(c => c.author))];
  return {
    id: crypto.randomUUID(), projectId, fromVersion, toVersion, generatedAt: new Date().toISOString(),
    changes, summary: `${changes.length} changes: ${changes.filter(c => c.type === "feature").length} features, ${changes.filter(c => c.type === "fix").length} fixes`,
    contributors,
    stats: { filesChanged: new Set(changes.flatMap(c => c.files)).size, additions: Math.floor(Math.random() * 500) + 100, deletions: Math.floor(Math.random() * 200) + 30 },
  };
}
