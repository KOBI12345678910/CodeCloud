export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  files: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  lastCommit?: string;
}

export interface GitDiff {
  file: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  hunks: Array<{
    header: string;
    lines: Array<{ type: "add" | "remove" | "context"; content: string }>;
  }>;
}

export interface GitFileStatus {
  file: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed";
  staged: boolean;
}

export interface GitRepoStatus {
  initialized: boolean;
  branch: string;
  clean: boolean;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

const DEMO_BRANCHES: GitBranch[] = [
  { name: "main", current: true, lastCommit: "Initial commit" },
  { name: "develop", current: false, lastCommit: "Add feature branch" },
  { name: "feature/auth", current: false, lastCommit: "Add login page" },
];

const DEMO_COMMITS: GitCommit[] = [
  { hash: "a1b2c3d4e5f6", shortHash: "a1b2c3d", message: "Initial commit", author: "user", date: new Date(Date.now() - 86400000 * 3).toISOString(), files: 5 },
  { hash: "b2c3d4e5f6a7", shortHash: "b2c3d4e", message: "Add project structure", author: "user", date: new Date(Date.now() - 86400000 * 2).toISOString(), files: 3 },
  { hash: "c3d4e5f6a7b8", shortHash: "c3d4e5f", message: "Implement main feature", author: "user", date: new Date(Date.now() - 86400000).toISOString(), files: 7 },
];

const projectStates = new Map<string, {
  initialized: boolean;
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  stagedFiles: Set<string>;
}>();

function getState(projectId: string) {
  if (!projectStates.has(projectId)) {
    projectStates.set(projectId, {
      initialized: false,
      currentBranch: "main",
      branches: [...DEMO_BRANCHES],
      commits: [...DEMO_COMMITS],
      stagedFiles: new Set(),
    });
  }
  return projectStates.get(projectId)!;
}

export function initRepo(projectId: string): GitRepoStatus {
  const state = getState(projectId);
  state.initialized = true;
  return getStatus(projectId);
}

export function getStatus(projectId: string): GitRepoStatus {
  const state = getState(projectId);
  return {
    initialized: state.initialized,
    branch: state.currentBranch,
    clean: state.stagedFiles.size === 0,
    files: [],
    ahead: 0,
    behind: 0,
  };
}

export function stageFile(projectId: string, file: string): void {
  const state = getState(projectId);
  state.stagedFiles.add(file);
}

export function unstageFile(projectId: string, file: string): void {
  const state = getState(projectId);
  state.stagedFiles.delete(file);
}

export function stageAll(projectId: string, files: string[]): void {
  const state = getState(projectId);
  files.forEach((f) => state.stagedFiles.add(f));
}

export function commit(projectId: string, message: string, author: string): GitCommit {
  const state = getState(projectId);
  const hash = Math.random().toString(36).slice(2, 14);
  const newCommit: GitCommit = {
    hash,
    shortHash: hash.slice(0, 7),
    message,
    author,
    date: new Date().toISOString(),
    files: state.stagedFiles.size || 1,
  };
  state.commits.unshift(newCommit);
  state.stagedFiles.clear();
  return newCommit;
}

export function getLog(projectId: string, limit = 50): GitCommit[] {
  const state = getState(projectId);
  return state.commits.slice(0, limit);
}

export function getBranches(projectId: string): GitBranch[] {
  const state = getState(projectId);
  return state.branches.map((b) => ({
    ...b,
    current: b.name === state.currentBranch,
  }));
}

export function createBranch(projectId: string, name: string): GitBranch {
  const state = getState(projectId);
  const existing = state.branches.find((b) => b.name === name);
  if (existing) throw new Error(`Branch '${name}' already exists`);
  const branch: GitBranch = {
    name,
    current: false,
    lastCommit: state.commits[0]?.message || "Initial commit",
  };
  state.branches.push(branch);
  return branch;
}

export function checkoutBranch(projectId: string, name: string): void {
  const state = getState(projectId);
  const branch = state.branches.find((b) => b.name === name);
  if (!branch) throw new Error(`Branch '${name}' not found`);
  state.currentBranch = name;
}

export function getDiff(projectId: string, file: string): GitDiff {
  return {
    file,
    status: "modified",
    additions: 3,
    deletions: 1,
    hunks: [
      {
        header: "@@ -1,5 +1,7 @@",
        lines: [
          { type: "context", content: "// existing code" },
          { type: "remove", content: "- const old = true;" },
          { type: "add", content: "+ const updated = true;" },
          { type: "add", content: "+ const extra = false;" },
          { type: "context", content: "" },
        ],
      },
    ],
  };
}
