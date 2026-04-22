export interface StoredAsset { id: string; projectId: string; fileName: string; mimeType: string; size: number; url: string; uploadedBy: string; createdAt: Date; }
class AssetStorageService {
  private assets: Map<string, StoredAsset> = new Map();
  upload(data: { projectId: string; fileName: string; mimeType: string; size: number; uploadedBy: string }): StoredAsset {
    const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const asset: StoredAsset = { id, ...data, url: `/assets/${id}/${data.fileName}`, createdAt: new Date() };
    this.assets.set(id, asset); return asset;
  }
  get(id: string): StoredAsset | null { return this.assets.get(id) || null; }
  listByProject(projectId: string): StoredAsset[] { return Array.from(this.assets.values()).filter(a => a.projectId === projectId); }
  delete(id: string): boolean { return this.assets.delete(id); }
  getProjectUsage(projectId: string): { totalFiles: number; totalSize: number } { const assets = this.listByProject(projectId); return { totalFiles: assets.length, totalSize: assets.reduce((sum, a) => sum + a.size, 0) }; }
}
export const assetStorageService = new AssetStorageService();
