export interface TrafficDataPoint {
  timestamp: Date;
  requests: number;
  uniqueVisitors: number;
  bandwidth: number;
  avgResponseTime: number;
  errorCount: number;
}

export interface TrafficSummary {
  totalRequests: number;
  totalBandwidth: number;
  uniqueVisitors: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: { path: string; count: number }[];
  topCountries: { country: string; count: number }[];
  statusCodes: Record<string, number>;
  dataPoints: TrafficDataPoint[];
}

class TrafficAnalyticsService {
  private requests: { path: string; status: number; responseTime: number; country: string; bytes: number; ts: Date }[] = [];

  record(path: string, status: number, responseTime: number, country: string = "US", bytes: number = 1024): void {
    this.requests.push({ path, status, responseTime, country, bytes, ts: new Date() });
    if (this.requests.length > 10000) this.requests = this.requests.slice(-5000);
  }

  getSummary(hours: number = 24): TrafficSummary {
    const since = new Date(Date.now() - hours * 3600000);
    const filtered = this.requests.filter(r => r.ts >= since);
    const endpointCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const statusCodes: Record<string, number> = {};
    let totalBw = 0, totalRt = 0, errors = 0;
    for (const r of filtered) {
      endpointCounts.set(r.path, (endpointCounts.get(r.path) || 0) + 1);
      countryCounts.set(r.country, (countryCounts.get(r.country) || 0) + 1);
      statusCodes[String(r.status)] = (statusCodes[String(r.status)] || 0) + 1;
      totalBw += r.bytes; totalRt += r.responseTime;
      if (r.status >= 400) errors++;
    }
    return {
      totalRequests: filtered.length, totalBandwidth: totalBw,
      uniqueVisitors: new Set(filtered.map(() => Math.random().toString())).size,
      avgResponseTime: filtered.length > 0 ? totalRt / filtered.length : 0,
      errorRate: filtered.length > 0 ? errors / filtered.length : 0,
      topEndpoints: Array.from(endpointCounts).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      topCountries: Array.from(countryCounts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      statusCodes, dataPoints: [],
    };
  }
}

export const trafficAnalyticsService = new TrafficAnalyticsService();
