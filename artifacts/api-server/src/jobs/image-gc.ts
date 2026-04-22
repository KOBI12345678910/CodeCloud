export interface GCImage {
  id: string;
  tag: string;
  sizeMB: number;
  createdAt: Date;
  lastUsed: Date | null;
  dangling: boolean;
  expired: boolean;
}

export interface GCSchedule {
  enabled: boolean;
  intervalHours: number;
  retainDays: number;
  maxStorageGB: number;
  lastRun: Date | null;
  nextRun: Date | null;
}

export interface GCResult {
  id: string;
  timestamp: Date;
  imagesRemoved: number;
  spaceReclaimedMB: number;
  danglingRemoved: number;
  expiredRemoved: number;
  duration: number;
}

class ImageGCService {
  private images: GCImage[] = [];
  private schedule: GCSchedule = {
    enabled: true, intervalHours: 24, retainDays: 30,
    maxStorageGB: 50, lastRun: null, nextRun: new Date(Date.now() + 86400000),
  };
  private history: GCResult[] = [];

  getImages(): GCImage[] {
    return [...this.images];
  }

  addImage(tag: string, sizeMB: number): GCImage {
    const image: GCImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag, sizeMB, createdAt: new Date(), lastUsed: null,
      dangling: false, expired: false,
    };
    this.images.push(image);
    return image;
  }

  markDangling(imageId: string): boolean {
    const img = this.images.find(i => i.id === imageId);
    if (!img) return false;
    img.dangling = true;
    return true;
  }

  runGC(): GCResult {
    const start = Date.now();
    const now = new Date();
    let removed = 0, reclaimedMB = 0, danglingCount = 0, expiredCount = 0;

    this.images = this.images.filter(img => {
      const age = (now.getTime() - img.createdAt.getTime()) / 86400000;
      const isExpired = age > this.schedule.retainDays;
      if (img.dangling || isExpired) {
        removed++;
        reclaimedMB += img.sizeMB;
        if (img.dangling) danglingCount++;
        if (isExpired) expiredCount++;
        return false;
      }
      return true;
    });

    const result: GCResult = {
      id: `gc-${Date.now()}`, timestamp: now,
      imagesRemoved: removed, spaceReclaimedMB: reclaimedMB,
      danglingRemoved: danglingCount, expiredRemoved: expiredCount,
      duration: Date.now() - start,
    };
    this.history.push(result);
    this.schedule.lastRun = now;
    this.schedule.nextRun = new Date(now.getTime() + this.schedule.intervalHours * 3600000);
    return result;
  }

  getSchedule(): GCSchedule {
    return { ...this.schedule };
  }

  updateSchedule(updates: Partial<GCSchedule>): GCSchedule {
    Object.assign(this.schedule, updates);
    return { ...this.schedule };
  }

  getHistory(): GCResult[] {
    return [...this.history].reverse();
  }

  getMetrics(): { totalImages: number; totalSizeMB: number; danglingCount: number; totalReclaimed: number } {
    return {
      totalImages: this.images.length,
      totalSizeMB: this.images.reduce((s, i) => s + i.sizeMB, 0),
      danglingCount: this.images.filter(i => i.dangling).length,
      totalReclaimed: this.history.reduce((s, r) => s + r.spaceReclaimedMB, 0),
    };
  }
}

export const imageGCService = new ImageGCService();
