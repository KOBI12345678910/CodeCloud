export interface PreviewDeployment {
  id: string;
  prNumber: number;
  prTitle: string;
  previewUrl: string;
  status: "building" | "ready" | "failed" | "expired";
  branch: string;
  createdAt: string;
  expiresAt: string;
  buildLog: string[];
}

export function createPreviewDeployment(projectId: string, prNumber: number, branch: string): PreviewDeployment {
  return {
    id: crypto.randomUUID(), prNumber, prTitle: `Feature: ${branch}`,
    previewUrl: `https://preview-pr${prNumber}.codecloud.app`,
    status: "ready", branch, createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    buildLog: ["Cloning repository...", "Installing dependencies...", "Building project...", "Deploying to preview....", "Preview ready!"],
  };
}

export function listPreviewDeployments(projectId: string): PreviewDeployment[] {
  return [
    { id: "p1", prNumber: 42, prTitle: "Add user settings page", previewUrl: "https://preview-pr42.codecloud.app", status: "ready", branch: "feature/settings", createdAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(), buildLog: [] },
    { id: "p2", prNumber: 43, prTitle: "Fix auth redirect", previewUrl: "https://preview-pr43.codecloud.app", status: "building", branch: "fix/auth-redirect", createdAt: new Date(Date.now() - 3600000).toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), buildLog: [] },
    { id: "p3", prNumber: 38, prTitle: "Refactor database layer", previewUrl: "https://preview-pr38.codecloud.app", status: "expired", branch: "refactor/db", createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), expiresAt: new Date(Date.now() - 7 * 86400000).toISOString(), buildLog: [] },
  ];
}
