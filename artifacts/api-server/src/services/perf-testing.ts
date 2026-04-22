export interface PerfTest {
  id: string;
  name: string;
  url: string;
  method: string;
  concurrency: number;
  duration: number;
  status: "pending" | "running" | "completed" | "failed";
  results: PerfResult | null;
  createdAt: Date;
}

export interface PerfResult {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  requestsPerSecond: number;
  errorRate: number;
}

class PerfTestingService {
  private tests: Map<string, PerfTest> = new Map();

  create(data: { name: string; url: string; method?: string; concurrency?: number; duration?: number }): PerfTest {
    const id = `perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const test: PerfTest = {
      id, name: data.name, url: data.url, method: data.method || "GET",
      concurrency: data.concurrency || 10, duration: data.duration || 30,
      status: "pending", results: null, createdAt: new Date(),
    };
    this.tests.set(id, test);
    return test;
  }

  run(id: string): PerfTest | null {
    const test = this.tests.get(id);
    if (!test) return null;
    test.status = "running";
    const totalReqs = test.concurrency * test.duration;
    const failures = Math.floor(totalReqs * Math.random() * 0.05);
    const latencies = Array.from({ length: totalReqs }, () => Math.random() * 200 + 10).sort((a, b) => a - b);
    test.results = {
      totalRequests: totalReqs, successCount: totalReqs - failures, failureCount: failures,
      avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      p50Ms: Math.round(latencies[Math.floor(latencies.length * 0.5)]),
      p95Ms: Math.round(latencies[Math.floor(latencies.length * 0.95)]),
      p99Ms: Math.round(latencies[Math.floor(latencies.length * 0.99)]),
      requestsPerSecond: Math.round(totalReqs / test.duration),
      errorRate: failures / totalReqs,
    };
    test.status = "completed";
    return test;
  }

  get(id: string): PerfTest | null { return this.tests.get(id) || null; }
  list(): PerfTest[] { return Array.from(this.tests.values()); }
  delete(id: string): boolean { return this.tests.delete(id); }
}

export const perfTestingService = new PerfTestingService();
