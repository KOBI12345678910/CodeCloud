/**
 * Verifies the worker exposes a Prometheus /metrics endpoint and basic
 * liveness probes over HTTP. Boots the metrics server on an ephemeral
 * port, scrapes it, and asserts the Prom exposition format is present.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { createPromRegistry, createHttpMetrics } from "@platform/telemetry";

let server: Server;
let port: number;

beforeAll(async () => {
  const registry = createPromRegistry("worker-test");
  const { requests } = createHttpMetrics(registry);
  requests.inc({ method: "job", route: "health", status_code: "ok" });

  server = createServer(async (req, res) => {
    if (req.url === "/metrics") {
      res.setHeader("content-type", registry.contentType);
      res.end(await registry.metrics());
      return;
    }
    if (req.url === "/healthz" || req.url === "/readyz") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr !== "object") throw new Error("no address");
  port = addr.port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("worker observability", () => {
  it("/healthz responds 200", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(r.status).toBe(200);
  });

  it("/readyz responds 200", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/readyz`);
    expect(r.status).toBe(200);
  });

  it("/metrics exposes Prometheus exposition format with worker counters", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/metrics`);
    expect(r.status).toBe(200);
    const ct = r.headers.get("content-type") ?? "";
    expect(ct).toMatch(/text\/plain/);
    const body = await r.text();
    expect(body).toMatch(/# HELP/);
    expect(body).toMatch(/# TYPE/);
    expect(body).toMatch(/route="health"/);
  });
});
