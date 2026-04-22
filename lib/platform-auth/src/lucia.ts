/**
 * Lucia-compatible session manager.
 *
 * We don't depend on `lucia` directly because the upstream package has
 * frozen v3 and is no longer maintained — Lucia's author recommends
 * "copying the relevant code into your project" instead. This module is a
 * minimal, drop-in compatible implementation of the parts the platform
 * actually uses (signup, signin, session validation, signout) on top of an
 * adapter interface that any backing store can implement.
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "./index.js";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userIdHash: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionAdapter {
  findUserByEmail(email: string): Promise<User | null>;
  insertUser(u: User): Promise<void>;
  findSession(id: string): Promise<SessionRecord | null>;
  insertSession(s: SessionRecord): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
}

export interface SignupInput {
  email: string;
  password: string;
  tenantId: string;
}

export interface SigninResult {
  user: User;
  session: SessionRecord;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export class SessionManager {
  constructor(private readonly adapter: SessionAdapter) {}

  async signup({ email, password, tenantId }: SignupInput): Promise<User> {
    if (!email.includes("@")) throw new Error("invalid email");
    if (password.length < 8) throw new Error("password too short");
    const existing = await this.adapter.findUserByEmail(email);
    if (existing) throw new Error("email already registered");
    const user: User = {
      id: randomBytes(12).toString("base64url"),
      email,
      passwordHash: await hashPassword(password),
      tenantId,
      createdAt: new Date(),
    };
    await this.adapter.insertUser(user);
    return user;
  }

  async signin(email: string, password: string): Promise<SigninResult> {
    const user = await this.adapter.findUserByEmail(email);
    if (!user) throw new Error("invalid credentials");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error("invalid credentials");
    const session = await this.createSession(user);
    return { user, session };
  }

  async createSession(user: User): Promise<SessionRecord> {
    const id = randomBytes(32).toString("base64url");
    const rec: SessionRecord = {
      id,
      userIdHash: createHash("sha256").update(user.id).digest("base64url"),
      userId: user.id,
      tenantId: user.tenantId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      createdAt: new Date(),
    };
    await this.adapter.insertSession(rec);
    return rec;
  }

  async validate(sessionId: string | undefined | null): Promise<SessionRecord | null> {
    if (!sessionId) return null;
    const rec = await this.adapter.findSession(sessionId);
    if (!rec) return null;
    if (rec.expiresAt.getTime() <= Date.now()) {
      await this.adapter.deleteSession(rec.id);
      return null;
    }
    // Defense-in-depth: confirm the bound user-id hash matches.
    const expected = createHash("sha256").update(rec.userId).digest("base64url");
    if (
      expected.length !== rec.userIdHash.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(rec.userIdHash))
    ) {
      await this.adapter.deleteSession(rec.id);
      return null;
    }
    return rec;
  }

  async signout(sessionId: string): Promise<void> {
    await this.adapter.deleteSession(sessionId);
  }

  async signoutAll(userId: string): Promise<void> {
    await this.adapter.deleteUserSessions(userId);
  }
}

/** In-memory adapter — useful for tests and a reference implementation. */
export class InMemorySessionAdapter implements SessionAdapter {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, User>();
  private sessions = new Map<string, SessionRecord>();

  async findUserByEmail(email: string) {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }
  async insertUser(u: User) {
    this.users.set(u.id, u);
    this.usersByEmail.set(u.email.toLowerCase(), u);
  }
  async findSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async insertSession(s: SessionRecord) {
    this.sessions.set(s.id, s);
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
  }
  async deleteUserSessions(userId: string) {
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id);
    }
  }
}
