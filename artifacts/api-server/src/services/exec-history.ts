export interface ExecEntry {
  id: string;
  containerId: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  executedAt: Date;
  user: string;
}

class ExecHistoryService {
  private entries: ExecEntry[] = [];

  record(containerId: string, command: string, exitCode: number, stdout: string, stderr: string, duration: number, user: string = "root"): ExecEntry {
    const entry: ExecEntry = {
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      containerId, command, exitCode, stdout, stderr, duration, executedAt: new Date(), user,
    };
    this.entries.push(entry);
    if (this.entries.length > 5000) this.entries = this.entries.slice(-2500);
    return entry;
  }

  list(containerId?: string, limit: number = 50): ExecEntry[] {
    let result = containerId ? this.entries.filter(e => e.containerId === containerId) : this.entries;
    return result.slice(-limit).reverse();
  }

  get(id: string): ExecEntry | null { return this.entries.find(e => e.id === id) || null; }

  search(query: string): ExecEntry[] {
    return this.entries.filter(e => e.command.includes(query) || e.stdout.includes(query) || e.stderr.includes(query));
  }

  getStats(containerId: string): { total: number; success: number; failed: number; avgDuration: number } {
    const filtered = this.entries.filter(e => e.containerId === containerId);
    return {
      total: filtered.length, success: filtered.filter(e => e.exitCode === 0).length,
      failed: filtered.filter(e => e.exitCode !== 0).length,
      avgDuration: filtered.length > 0 ? filtered.reduce((s, e) => s + e.duration, 0) / filtered.length : 0,
    };
  }

  clear(containerId: string): number {
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.containerId !== containerId);
    return before - this.entries.length;
  }
}

export const execHistoryService = new ExecHistoryService();
