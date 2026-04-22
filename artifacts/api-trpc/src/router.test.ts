import { describe, it, expect, beforeEach } from "vitest";
import {
  appRouter,
  processedHealthJobs,
  configureDsar,
  sessions,
} from "./router.js";
import { openapiSpec } from "./openapi.js";

function caller(ctx: {
  tenantId: string | null;
  userId: string | null;
  requestId: string;
  csrfValid: boolean;
}) {
  return appRouter.createCaller(ctx);
}

describe("api-trpc router", () => {
  beforeEach(() => {
    processedHealthJobs.length = 0;
  });

  it("health.ping echoes input", async () => {
    const c = caller({ tenantId: null, userId: null, requestId: "r1", csrfValid: true });
    const out = await c.health.ping({ msg: "hello" });
    expect(out.ok).toBe(true);
    expect(out.echo).toBe("hello");
  });

  it("health.enqueue runs job through queue driver", async () => {
    const c = caller({ tenantId: "t", userId: "u", requestId: "r2", csrfValid: true });
    const out = await c.health.enqueue({ msg: "qmsg" });
    expect(out.processed).toBe(1);
    expect(processedHealthJobs[0].ping).toBe("qmsg");
  });

  it("mutating procedure rejects on csrf invalid", async () => {
    // Auth check runs first, then csrf — so we must be authenticated to
    // exercise the csrf branch.
    const c = caller({ tenantId: "t", userId: "u", requestId: "r3", csrfValid: false });
    await expect(c.health.enqueue({ msg: "x" })).rejects.toThrow(/CSRF/i);
  });

  it("protected procedure rejects when unauthenticated", async () => {
    const c = caller({ tenantId: null, userId: null, requestId: "r4", csrfValid: true });
    await expect(c.me()).rejects.toThrow(/UNAUTHORIZED|unauth/i);
  });

  it("protected procedure returns subject when authenticated", async () => {
    const c = caller({
      tenantId: "t1",
      userId: "u1",
      requestId: "r5",
      csrfValid: true,
    });
    const out = await c.me();
    expect(out).toEqual({ tenantId: "t1", userId: "u1", requestId: "r5" });
  });

  it("auth.signup + signin + signout end-to-end", async () => {
    const c = caller({ tenantId: null, userId: null, requestId: "auth1", csrfValid: true });
    const su = await c.auth.signup({
      email: "alpha@x.io",
      password: "hunter22hunter22",
      tenantId: "tenantA",
    });
    expect(su.tenantId).toBe("tenantA");
    const si = await c.auth.signin({ email: "alpha@x.io", password: "hunter22hunter22" });
    expect(si.userId).toBe(su.userId);
    expect(await sessions.validate(si.sessionId)).not.toBeNull();
    const auth = caller({
      tenantId: si.tenantId,
      userId: si.userId,
      requestId: "auth2",
      csrfValid: true,
    });
    await auth.auth.signout({ sessionId: si.sessionId });
    expect(await sessions.validate(si.sessionId)).toBeNull();
  });

  it("auth.signout requires csrf (state-changing → CSRF enforced)", async () => {
    const noCsrf = caller({
      tenantId: "t",
      userId: "u",
      requestId: "so1",
      csrfValid: false,
    });
    await expect(
      noCsrf.auth.signout({ sessionId: "doesnt-matter" }),
    ).rejects.toThrow(/CSRF/i);
  });

  it("auth.signup rejects without csrf", async () => {
    const c = caller({ tenantId: null, userId: null, requestId: "auth3", csrfValid: false });
    await expect(
      c.auth.signup({ email: "x@x.io", password: "hunter22hunter22", tenantId: "t" }),
    ).rejects.toThrow(/CSRF/i);
  });

  it("dsar.export forbidden when feature flag disabled", async () => {
    configureDsar({ enabled: false });
    const c = caller({ tenantId: "t", userId: "u", requestId: "d1", csrfValid: true });
    await expect(c.dsar.export()).rejects.toThrow(/DSAR disabled/);
  });

  it("dsar.export enqueues a job when enabled", async () => {
    configureDsar({ enabled: true });
    const c = caller({ tenantId: "t", userId: "u-1", requestId: "d2", csrfValid: true });
    const out = await c.dsar.export();
    expect(out.ok).toBe(true);
    configureDsar({ enabled: false });
  });

  it("dsar.delete requires csrf", async () => {
    configureDsar({ enabled: true });
    const c = caller({ tenantId: "t", userId: "u", requestId: "d3", csrfValid: false });
    await expect(c.dsar.delete()).rejects.toThrow(/CSRF/i);
    configureDsar({ enabled: false });
  });

  it("openapi spec stays in sync with declared routes", () => {
    const declared = Object.keys(openapiSpec.paths);
    expect(declared).toContain("/trpc/health.ping");
    expect(declared).toContain("/trpc/health.enqueue");
    expect(declared).toContain("/trpc/me");
    expect(declared).toContain("/healthz");
    expect(declared).toContain("/readyz");
    expect(declared).toContain("/metrics");
  });
});
