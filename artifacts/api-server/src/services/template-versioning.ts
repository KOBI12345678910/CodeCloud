export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  changelog: string;
  files: { path: string; content: string }[];
  createdAt: Date;
  createdBy: string;
}

class TemplateVersioningService {
  private versions: Map<string, TemplateVersion[]> = new Map();

  addVersion(templateId: string, version: string, changelog: string, files: { path: string; content: string }[], createdBy: string): TemplateVersion {
    if (!this.versions.has(templateId)) this.versions.set(templateId, []);
    const v: TemplateVersion = {
      id: `tv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      templateId, version, changelog, files, createdAt: new Date(), createdBy,
    };
    this.versions.get(templateId)!.push(v);
    return v;
  }

  getVersions(templateId: string): TemplateVersion[] { return (this.versions.get(templateId) || []).reverse(); }
  getLatest(templateId: string): TemplateVersion | null { const vs = this.versions.get(templateId); return vs && vs.length > 0 ? vs[vs.length - 1] : null; }
  getVersion(templateId: string, version: string): TemplateVersion | null { return (this.versions.get(templateId) || []).find(v => v.version === version) || null; }

  diff(templateId: string, v1: string, v2: string): { added: string[]; removed: string[]; modified: string[] } {
    const ver1 = this.getVersion(templateId, v1);
    const ver2 = this.getVersion(templateId, v2);
    if (!ver1 || !ver2) return { added: [], removed: [], modified: [] };
    const paths1 = new Set(ver1.files.map(f => f.path));
    const paths2 = new Set(ver2.files.map(f => f.path));
    const added = ver2.files.filter(f => !paths1.has(f.path)).map(f => f.path);
    const removed = ver1.files.filter(f => !paths2.has(f.path)).map(f => f.path);
    const modified = ver2.files.filter(f => {
      const f1 = ver1.files.find(x => x.path === f.path);
      return f1 && f1.content !== f.content;
    }).map(f => f.path);
    return { added, removed, modified };
  }
}

export const templateVersioningService = new TemplateVersioningService();
