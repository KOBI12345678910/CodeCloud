/**
 * End-to-end auth integration test:
 *  1. Boots a real Fastify server on a random port.
 *  2. Walks the SPA flow: /csrf → tRPC auth.signup → tRPC auth.signin →
 *     POST /auth/cookie to upgrade the sessionId into a HttpOnly cookie.
 *  3. Confirms /trpc/me returns the authenticated subject when the cookie
 *     is present.
 *  4. Confirms a forged x-user-id / x-tenant-id header WITHOUT the
 *     session cookie returns UNAUTHORIZED — proving the previous
 *     header-trusted identity vector is closed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let baseUrl: string;

beforeAll(async () => {
  process.env.SESSION_SECRET = "x".repeat(32);
  process.env.CSRF_SECRET = "y".repeat(32);
  process.env.PORT = "0";
  const mod = await import("./index.js");
  const built = await mod.buildServer();
  app = built.app;
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  if (!addr || typeof addr !== "object") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await app?.close();
});

function parseCookies(setCookie: string[] | string | null | undefined): Record<string, string> {
  const arr = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const out: Record<string, string> = {};
  for (const line of arr) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

interface TrpcEnvelope<T> {
  result: { data: T };
}

describe("api-trpc cookie-based auth integration", () => {
  it("rejects spoofed identity headers when no session cookie is present", async () => {
    const res = await fetch(`${baseUrl}/trpc/me`, {
      headers: { "x-user-id": "spoofed", "x-tenant-id": "spoofed" },
    });
    expect(res.status).toBe(401);
  });

  it("walks signup → signin → cookie upgrade → me, then blocks header spoofing", async () => {
    // 1. CSRF
    const csrfRes = await fetch(`${baseUrl}/csrf`);
    const { token } = (await csrfRes.json()) as { token: string };
    const csrfCookies = parseCookies(
      csrfRes.headers.getSetCookie?.() ?? csrfRes.headers.get("set-cookie"),
    );
    const cookieHeader = `csrf=${csrfCookies["csrf"]}`;
    expect(token).toBeTruthy();
    expect(csrfCookies["csrf"]).toBeTruthy();

    // 2. Signup
    const email = `it-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const signup = await fetch(`${baseUrl}/trpc/auth.signup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
        cookie: cookieHeader,
      },
      body: JSON.stringify({ email, password: "hunter22hunter22", tenantId: "itTenant" }),
    });
    expect(signup.status).toBe(200);

    // 3. Signin
    const signinRes = await fetch(`${baseUrl}/trpc/auth.signin`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
        cookie: cookieHeader,
      },
      body: JSON.stringify({ email, password: "hunter22hunter22" }),
    });
    expect(signinRes.status).toBe(200);
    const signinBody = (await signinRes.json()) as TrpcEnvelope<{
      sessionId: string;
      userId: string;
      tenantId: string;
    }>;
    const { sessionId, userId } = signinBody.result.data;
    expect(sessionId).toBeTruthy();

    // 4. Upgrade the sessionId into a HttpOnly cookie
    const upgrade = await fetch(`${baseUrl}/auth/cookie`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
        cookie: cookieHeader,
      },
      body: JSON.stringify({ sessionId }),
    });
    expect(upgrade.status).toBe(200);
    const sessionCookies = parseCookies(
      upgrade.headers.getSetCookie?.() ?? upgrade.headers.get("set-cookie"),
    );
    const sessionCookie = sessionCookies["session"];
    expect(sessionCookie).toBeTruthy();

    // 5. /trpc/me with the cookie returns the subject
    const me = await fetch(`${baseUrl}/trpc/me`, {
      headers: { cookie: `session=${sessionCookie}` },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as TrpcEnvelope<{ userId: string; tenantId: string }>;
    expect(meBody.result.data.userId).toBe(userId);
    expect(meBody.result.data.tenantId).toBe("itTenant");

    // 6. Header-only spoofing without the cookie still fails
    const spoof = await fetch(`${baseUrl}/trpc/me`, {
      headers: {
        "x-user-id": userId,
        "x-tenant-id": "attacker-tenant",
      },
    });
    expect(spoof.status).toBe(401);

    // 7. /auth/logout without a CSRF token must be rejected even
    //    though the session cookie is present (state-changing route).
    const logoutNoCsrf = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { cookie: `session=${sessionCookie}` },
    });
    expect(logoutNoCsrf.status).toBe(403);

    // 8. The session is still valid after the rejected logout attempt
    const stillMe = await fetch(`${baseUrl}/trpc/me`, {
      headers: { cookie: `session=${sessionCookie}` },
    });
    expect(stillMe.status).toBe(200);

    // 9. With the matching CSRF cookie + header, logout succeeds
    const logout = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "x-csrf-token": token,
        cookie: `${cookieHeader}; session=${sessionCookie}`,
      },
    });
    expect(logout.status).toBe(200);
  });
});
