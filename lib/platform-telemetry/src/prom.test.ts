import { describe, expect, it } from "vitest";
import { createHttpMetrics, createPromRegistry } from "./prom.js";

describe("@platform/telemetry/prom", () => {
  it("creates a registry with default metrics and HTTP metrics", async () => {
    const registry = createPromRegistry("test-service");
    const { requests } = createHttpMetrics(registry);
    requests.inc({ method: "GET", route: "/x", status_code: "200" });
    const out = await registry.metrics();
    expect(out).toContain("http_requests_total");
    expect(out).toContain('service="test-service"');
  });
});
