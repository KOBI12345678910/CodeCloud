interface LatencyBucket {
  le: number;
  count: number;
}

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

class ObservabilityService {
  private metrics: RequestMetric[] = [];
  private maxMetrics = 50000;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private aiGatewayMetrics = {
    totalRequests: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorCount: 0,
    avgLatencyMs: 0,
    modelUsage: new Map<string, number>(),
  };

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData(): void {
    const now = Date.now();
    const paths = ["/api/projects", "/api/files", "/api/ai/chat", "/api/deployments", "/api/auth/login", "/api/health"];
    const methods = ["GET", "POST", "PUT", "DELETE"];
    const statuses = [200, 200, 200, 200, 201, 204, 400, 404, 500];

    for (let i = 0; i < 2000; i++) {
      this.metrics.push({
        method: methods[Math.floor(Math.random() * methods.length)],
        path: paths[Math.floor(Math.random() * paths.length)],
        statusCode: statuses[Math.floor(Math.random() * statuses.length)],
        durationMs: Math.floor(Math.random() * 500) + 5,
        timestamp: now - Math.floor(Math.random() * 3600_000),
      });
    }

    this.aiGatewayMetrics.totalRequests = Math.floor(5000 + Math.random() * 10000);
    this.aiGatewayMetrics.totalTokensIn = Math.floor(500000 + Math.random() * 1000000);
    this.aiGatewayMetrics.totalTokensOut = Math.floor(200000 + Math.random() * 500000);
    this.aiGatewayMetrics.cacheHits = Math.floor(1000 + Math.random() * 3000);
    this.aiGatewayMetrics.cacheMisses = Math.floor(2000 + Math.random() * 5000);
    this.aiGatewayMetrics.errorCount = Math.floor(10 + Math.random() * 100);
    this.aiGatewayMetrics.avgLatencyMs = Math.floor(200 + Math.random() * 800);
    this.aiGatewayMetrics.modelUsage.set("gpt-4o", Math.floor(3000 + Math.random() * 5000));
    this.aiGatewayMetrics.modelUsage.set("claude-3.5-sonnet", Math.floor(2000 + Math.random() * 3000));
    this.aiGatewayMetrics.modelUsage.set("gemini-pro", Math.floor(1000 + Math.random() * 2000));
  }

  recordRequest(metric: RequestMetric): void {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    this.metrics.push(metric);
  }

  getLatencyHistogram(windowMs: number = 3600_000): { p50: number; p95: number; p99: number; avg: number; min: number; max: number; buckets: LatencyBucket[] } {
    const cutoff = Date.now() - windowMs;
    const durations = this.metrics
      .filter(m => m.timestamp > cutoff)
      .map(m => m.durationMs)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0, buckets: [] };
    }

    const percentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)] || 0;
    const sum = durations.reduce((a, b) => a + b, 0);

    const bucketLimits = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    const buckets = bucketLimits.map(le => ({
      le,
      count: durations.filter(d => d <= le).length,
    }));

    return {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      avg: Math.round(sum / durations.length),
      min: durations[0],
      max: durations[durations.length - 1],
      buckets,
    };
  }

  getErrorRates(windowMs: number = 3600_000): { total: number; errors: number; errorRate: number; byStatus: Record<string, number> } {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);
    const errors = recent.filter(m => m.statusCode >= 400);

    const byStatus: Record<string, number> = {};
    for (const m of errors) {
      const key = `${m.statusCode}`;
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    return {
      total: recent.length,
      errors: errors.length,
      errorRate: recent.length > 0 ? Math.round((errors.length / recent.length) * 10000) / 100 : 0,
      byStatus,
    };
  }

  getThroughput(windowMs: number = 3600_000, bucketCount: number = 60): { rps: number; timeSeries: TimeSeriesPoint[] } {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);
    const bucketMs = windowMs / bucketCount;

    const timeSeries: TimeSeriesPoint[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = cutoff + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      const count = recent.filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd).length;
      timeSeries.push({
        timestamp: new Date(bucketStart).toISOString(),
        value: Math.round(count / (bucketMs / 1000) * 100) / 100,
      });
    }

    const rps = recent.length > 0 ? Math.round(recent.length / (windowMs / 1000) * 100) / 100 : 0;

    return { rps, timeSeries };
  }

  getLatencyTimeSeries(windowMs: number = 3600_000, bucketCount: number = 60): { p50: TimeSeriesPoint[]; p95: TimeSeriesPoint[]; p99: TimeSeriesPoint[] } {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);
    const bucketMs = windowMs / bucketCount;

    const p50: TimeSeriesPoint[] = [];
    const p95: TimeSeriesPoint[] = [];
    const p99: TimeSeriesPoint[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = cutoff + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      const durations = recent
        .filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd)
        .map(m => m.durationMs)
        .sort((a, b) => a - b);

      const ts = new Date(bucketStart).toISOString();
      const pct = (arr: number[], p: number) => arr.length > 0 ? arr[Math.floor(arr.length * p / 100)] || 0 : 0;

      p50.push({ timestamp: ts, value: pct(durations, 50) });
      p95.push({ timestamp: ts, value: pct(durations, 95) });
      p99.push({ timestamp: ts, value: pct(durations, 99) });
    }

    return { p50, p95, p99 };
  }

  getTopEndpoints(windowMs: number = 3600_000, limit: number = 10): { path: string; method: string; count: number; avgLatency: number; errorRate: number }[] {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(m => m.timestamp > cutoff);
    const grouped = new Map<string, RequestMetric[]>();

    for (const m of recent) {
      const key = `${m.method} ${m.path}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    return Array.from(grouped.entries())
      .map(([key, metrics]) => {
        const [method, path] = key.split(" ");
        const errors = metrics.filter(m => m.statusCode >= 400).length;
        const totalDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0);
        return {
          path, method,
          count: metrics.length,
          avgLatency: Math.round(totalDuration / metrics.length),
          errorRate: Math.round((errors / metrics.length) * 10000) / 100,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getAiGatewayMetrics(): {
    totalRequests: number;
    totalTokensIn: number;
    totalTokensOut: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    errorCount: number;
    errorRate: number;
    avgLatencyMs: number;
    modelUsage: { model: string; requests: number }[];
  } {
    const total = this.aiGatewayMetrics.cacheHits + this.aiGatewayMetrics.cacheMisses;
    return {
      totalRequests: this.aiGatewayMetrics.totalRequests,
      totalTokensIn: this.aiGatewayMetrics.totalTokensIn,
      totalTokensOut: this.aiGatewayMetrics.totalTokensOut,
      cacheHits: this.aiGatewayMetrics.cacheHits,
      cacheMisses: this.aiGatewayMetrics.cacheMisses,
      cacheHitRate: total > 0 ? Math.round((this.aiGatewayMetrics.cacheHits / total) * 10000) / 100 : 0,
      errorCount: this.aiGatewayMetrics.errorCount,
      errorRate: this.aiGatewayMetrics.totalRequests > 0
        ? Math.round((this.aiGatewayMetrics.errorCount / this.aiGatewayMetrics.totalRequests) * 10000) / 100
        : 0,
      avgLatencyMs: this.aiGatewayMetrics.avgLatencyMs,
      modelUsage: Array.from(this.aiGatewayMetrics.modelUsage.entries()).map(([model, requests]) => ({ model, requests })),
    };
  }

  getWebSocketMetrics(): { activeConnections: number; peakConnections: number; messagesPerSec: number; avgLatencyMs: number } {
    return {
      activeConnections: Math.floor(50 + Math.random() * 200),
      peakConnections: Math.floor(300 + Math.random() * 500),
      messagesPerSec: Math.floor(100 + Math.random() * 500),
      avgLatencyMs: Math.floor(2 + Math.random() * 15),
    };
  }

  getDbPoolHealth(): { activeConnections: number; idleConnections: number; maxConnections: number; waitingQueries: number; avgQueryTimeMs: number } {
    return {
      activeConnections: Math.floor(5 + Math.random() * 20),
      idleConnections: Math.floor(10 + Math.random() * 30),
      maxConnections: 100,
      waitingQueries: Math.floor(Math.random() * 5),
      avgQueryTimeMs: Math.floor(3 + Math.random() * 20),
    };
  }

  getDashboard(windowMs: number = 3600_000): {
    latency: ReturnType<typeof this.getLatencyHistogram>;
    errors: ReturnType<typeof this.getErrorRates>;
    throughput: ReturnType<typeof this.getThroughput>;
    latencyTimeSeries: ReturnType<typeof this.getLatencyTimeSeries>;
    topEndpoints: ReturnType<typeof this.getTopEndpoints>;
    aiGateway: ReturnType<typeof this.getAiGatewayMetrics>;
    websocket: ReturnType<typeof this.getWebSocketMetrics>;
    dbPool: ReturnType<typeof this.getDbPoolHealth>;
  } {
    return {
      latency: this.getLatencyHistogram(windowMs),
      errors: this.getErrorRates(windowMs),
      throughput: this.getThroughput(windowMs),
      latencyTimeSeries: this.getLatencyTimeSeries(windowMs),
      topEndpoints: this.getTopEndpoints(windowMs),
      aiGateway: this.getAiGatewayMetrics(),
      websocket: this.getWebSocketMetrics(),
      dbPool: this.getDbPoolHealth(),
    };
  }
}

export const observabilityService = new ObservabilityService();
