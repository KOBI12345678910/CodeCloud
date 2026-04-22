import { Router, type IRouter } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateAndRotateRefreshToken,
  blacklistAccessToken,
  revokeAllUserTokens,
  revokeTokenFamily,
} from "../services/token";
import {
  getGitHubConfig,
  buildGitHubAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchGitHubEmails,
  getPrimaryEmail,
} from "../services/github";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import { sendLocalizedError, localizedError } from "../lib/errors";
import { RegisterSchema, LoginSchema, RefreshTokenSchema, ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema } from "../validators/schemas";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router: IRouter = Router();

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

// ─── REGISTER ────────────────────────────────────────────

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  const { email: rawEmail, password, username, displayName } = parsed.data;
  const email = sanitizeEmail(rawEmail);

  if (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
    res.status(400).json({ error: "Username must be 3-30 characters (letters, numbers, _, -)" });
    return;
  }

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    sendLocalizedError(req, res, "errors.auth.emailTaken");
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (existingUsername) {
    sendLocalizedError(req, res, "errors.auth.usernameTaken");
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      username,
      displayName: displayName || username,
      passwordHash,
      authProvider: "local",
      emailVerified: false,
    })
    .returning();

  const accessToken = generateAccessToken(user);
  const { token: refreshToken, family } = generateRefreshToken(user.id);

  await storeRefreshToken(
    user.id,
    refreshToken,
    family,
    req.headers["user-agent"],
    req.ip
  );

  logAudit({
    userId: user.id,
    action: "user.register",
    resourceType: "user",
    resourceId: user.id,
    metadata: { email, username },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      plan: user.plan,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// ─── LOGIN ───────────────────────────────────────────────

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  const { email: rawEmail, password } = parsed.data;
  const email = sanitizeEmail(rawEmail);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    sendLocalizedError(req, res, "errors.auth.invalidCredentials");
    return;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    const { status, body } = localizedError(req, "errors.auth.locked", { minutes: minutesLeft });
    res.status(status).json({ ...body, lockedUntil: user.lockedUntil.toISOString() });
    return;
  }

  if (!user.passwordHash) {
    const { status, body } = localizedError(req, "errors.auth.oauthOnly", { provider: user.authProvider });
    res.status(status).json(body);
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const updateData: Record<string, unknown> = { failedLoginAttempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      updateData.failedLoginAttempts = 0;
    }

    await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id));

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const { status, body } = localizedError(req, "errors.auth.lockedJustNow");
      res.status(status).json({ ...body, lockedUntil: (updateData.lockedUntil as Date).toISOString() });
      return;
    }

    const { status, body } = localizedError(req, "errors.auth.invalidCredentials");
    res.status(status).json({ ...body, remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts });
    return;
  }

  await db
    .update(usersTable)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const accessToken = generateAccessToken(user);
  const { token: refreshToken, family } = generateRefreshToken(user.id);

  await storeRefreshToken(
    user.id,
    refreshToken,
    family,
    req.headers["user-agent"],
    req.ip
  );

  logAudit({
    userId: user.id,
    action: "user.login",
    resourceType: "user",
    resourceId: user.id,
    metadata: { email },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      plan: user.plan,
      avatarUrl: user.avatarUrl,
      locale: ((user.preferences as Record<string, unknown> | null)?.locale as string | undefined) ?? null,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// ─── REFRESH TOKEN ───────────────────────────────────────

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  const { refreshToken } = parsed.data;

  const result = await validateAndRotateRefreshToken(
    refreshToken,
    req.headers["user-agent"],
    req.ip
  );

  if (!result) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, result.userId));

  if (!user) {
    sendLocalizedError(req, res, "errors.auth.userNotFound");
    return;
  }

  const newAccessToken = generateAccessToken(user);
  const { token: newRefreshToken, family: newFamily } = generateRefreshToken(
    user.id,
    result.newFamily
  );

  await storeRefreshToken(
    user.id,
    newRefreshToken,
    newFamily,
    req.headers["user-agent"],
    req.ip
  );

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  });
});

// ─── LOGOUT ──────────────────────────────────────────────

router.post("/auth/logout", requireJwtAuth, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.slice(7);
  const { refreshToken } = req.body;

  if (accessToken) {
    blacklistAccessToken(accessToken);
  }

  if (refreshToken) {
    try {
      const { verifyRefreshToken } = await import("../services/token");
      const payload = verifyRefreshToken(refreshToken);
      await revokeTokenFamily(payload.family);
    } catch {
      // ignore invalid refresh tokens during logout
    }
  }

  res.json({ message: "Logged out successfully" });
});

// ─── LOGOUT ALL SESSIONS ────────────────────────────────

router.post("/auth/logout-all", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.slice(7);
  if (accessToken) {
    blacklistAccessToken(accessToken);
  }

  await revokeAllUserTokens(userId);

  res.json({ message: "All sessions revoked" });
});

// ─── GET CURRENT USER ────────────────────────────────────

router.get("/auth/me", requireJwtAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    plan: user.plan,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    locale: ((user.preferences as Record<string, unknown> | null)?.locale as string | undefined) ?? null,
  });
});

// ─── CHANGE PASSWORD ─────────────────────────────────────

router.post("/auth/change-password", requireJwtAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  if (!user.passwordHash) {
    sendLocalizedError(req, res, "errors.auth.passwordOauth");
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    sendLocalizedError(req, res, "errors.auth.passwordCurrentWrong");
    return;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  await revokeAllUserTokens(user.id);

  const accessToken = generateAccessToken(user);
  const { token: refreshToken, family } = generateRefreshToken(user.id);

  await storeRefreshToken(
    user.id,
    refreshToken,
    family,
    req.headers["user-agent"],
    req.ip
  );

  res.json({
    message: "Password changed. All other sessions revoked.",
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// ─── PASSWORD RESET: Token store ────────────────────────

interface ResetTokenData {
  userId: string;
  email: string;
  createdAt: number;
}

const pendingResetTokens = new Map<string, ResetTokenData>();
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pendingResetTokens) {
    if (now - data.createdAt > RESET_TOKEN_TTL_MS) {
      pendingResetTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// ─── FORGOT PASSWORD ───────────────────────────────────

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const email = sanitizeEmail(parsed.data.email);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    return;
  }

  if (!user.passwordHash) {
    res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    return;
  }

  for (const [token, data] of pendingResetTokens) {
    if (data.userId === user.id) {
      pendingResetTokens.delete(token);
    }
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  pendingResetTokens.set(resetToken, {
    userId: user.id,
    email: user.email,
    createdAt: Date.now(),
  });

  const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
  console.log(`[Password Reset] Token generated for ${email}: ${resetUrl}`);

  res.json({ message: "If an account with that email exists, a password reset link has been sent." });
});

// ─── RESET PASSWORD ────────────────────────────────────

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const { token, password } = parsed.data;

  const tokenData = pendingResetTokens.get(token);
  if (!tokenData) {
    sendLocalizedError(req, res, "errors.auth.resetTokenInvalid");
    return;
  }

  if (Date.now() - tokenData.createdAt > RESET_TOKEN_TTL_MS) {
    pendingResetTokens.delete(token);
    sendLocalizedError(req, res, "errors.auth.resetTokenExpired");
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tokenData.userId));
  if (!user) {
    pendingResetTokens.delete(token);
    sendLocalizedError(req, res, "errors.auth.userNotFound");
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and a number" });
    return;
  }

  const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db
    .update(usersTable)
    .set({
      passwordHash: newHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(usersTable.id, user.id));

  pendingResetTokens.delete(token);

  await revokeAllUserTokens(user.id);

  res.json({ message: "Password has been reset successfully. You can now sign in with your new password." });
});

// ─── GOOGLE OAUTH: Redirect ─────────────────────────────

router.get("/auth/google", (_req, res): void => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }

  const authorizeUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });

  res.json({ url: authorizeUrl });
});

// ─── GOOGLE OAUTH: Callback ─────────────────────────────

router.post("/auth/google/callback", async (req, res): Promise<void> => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "Authorization code is required" });
    return;
  }

  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }

  try {
    const { tokens } = await googleClient.getToken(code as string);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.email) {
      res.status(400).json({ error: "Failed to get user info from Google" });
      return;
    }

    const googleId = googlePayload.sub;
    const email = googlePayload.email;
    const name = googlePayload.name || email.split("@")[0];
    const picture = googlePayload.picture;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId));

    if (!user) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (user) {
        await db
          .update(usersTable)
          .set({
            googleId,
            avatarUrl: picture || user.avatarUrl,
            emailVerified: true,
            authProvider: user.passwordHash ? user.authProvider : "google",
          })
          .where(eq(usersTable.id, user.id));

        [user] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
      }
    }

    if (!user) {
      let username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);

      const [existingUsername] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username));
      if (existingUsername) {
        username = `${username}${Date.now().toString(36).slice(-4)}`;
      }

      [user] = await db
        .insert(usersTable)
        .values({
          email,
          username,
          displayName: name,
          avatarUrl: picture,
          googleId,
          authProvider: "google",
          emailVerified: true,
        })
        .returning();
    }

    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    const accessToken = generateAccessToken(user);
    const { token: refreshToken, family } = generateRefreshToken(user.id);

    await storeRefreshToken(
      user.id,
      refreshToken,
      family,
      req.headers["user-agent"],
      req.ip
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        plan: user.plan,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// ─── GITHUB OAUTH: State store ──────────────────────────

const pendingGitHubStates = new Map<string, { createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingGitHubStates) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingGitHubStates.delete(state);
    }
  }
}, 60 * 1000);

// ─── GITHUB OAUTH: Redirect ────────────────────────────

router.get("/auth/github", (_req, res): void => {
  const config = getGitHubConfig();
  if (!config.isConfigured) {
    res.status(503).json({ error: "GitHub OAuth is not configured" });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
  pendingGitHubStates.set(state, { createdAt: Date.now() });

  const authorizeUrl = buildGitHubAuthorizeUrl(state);
  res.json({ url: authorizeUrl });
});

// ─── GITHUB OAUTH: Callback ────────────────────────────

router.post("/auth/github/callback", async (req, res): Promise<void> => {
  const { code, state } = req.body;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Authorization code is required" });
    return;
  }

  const config = getGitHubConfig();
  if (!config.isConfigured) {
    res.status(503).json({ error: "GitHub OAuth is not configured" });
    return;
  }

  if (!state || typeof state !== "string") {
    res.status(400).json({ error: "State parameter is required" });
    return;
  }

  const pending = pendingGitHubStates.get(state);
  if (!pending) {
    res.status(400).json({ error: "Invalid or expired state parameter" });
    return;
  }
  pendingGitHubStates.delete(state);

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const ghAccessToken = tokenResponse.access_token;

    const [ghUser, ghEmails] = await Promise.all([
      fetchGitHubUser(ghAccessToken),
      fetchGitHubEmails(ghAccessToken),
    ]);

    const githubId = String(ghUser.id);
    const email = ghUser.email || getPrimaryEmail(ghEmails);

    if (!email) {
      res.status(400).json({
        error: "No verified email found on your GitHub account. Please add a verified email to GitHub and try again.",
      });
      return;
    }

    const displayName = ghUser.name || ghUser.login;
    const avatarUrl = ghUser.avatar_url;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.githubId, githubId));

    if (!user) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (user) {
        await db
          .update(usersTable)
          .set({
            githubId,
            avatarUrl: avatarUrl || user.avatarUrl,
            emailVerified: true,
            authProvider: user.passwordHash ? user.authProvider : "github",
          })
          .where(eq(usersTable.id, user.id));

        [user] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
      }
    }

    if (!user) {
      let username = ghUser.login.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
      if (!username || username.length < 3) {
        username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
      }

      const [existingUsername] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username));
      if (existingUsername) {
        username = `${username}${Date.now().toString(36).slice(-4)}`;
      }

      [user] = await db
        .insert(usersTable)
        .values({
          email,
          username,
          displayName,
          avatarUrl,
          githubId,
          authProvider: "github",
          emailVerified: true,
        })
        .returning();
    }

    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    const accessToken = generateAccessToken(user);
    const { token: refreshToken, family } = generateRefreshToken(user.id);

    await storeRefreshToken(
      user.id,
      refreshToken,
      family,
      req.headers["user-agent"],
      req.ip
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        plan: user.plan,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.status(401).json({ error: "GitHub authentication failed" });
  }
});

export default router;
