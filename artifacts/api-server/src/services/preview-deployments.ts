export interface PreviewDeployment { id: string; projectId: string; branch: string; commitHash: string; url: string; status: "building" | "live" | "failed" | "expired"; buildLog: string[]; createdAt: Date; expiresAt: Date; }
class PreviewDeploymentsService {
  private deployments: Map<string, PreviewDeployment> = new Map();
  create(data: { projectId: string; branch: string; commitHash: string }): PreviewDeployment {
    const id = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 24);
    const d: PreviewDeployment = { id, ...data, url: `https://preview-${id}.codecloud.app`, status: "building", buildLog: ["Starting build...", "Installing dependencies...", "Building project..."], createdAt: new Date(), expiresAt };
    this.deployments.set(id, d);
    d.buildLog.push("Build complete!"); d.status = "live";
    return d;
  }
  get(id: string): PreviewDeployment | null { return this.deployments.get(id) || null; }
  listByProject(projectId: string): PreviewDeployment[] { return Array.from(this.deployments.values()).filter(d => d.projectId === projectId); }
  delete(id: string): boolean { return this.deployments.delete(id); }
  expire(id: string): boolean { const d = this.deployments.get(id); if (!d) return false; d.status = "expired"; return true; }
}
export const previewDeploymentsService = new PreviewDeploymentsService();
