export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  file: string;
  language: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}

export interface TimeSummary {
  totalSeconds: number;
  byLanguage: Record<string, number>;
  byFile: Record<string, number>;
  byDay: Record<string, number>;
  topFiles: { file: string; seconds: number }[];
}

class TimeTrackingService {
  private entries: TimeEntry[] = [];

  record(userId: string, projectId: string, file: string, language: string, durationSeconds: number): TimeEntry {
    const entry: TimeEntry = {
      id: `time-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId, projectId, file, language,
      startedAt: new Date(Date.now() - durationSeconds * 1000), endedAt: new Date(), durationSeconds,
    };
    this.entries.push(entry);
    return entry;
  }

  getSummary(userId: string, projectId?: string, days: number = 7): TimeSummary {
    const since = new Date(Date.now() - days * 86400000);
    let filtered = this.entries.filter(e => e.userId === userId && e.startedAt >= since);
    if (projectId) filtered = filtered.filter(e => e.projectId === projectId);
    const byLang: Record<string, number> = {};
    const byFile: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let total = 0;
    for (const e of filtered) {
      total += e.durationSeconds;
      byLang[e.language] = (byLang[e.language] || 0) + e.durationSeconds;
      byFile[e.file] = (byFile[e.file] || 0) + e.durationSeconds;
      const day = e.startedAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + e.durationSeconds;
    }
    const topFiles = Object.entries(byFile).map(([file, seconds]) => ({ file, seconds })).sort((a, b) => b.seconds - a.seconds).slice(0, 10);
    return { totalSeconds: total, byLanguage: byLang, byFile, byDay, topFiles };
  }

  getEntries(userId: string, limit: number = 50): TimeEntry[] {
    return this.entries.filter(e => e.userId === userId).slice(-limit).reverse();
  }
}

export const timeTrackingService = new TimeTrackingService();
