/**
 * End-to-end queue integration test:
 *
 *   API (tRPC mutation) → @platform/queue driver → worker handler
 *
 * Boots a real Fastify+tRPC server, calls the `health.enqueue` mutation
 * over HTTP through the SPA cookie flow, and verifies the worker-side
 * handler registered in `router.ts` actually consumed the job. This is
 * the same shape used in production — only the driver implementation
 * differs (InMemory in tests, BullMQ over Redis in prod). The contract
 * exercised is identical.
 */
import { describe, it, expect, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { processedHealthJobs, queueDriver } from "./router.js";

let app: FastifyInstance;
let baseUrl: string;

async function boot() {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "x".repeat(48);
  process.env.CSRF_SECRET = process.env.CSRF_SECRET || "y".repeat(48);
  process.env.NODE_ENV = "test";
  const { buildServer } = await import("./index.js");
  ({ app } = await buildServer());
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  if (!addr || typeof addr !== "object") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
}

afterAll(async () => {
  if (app) await app.close();
});

function parseSetCookie(h: string[] | string | null | undefined): Record<string, string> {
  if (!h) return {};
  const arr = Array.isArray(h) ? h : [h];
  const out: Record<string, string> = {};
  for (const line of arr) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

describe("API → queue → worker integration", () => {
  it("enqueue mutation lands in the worker handler and updates processed jobs", async () => {
    await boot();

    // 1. CSRF pair
    const csrfRes = await fetch(`${baseUrl}/csrf`);
    const { token } = (await csrfRes.json()) as { token: string };
    const csrfCookies = parseSetCookie(
      csrfRes.headers.getSetCookie?.() ?? csrfRes.headers.get("set-cookie"),
    );
    let cookieHeader = `csrf=${csrfCookies["csrf"]}`;

    // 2. Signup + signin to obtain a sessionId
    const email = `qe2e-${Date.now()}@example.com`;
    await fetch(`${baseUrl}/trpc/auth.signup`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader, "x-csrf-token": token },
      body: JSON.stringify({ email, password: "passpasspass", tenantId: "tenantE2E" }),
    });
    const signinRes = await fetch(`${baseUrl}/trpc/auth.signin`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader, "x-csrf-token": token },
      body: JSON.stringify({ email, password: "passpasspass" }),
    });
    const signinBody = (await signinRes.json()) as { result: { data: { sessionId: string } } };

    // 3. Upgrade sessionId to a HttpOnly session cookie
    const upgradeRes = await fetch(`${baseUrl}/auth/cookie`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader, "x-csrf-token": token },
      body: JSON.stringify({ sessionId: signinBody.result.data.sessionId }),
    });
    const sessionCookies = parseSetCookie(
      upgradeRes.headers.getSetCookie?.() ?? upgradeRes.headers.get("set-cookie"),
    );
    cookieHeader = `csrf=${csrfCookies["csrf"]}; session=${sessionCookies["session"]}`;

    // 4. Now actually enqueue the job through the full mutating path
    const before = processedHealthJobs.length;
    const ping = `e2e-${Date.now()}`;

    const res = await fetch(`${baseUrl}/trpc/health.enqueue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
        "x-csrf-token": token,
      },
      body: JSON.stringify({ msg: ping }),
    });
    expect(res.status).toBe(200);

    // Drain the in-process driver to guarantee the worker handler ran.
    await queueDriver.drain();

    const after = processedHealthJobs.length;
    expect(after).toBe(before + 1);
    expect(processedHealthJobs[after - 1]?.ping).toBe(ping);
  }, 15_000);
});
