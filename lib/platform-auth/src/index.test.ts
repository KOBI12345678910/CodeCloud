import { describe, expect, it } from "vitest";
import {
  generateCsrfToken,
  generateSessionId,
  hashPassword,
  isSessionExpired,
  verifyCsrf,
  verifyPassword,
} from "./index.js";

describe("@platform/auth", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toContain("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("verifies HMAC-bound CSRF pairs and rejects forgeries", async () => {
    const { issueCsrfPair, verifyCsrf } = await import("./index.js");
    const secret = "session-secret-aaa";
    const pair = issueCsrfPair(secret);
    // Happy path
    expect(verifyCsrf(pair.cookie, pair.header, secret)).toBe(true);
    // Wrong secret (attacker can set cookie but cannot forge MAC)
    expect(verifyCsrf(pair.cookie, pair.header, "different-secret")).toBe(false);
    // Mismatched header
    expect(verifyCsrf(pair.cookie, generateCsrfToken(), secret)).toBe(false);
    // Missing values
    expect(verifyCsrf(undefined, pair.header, secret)).toBe(false);
    expect(verifyCsrf(pair.cookie, undefined, secret)).toBe(false);
    expect(verifyCsrf(pair.cookie, pair.header, "")).toBe(false);
    // Tampered cookie (attacker swaps header but keeps old MAC)
    const evil = `${generateCsrfToken()}.${pair.cookie.split(".")[1]}`;
    expect(verifyCsrf(evil, evil.split(".")[0], secret)).toBe(false);
  });

  it("detects expired sessions", () => {
    const id = generateSessionId();
    expect(id).toHaveLength(43);
    expect(
      isSessionExpired({ id, userId: "u", expiresAt: new Date(Date.now() - 1000) }),
    ).toBe(true);
    expect(
      isSessionExpired({ id, userId: "u", expiresAt: new Date(Date.now() + 60_000) }),
    ).toBe(false);
  });
});
