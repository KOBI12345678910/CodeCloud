export interface LogEntry {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  source: string;
  metadata: Record<string, any>;
}

export interface LogAnalysis {
  totalLogs: number;
  byLevel: Record<string, number>;
  topErrors: { message: string; count: number }[];
  errorRate: number;
  logsPerMinute: number;
  patterns: { pattern: string; count: number; severity: string }[];
}

class LogAnalysisService {
  private logs: LogEntry[] = [];

  ingest(entries: LogEntry[]): number {
    this.logs.push(...entries);
    if (this.logs.length > 50000) this.logs = this.logs.slice(-25000);
    return entries.length;
  }

  analyze(minutes: number = 60): LogAnalysis {
    const since = new Date(Date.now() - minutes * 60000);
    const filtered = this.logs.filter(l => l.timestamp >= since);
    const byLevel: Record<string, number> = {};
    const errorMsgs = new Map<string, number>();
    for (const l of filtered) {
      byLevel[l.level] = (byLevel[l.level] || 0) + 1;
      if (l.level === "error" || l.level === "fatal") {
        errorMsgs.set(l.message, (errorMsgs.get(l.message) || 0) + 1);
      }
    }
    const errors = (byLevel["error"] || 0) + (byLevel["fatal"] || 0);
    return {
      totalLogs: filtered.length, byLevel,
      topErrors: Array.from(errorMsgs).map(([message, count]) => ({ message, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      errorRate: filtered.length > 0 ? errors / filtered.length : 0,
      logsPerMinute: filtered.length / Math.max(1, minutes),
      patterns: [],
    };
  }

  search(query: string, level?: LogEntry["level"], limit: number = 100): LogEntry[] {
    const q = query.toLowerCase();
    let results = this.logs.filter(l => l.message.toLowerCase().includes(q));
    if (level) results = results.filter(l => l.level === level);
    return results.slice(-limit);
  }

  clear(): number { const count = this.logs.length; this.logs = []; return count; }
}

export const logAnalysisService = new LogAnalysisService();
