export interface MemorySnapshot {
  id: string;
  containerId: string;
  timestamp: Date;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  gcCount: number;
  gcPauseMs: number;
}

export interface MemoryLeak {
  id: string;
  containerId: string;
  detectedAt: Date;
  growthRateMBPerHour: number;
  suspectedSource: string;
  severity: "low" | "medium" | "high";
  snapshots: string[];
}

class MemoryProfilerService {
  private snapshots: Map<string, MemorySnapshot[]> = new Map();
  private leaks: MemoryLeak[] = [];

  takeSnapshot(containerId: string, metrics: Omit<MemorySnapshot, "id" | "timestamp">): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      ...metrics, id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    };
    const list = this.snapshots.get(containerId) || [];
    list.push(snapshot);
    if (list.length > 100) list.shift();
    this.snapshots.set(containerId, list);
    this.detectLeaks(containerId);
    return snapshot;
  }

  getSnapshots(containerId: string, limit = 50): MemorySnapshot[] {
    return (this.snapshots.get(containerId) || []).slice(-limit);
  }

  compareSnapshots(snapshotId1: string, snapshotId2: string): { diff: Record<string, number> } | null {
    let s1: MemorySnapshot | undefined, s2: MemorySnapshot | undefined;
    for (const list of this.snapshots.values()) {
      for (const s of list) {
        if (s.id === snapshotId1) s1 = s;
        if (s.id === snapshotId2) s2 = s;
      }
    }
    if (!s1 || !s2) return null;
    return {
      diff: {
        heapUsedMB: s2.heapUsedMB - s1.heapUsedMB,
        heapTotalMB: s2.heapTotalMB - s1.heapTotalMB,
        rssMB: s2.rssMB - s1.rssMB,
        externalMB: s2.externalMB - s1.externalMB,
        arrayBuffersMB: s2.arrayBuffersMB - s1.arrayBuffersMB,
        timeDiffMs: s2.timestamp.getTime() - s1.timestamp.getTime(),
      },
    };
  }

  getLeaks(containerId?: string): MemoryLeak[] {
    if (containerId) return this.leaks.filter(l => l.containerId === containerId);
    return [...this.leaks];
  }

  getGCMetrics(containerId: string): { totalGCs: number; avgPauseMs: number; maxPauseMs: number } {
    const snaps = this.snapshots.get(containerId) || [];
    if (snaps.length === 0) return { totalGCs: 0, avgPauseMs: 0, maxPauseMs: 0 };
    const totalGCs = snaps.reduce((s, sn) => s + sn.gcCount, 0);
    const avgPauseMs = snaps.reduce((s, sn) => s + sn.gcPauseMs, 0) / snaps.length;
    const maxPauseMs = Math.max(...snaps.map(sn => sn.gcPauseMs));
    return { totalGCs, avgPauseMs, maxPauseMs };
  }

  private detectLeaks(containerId: string): void {
    const snaps = this.snapshots.get(containerId) || [];
    if (snaps.length < 10) return;
    const recent = snaps.slice(-10);
    const growthRate = (recent[9].heapUsedMB - recent[0].heapUsedMB) /
      ((recent[9].timestamp.getTime() - recent[0].timestamp.getTime()) / 3600000);

    if (growthRate > 10) {
      const existing = this.leaks.find(l => l.containerId === containerId);
      if (!existing) {
        this.leaks.push({
          id: `leak-${Date.now()}`, containerId, detectedAt: new Date(),
          growthRateMBPerHour: growthRate, suspectedSource: "Heap growth detected in recent snapshots",
          severity: growthRate > 50 ? "high" : growthRate > 25 ? "medium" : "low",
          snapshots: recent.map(s => s.id),
        });
      }
    }
  }
}

export const memoryProfilerService = new MemoryProfilerService();
