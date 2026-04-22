export interface LogStream { id: string; projectId: string; destination: "console" | "file" | "external"; level: "debug" | "info" | "warn" | "error"; active: boolean; createdAt: Date; }
export interface LogEntry { id: string; streamId: string; level: string; message: string; metadata: Record<string, any>; timestamp: Date; }
class LogStreamingService {
  private streams: Map<string, LogStream> = new Map();
  private entries: LogEntry[] = [];
  createStream(data: { projectId: string; destination: LogStream["destination"]; level?: LogStream["level"] }): LogStream {
    const id = `ls-${Date.now()}`; const s: LogStream = { id, ...data, level: data.level || "info", active: true, createdAt: new Date() };
    this.streams.set(id, s); return s;
  }
  log(streamId: string, level: string, message: string, metadata: Record<string, any> = {}): LogEntry | null {
    const s = this.streams.get(streamId); if (!s || !s.active) return null;
    const e: LogEntry = { id: `le-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, streamId, level, message, metadata, timestamp: new Date() };
    this.entries.push(e); if (this.entries.length > 10000) this.entries = this.entries.slice(-5000); return e;
  }
  getEntries(streamId: string, limit: number = 100, level?: string): LogEntry[] { let e = this.entries.filter(e => e.streamId === streamId); if (level) e = e.filter(e => e.level === level); return e.slice(-limit); }
  getStream(id: string): LogStream | null { return this.streams.get(id) || null; }
  listStreams(projectId: string): LogStream[] { return Array.from(this.streams.values()).filter(s => s.projectId === projectId); }
  toggleStream(id: string): LogStream | null { const s = this.streams.get(id); if (!s) return null; s.active = !s.active; return s; }
}
export const logStreamingService = new LogStreamingService();
