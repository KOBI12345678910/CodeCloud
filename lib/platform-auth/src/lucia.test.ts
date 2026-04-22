import { describe, it, expect } from "vitest";
import { SessionManager, InMemorySessionAdapter } from "./lucia.js";

function makeMgr() {
  return { mgr: new SessionManager(new InMemorySessionAdapter()) };
}

describe("SessionManager (Lucia-compatible)", () => {
  it("signup creates a unique user", async () => {
    const { mgr } = makeMgr();
    const u = await mgr.signup({
      email: "a@example.com",
      password: "hunter22hunter22",
      tenantId: "t1",
    });
    expect(u.email).toBe("a@example.com");
    expect(u.tenantId).toBe("t1");
    await expect(
      mgr.signup({ email: "a@example.com", password: "hunter22hunter22", tenantId: "t1" }),
    ).rejects.toThrow(/already/);
  });

  it("rejects weak passwords and bad emails", async () => {
    const { mgr } = makeMgr();
    await expect(
      mgr.signup({ email: "no-at", password: "hunter22hunter22", tenantId: "t" }),
    ).rejects.toThrow(/email/);
    await expect(
      mgr.signup({ email: "x@y", password: "short", tenantId: "t" }),
    ).rejects.toThrow(/password/);
  });

  it("signin issues a session that validates and can be revoked", async () => {
    const { mgr } = makeMgr();
    await mgr.signup({ email: "b@x.io", password: "hunter22hunter22", tenantId: "t2" });
    const { session } = await mgr.signin("b@x.io", "hunter22hunter22");
    const found = await mgr.validate(session.id);
    expect(found?.userId).toBe(session.userId);
    await mgr.signout(session.id);
    expect(await mgr.validate(session.id)).toBeNull();
  });

  it("rejects bad credentials", async () => {
    const { mgr } = makeMgr();
    await mgr.signup({ email: "c@x.io", password: "hunter22hunter22", tenantId: "t" });
    await expect(mgr.signin("c@x.io", "wrong-password-here")).rejects.toThrow(/credentials/);
    await expect(mgr.signin("nope@x.io", "hunter22hunter22")).rejects.toThrow(/credentials/);
  });

  it("expired sessions are deleted on validate", async () => {
    const adapter = new InMemorySessionAdapter();
    const mgr = new SessionManager(adapter);
    const u = await mgr.signup({
      email: "d@x.io",
      password: "hunter22hunter22",
      tenantId: "t",
    });
    const s = await mgr.createSession(u);
    // Force expiry
    s.expiresAt = new Date(Date.now() - 1000);
    await adapter.insertSession(s);
    expect(await mgr.validate(s.id)).toBeNull();
  });

  it("validate returns null for unknown session id", async () => {
    const { mgr } = makeMgr();
    expect(await mgr.validate("does-not-exist")).toBeNull();
    expect(await mgr.validate(undefined)).toBeNull();
  });

  it("signoutAll clears every session for a user", async () => {
    const { mgr } = makeMgr();
    const u = await mgr.signup({
      email: "e@x.io",
      password: "hunter22hunter22",
      tenantId: "t",
    });
    const s1 = await mgr.createSession(u);
    const s2 = await mgr.createSession(u);
    await mgr.signoutAll(u.id);
    expect(await mgr.validate(s1.id)).toBeNull();
    expect(await mgr.validate(s2.id)).toBeNull();
  });
});
