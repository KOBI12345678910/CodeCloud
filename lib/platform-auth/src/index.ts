import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password hashing using argon2id via @node-rs/argon2 (loaded lazily so test
 * environments without native bindings still work — they get a scrypt fallback).
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const { hash } = await import("@node-rs/argon2");
    return await hash(password);
  } catch {
    const { scryptSync } = await import("node:crypto");
    const salt = randomBytes(16);
    const derived = scryptSync(password, salt, 32);
    return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("scrypt$")) {
    const [, saltB64, derivedB64] = stored.split("$");
    if (!saltB64 || !derivedB64) return false;
    const { scryptSync } = await import("node:crypto");
    const candidate = scryptSync(password, Buffer.from(saltB64, "base64"), 32);
    const expected = Buffer.from(derivedB64, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }
  try {
    const { verify } = await import("@node-rs/argon2");
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/**
 * CSRF helpers — HMAC-bound double-submit cookie.
 *
 * Server flow:
 *   1. On session start, call `issueCsrfPair(sessionSecret)` and set the
 *      returned `cookie` value on a `__Host-csrf` cookie (HttpOnly=false,
 *      SameSite=Strict, Secure). Hand the matching `header` value to the
 *      browser (e.g. via a meta tag) so the SPA echoes it back in
 *      `X-CSRF-Token` on every mutating request.
 *   2. On each mutating request, call
 *      `verifyCsrf(cookieValue, headerValue, sessionSecret)`. The cookie
 *      contains an HMAC over the header token bound to the session secret,
 *      so an attacker who can set a cookie on the victim's browser cannot
 *      forge a matching header value.
 */
import { createHmac } from "node:crypto";

export interface CsrfPair {
  cookie: string;
  header: string;
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function csrfMac(headerToken: string, sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(headerToken).digest("base64url");
}

/** @deprecated kept for compatibility with earlier versions. */
export function csrfTokenHash(token: string, secret: string): string {
  return createHash("sha256").update(`${token}:${secret}`).digest("base64url");
}

export function issueCsrfPair(sessionSecret: string): CsrfPair {
  const header = generateCsrfToken();
  const mac = csrfMac(header, sessionSecret);
  return { cookie: `${header}.${mac}`, header };
}

export function verifyCsrf(
  cookieValue: string | undefined,
  headerValue: string | undefined,
  sessionSecret: string,
): boolean {
  if (!cookieValue || !headerValue || !sessionSecret) return false;
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return false;
  const cookieHeader = cookieValue.slice(0, dot);
  const cookieMac = cookieValue.slice(dot + 1);

  // Header value must match the header portion of the cookie.
  if (cookieHeader.length !== headerValue.length) return false;
  if (!timingSafeEqual(Buffer.from(cookieHeader), Buffer.from(headerValue))) return false;

  // And the MAC must verify under the session secret.
  const expectedMac = csrfMac(headerValue, sessionSecret);
  if (cookieMac.length !== expectedMac.length) return false;
  return timingSafeEqual(Buffer.from(cookieMac), Buffer.from(expectedMac));
}

/** Session helpers — Lucia-compatible session id generation. */
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export function isSessionExpired(session: Session, now = new Date()): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

export {
  SessionManager,
  InMemorySessionAdapter,
  type User,
  type SessionRecord,
  type SessionAdapter,
  type SignupInput,
  type SigninResult,
} from "./lucia.js";
export { PostgresSessionAdapter, type PgQueryable } from "./postgres-adapter.js";
