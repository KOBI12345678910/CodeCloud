export interface PlatformMetric { name: string; value: number; unit: string; tags: Record<string, string>; timestamp: Date; }
class PlatformMetricsService {
  private metrics: PlatformMetric[] = [];
  record(name: string, value: number, unit: string = "count", tags: Record<string, string> = {}): void { this.metrics.push({ name, value, unit, tags, timestamp: new Date() }); if (this.metrics.length > 50000) this.metrics = this.metrics.slice(-25000); }
  query(name: string, minutes: number = 60): PlatformMetric[] { const cutoff = new Date(Date.now() - minutes * 60000); return this.metrics.filter(m => m.name === name && m.timestamp >= cutoff); }
  getLatest(name: string): PlatformMetric | null { const matching = this.metrics.filter(m => m.name === name); return matching.length ? matching[matching.length - 1] : null; }
  getNames(): string[] { return [...new Set(this.metrics.map(m => m.name))]; }
  getDashboard(): Record<string, { latest: number; avg: number; min: number; max: number }> {
    const result: Record<string, { latest: number; avg: number; min: number; max: number }> = {};
    const names = this.getNames();
    for (const name of names) {
      const values = this.query(name, 60).map(m => m.value);
      if (values.length) result[name] = { latest: values[values.length - 1], avg: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
    }
    return result;
  }
}
export const platformMetricsService = new PlatformMetricsService();
