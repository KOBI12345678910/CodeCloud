import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { commonEnvSchema, loadEnv, z } from "@platform/env";
import { createLogger } from "@platform/logger";
import { createHttpMetrics, createPromRegistry } from "@platform/telemetry";
import { initNodeTelemetry } from "@platform/telemetry/node";
import { issueCsrfPair, verifyCsrf } from "@platform/auth";
import { randomUUID } from "node:crypto";
import { appRouter, sessions, configureDsar, configureRuntime } from "./router.js";
import { openapiSpec } from "./openapi.js";

/**
 * Cookie naming: `__Host-` prefix REQUIRES the cookie to be `Secure` per
 * RFC 6265bis, which means HTTPS only. In local HTTP dev (NODE_ENV !==
 * "production"), browsers silently reject `__Host-` cookies served over
 * plain HTTP, breaking the entire auth flow. So we use the `__Host-`
 * names only in production and fall back to plain names in dev — strict
 * cookie attributes (HttpOnly / SameSite=Strict) still apply in both.
 */
function cookieNames(isProd: boolean) {
  return isProd
    ? { csrf: "__Host-csrf", session: "__Host-session" }
    : { csrf: "csrf", session: "session" };
}

const env = loadEnv(
  commonEnvSchema.extend({
    PORT: z.coerce.number().default(8080),
    // No defaults: missing secrets must crash boot, never silently fall back.
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
    CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be at least 32 chars"),
    DSAR_ENABLED: z
      .union([z.boolean(), z.string().transform((v) => v === "true" || v === "1")])
      .default(false),
  }),
);

const log = createLogger({ service: "api-trpc", env: env.NODE_ENV });

export async function buildServer() {
  await initNodeTelemetry({
    serviceName: "api-trpc",
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sentryDsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });

  // Apply DSAR feature flag from env at boot. The router otherwise stays
  // disabled-by-default — flipping the flag is the only way procedures
  // become callable.
  configureDsar({ enabled: env.DSAR_ENABLED });

  // Wire production-grade adapters when their URLs are present. With
  // both set, sessions land in Postgres (survive restart, scale across
  // instances) and queue traffic flows through Redis/BullMQ to the
  // worker service. Without them, the in-memory defaults stay in place
  // (used by tests).
  await configureRuntime({
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  });

  const isProd = env.NODE_ENV === "production";
  const cookies = cookieNames(isProd);
  const SESSION_COOKIE = cookies.session;
  const CSRF_COOKIE = cookies.csrf;

  const app = Fastify({ logger: false, disableRequestLogging: true });
  await app.register(fastifyCookie);
  await app.register(fastifyCors, { credentials: true, origin: true });

  const registry = createPromRegistry("api-trpc");
  const { requests, durations } = createHttpMetrics(registry);

  // Request id + structured logging
  type ReqMeta = { reqId: string; startNs: bigint };
  const meta = new WeakMap<object, ReqMeta>();
  app.addHook("onRequest", async (req) => {
    const reqId = (req.headers["x-request-id"] as string) || randomUUID();
    meta.set(req, { reqId, startNs: process.hrtime.bigint() });
  });
  app.addHook("onResponse", async (req, reply) => {
    const m = meta.get(req);
    const start = m?.startNs;
    const dur = start ? Number(process.hrtime.bigint() - start) / 1e9 : 0;
    const labels = {
      method: req.method,
      route: (req.routeOptions?.url as string) ?? req.url,
      status_code: String(reply.statusCode),
    };
    requests.inc(labels);
    durations.observe(labels, dur);
    log.info(
      { reqId: m?.reqId, method: req.method, url: req.url, status: reply.statusCode, durMs: dur * 1000 },
      "request",
    );
  });

  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => ({ ok: true, ts: Date.now() }));

  app.get("/metrics", async (_req, reply) => {
    reply.header("content-type", registry.contentType);
    return registry.metrics();
  });

  app.get("/openapi.json", async () => openapiSpec);

  // CSRF: hand the SPA a fresh pair on demand.
  app.get("/csrf", async (_req, reply) => {
    const pair = issueCsrfPair(env.CSRF_SECRET);
    reply.setCookie(CSRF_COOKIE, pair.cookie, {
      httpOnly: false,
      sameSite: "strict",
      secure: env.NODE_ENV === "production",
      path: "/",
    });
    return { token: pair.header };
  });

  /**
   * After a successful auth.signin response, the SPA POSTs the returned
   * sessionId here so we can put it into a HttpOnly Secure cookie. We
   * never trust the SPA with the session id beyond this exchange — every
   * subsequent protected request is identified by the cookie that the
   * browser attaches automatically.
   */
  app.post("/auth/cookie", async (req, reply) => {
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = req.cookies?.[CSRF_COOKIE];
    if (!verifyCsrf(csrfCookie, csrfHeader, env.CSRF_SECRET)) {
      return reply.status(403).send({ error: "CSRF" });
    }
    const body = req.body as { sessionId?: string } | undefined;
    if (!body?.sessionId) return reply.status(400).send({ error: "sessionId required" });
    const session = await sessions.validate(body.sessionId);
    if (!session) return reply.status(401).send({ error: "invalid session" });
    reply.setCookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "strict",
      secure: env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });
    return { ok: true };
  });

  app.post("/auth/logout", async (req, reply) => {
    // Logout is state-changing → CSRF must be verified just like every
    // other mutating endpoint. Without this, a cross-site form POST
    // could log a victim out of the SPA.
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = req.cookies?.[CSRF_COOKIE];
    if (!verifyCsrf(csrfCookie, csrfHeader, env.CSRF_SECRET)) {
      return reply.status(403).send({ error: "CSRF" });
    }
    const sid = req.cookies?.[SESSION_COOKIE];
    if (sid) await sessions.signout(sid);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  // tRPC mounted under /trpc using the fetch adapter (works with Fastify's
  // raw request/response).
  app.all("/trpc/*", async (req, reply) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method.toUpperCase();
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = req.cookies?.[CSRF_COOKIE];
    const csrfValid =
      method === "GET" || verifyCsrf(csrfCookie, csrfHeader, env.CSRF_SECRET);
    // Identity comes EXCLUSIVELY from the HttpOnly session cookie validated
    // server-side against the SessionManager. We never trust client headers
    // for identity — that would be header-spoofable broken access control.
    const sessionId = req.cookies?.[SESSION_COOKIE];
    const session = await sessions.validate(sessionId);
    const userId = session?.userId ?? null;
    const tenantId = session?.tenantId ?? null;
    const reqMeta = meta.get(req);

    const fetchReq = new Request(url, {
      method,
      headers: req.headers as Record<string, string>,
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(req.body ?? {}),
    });

    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      req: fetchReq,
      router: appRouter,
      createContext: () => ({
        tenantId,
        userId,
        requestId: reqMeta?.reqId ?? randomUUID(),
        csrfValid,
      }),
    });

    reply.status(res.status);
    res.headers.forEach((v, k) => reply.header(k, v));
    return res.text();
  });

  return { app, registry };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { app } = await buildServer();
  app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
    log.info({ port: env.PORT }, "api-trpc listening");
  });
}
