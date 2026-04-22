export interface StorageBucket { id: string; projectId: string; name: string; region: string; visibility: "private" | "public"; totalSize: number; objectCount: number; createdAt: Date; }
export interface StorageObject { id: string; bucketId: string; key: string; size: number; contentType: string; etag: string; url: string; createdAt: Date; }
class ObjectStorageService {
  private buckets: Map<string, StorageBucket> = new Map();
  private objects: Map<string, StorageObject[]> = new Map();
  createBucket(data: { projectId: string; name: string; region?: string; visibility?: StorageBucket["visibility"] }): StorageBucket {
    const id = `bucket-${Date.now()}`; const b: StorageBucket = { id, ...data, region: data.region || "us-east-1", visibility: data.visibility || "private", totalSize: 0, objectCount: 0, createdAt: new Date() };
    this.buckets.set(id, b); this.objects.set(id, []); return b;
  }
  putObject(bucketId: string, key: string, size: number, contentType: string): StorageObject | null {
    const b = this.buckets.get(bucketId); if (!b) return null;
    const id = `obj-${Date.now()}`; const obj: StorageObject = { id, bucketId, key, size, contentType, etag: Math.random().toString(36).slice(2, 10), url: `/${b.name}/${key}`, createdAt: new Date() };
    this.objects.get(bucketId)!.push(obj); b.totalSize += size; b.objectCount++;
    return obj;
  }
  getObject(bucketId: string, key: string): StorageObject | null { return this.objects.get(bucketId)?.find(o => o.key === key) || null; }
  listObjects(bucketId: string, prefix?: string): StorageObject[] { let objs = this.objects.get(bucketId) || []; if (prefix) objs = objs.filter(o => o.key.startsWith(prefix)); return objs; }
  getBucket(id: string): StorageBucket | null { return this.buckets.get(id) || null; }
  listBuckets(projectId: string): StorageBucket[] { return Array.from(this.buckets.values()).filter(b => b.projectId === projectId); }
  deleteBucket(id: string): boolean { this.objects.delete(id); return this.buckets.delete(id); }
}
export const objectStorageService = new ObjectStorageService();
