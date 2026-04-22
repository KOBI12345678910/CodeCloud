export interface ProjectSecret { id: string; projectId: string; key: string; valueHash: string; description: string; createdBy: string; createdAt: Date; updatedAt: Date; }
class ProjectSecretsService {
  private secrets: Map<string, ProjectSecret[]> = new Map();
  set(projectId: string, key: string, value: string, description: string, createdBy: string): ProjectSecret {
    if (!this.secrets.has(projectId)) this.secrets.set(projectId, []);
    const secrets = this.secrets.get(projectId)!;
    const existing = secrets.findIndex(s => s.key === key);
    const secret: ProjectSecret = { id: `sec-${Date.now()}`, projectId, key, valueHash: `***${value.slice(-4)}`, description, createdBy, createdAt: new Date(), updatedAt: new Date() };
    if (existing >= 0) { secrets[existing] = secret; } else { secrets.push(secret); }
    return secret;
  }
  list(projectId: string): ProjectSecret[] { return this.secrets.get(projectId) || []; }
  delete(projectId: string, key: string): boolean {
    const secrets = this.secrets.get(projectId); if (!secrets) return false;
    const idx = secrets.findIndex(s => s.key === key); if (idx === -1) return false;
    secrets.splice(idx, 1); return true;
  }
}
export const projectSecretsService = new ProjectSecretsService();
