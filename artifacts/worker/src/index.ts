import { commonEnvSchema, loadEnv, z } from "@platform/env";
import { createLogger } from "@platform/logger";
import {
  InMemoryQueueDriver,
  type QueueDriver,
  createBullMqDriver,
} from "@platform/queue";
import { initNodeTelemetry } from "@platform/telemetry/node";
import {
  createPromRegistry,
  createHttpMetrics,
} from "@platform/telemetry";
import { createServer } from "node:http";

const env = loadEnv(
  commonEnvSchema.extend({
    REDIS_URL: z.string().url().optional(),
    METRICS_PORT: z.coerce.number().default(9090),
  }),
);
const log = createLogger({ service: "worker", env: env.NODE_ENV });

const registry = createPromRegistry("worker");
const { requests: jobsTotal, durations: jobDurations } = createHttpMetrics(registry);

/**
 * Tiny HTTP surface so Prometheus, k8s liveness, and operators can scrape
 * worker state. We deliberately keep this dependency-free (node:http) so
 * the worker doesn't pull in Fastify just to expose three endpoints.
 */
function startMetricsServer() {
  const server = createServer(async (req, res) => {
    if (req.url === "/metrics") {
      res.setHeader("content-type", registry.contentType);
      res.end(await registry.metrics());
      return;
    }
    if (req.url === "/healthz" || req.url === "/readyz") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  server.listen(env.METRICS_PORT, "0.0.0.0", () => {
    log.info({ port: env.METRICS_PORT }, "worker metrics server listening");
  });
  return server;
}

/** Wrap a queue handler so jobs get observability for free. */
function instrument<TPayload>(
  queue: string,
  handler: (payload: TPayload) => Promise<void>,
): (payload: TPayload) => Promise<void> {
  return async (payload) => {
    const start = process.hrtime.bigint();
    let status = "ok";
    try {
      await handler(payload);
    } catch (err) {
      status = "error";
      throw err;
    } finally {
      const dur = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = { method: "job", route: queue, status_code: status };
      jobsTotal.inc(labels);
      jobDurations.observe(labels, dur);
    }
  };
}

async function buildDriver(): Promise<QueueDriver> {
  if (!env.REDIS_URL) {
    log.warn("REDIS_URL not set; falling back to in-memory queue driver");
    return new InMemoryQueueDriver();
  }
  const url = new URL(env.REDIS_URL);
  return createBullMqDriver({
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password || undefined,
    },
  });
}

async function main() {
  await initNodeTelemetry({
    serviceName: "worker",
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sentryDsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });

  const metricsServer = startMetricsServer();
  const driver = await buildDriver();

  await driver.process(
    "health",
    instrument("health", async (payload) => {
      log.info({ payload }, "health.ping processed");
    }),
  );

  await driver.process(
    "audit-log-writer",
    instrument("audit-log-writer", async (payload) => {
      log.info({ payload }, "audit-log entry written");
      // Production impl would persist via @platform/db
    }),
  );

  log.info("worker ready, listening on queues: health, audit-log-writer");

  // Self-test on boot in dev
  if (env.NODE_ENV !== "production") {
    await driver.enqueue("health", { ping: "boot-self-test", ts: Date.now() });
  }

  const shutdown = async () => {
    log.info("worker shutting down");
    metricsServer.close();
    await driver.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error({ err }, "worker failed to start");
  process.exit(1);
});
