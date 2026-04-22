import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  setupTwoFactor,
  getTwoFactorStatus,
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  validateTwoFactorCode,
  regenerateBackupCodes,
} from "../services/two-factor";
import { listUserSessions, revokeSession, revokeAllSessions } from "../services/session-manager";
import { getLoginHistory } from "../services/login-history";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router: IRouter = Router();

router.get("/security/2fa/status", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const status = await getTwoFactorStatus(userId);
  res.json(status);
});

router.post("/security/2fa/setup", requireJwtAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  const status = await getTwoFactorStatus(user.id);
  if (status.enabled) {
    res.status(400).json({ error: "2FA is already enabled. Disable it first to reconfigure." });
    return;
  }

  const result = await setupTwoFactor(user.id, user.email);

  logAudit({
    userId: user.id,
    action: "security.2fa.setup",
    resourceType: "two_factor",
    resourceId: user.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({
    qrCode: result.qrCode,
    secret: result.secret,
    backupCodes: result.backupCodes,
    message: "Scan the QR code with your authenticator app, then verify with a code.",
  });
});

router.post("/security/2fa/verify", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Verification code is required" });
    return;
  }

  const enabled = await verifyAndEnableTwoFactor(userId, token);
  if (!enabled) {
    res.status(400).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  logAudit({
    userId,
    action: "security.2fa.enabled",
    resourceType: "two_factor",
    resourceId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ message: "2FA has been successfully enabled." });
});

router.post("/security/2fa/disable", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { token } = req.body;

  const status = await getTwoFactorStatus(userId);
  if (!status.enabled) {
    res.status(400).json({ error: "2FA is not enabled." });
    return;
  }

  if (!token) {
    res.status(400).json({ error: "Verification code required to disable 2FA." });
    return;
  }

  const verified = await validateTwoFactorCode(userId, token);
  if (!verified) {
    res.status(400).json({ error: "Invalid verification code." });
    return;
  }

  await disableTwoFactor(userId);

  logAudit({
    userId,
    action: "security.2fa.disabled",
    resourceType: "two_factor",
    resourceId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ message: "2FA has been disabled." });
});

router.post("/security/2fa/regenerate-backup", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { token } = req.body;

  const status = await getTwoFactorStatus(userId);
  if (!status.enabled) {
    res.status(400).json({ error: "2FA must be enabled to regenerate backup codes." });
    return;
  }

  if (!token) {
    res.status(400).json({ error: "Valid TOTP code required to regenerate backup codes." });
    return;
  }

  const valid = await validateTwoFactorCode(userId, token);
  if (!valid) {
    res.status(400).json({ error: "Invalid TOTP code." });
    return;
  }

  const newCodes = await regenerateBackupCodes(userId);

  logAudit({
    userId,
    action: "security.2fa.backup_regenerated",
    resourceType: "two_factor",
    resourceId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ backupCodes: newCodes });
});

router.get("/security/sessions", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const sessions = await listUserSessions(userId);
  res.json({ sessions });
});

router.delete("/security/sessions/:id", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const sessions = await listUserSessions(userId);
  const session = sessions.find(s => s.id === id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await revokeSession(id);

  logAudit({
    userId,
    action: "security.session.revoked",
    resourceType: "session",
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ message: "Session revoked." });
});

router.post("/security/sessions/revoke-all", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { currentSessionId } = req.body;

  await revokeAllSessions(userId, currentSessionId);

  logAudit({
    userId,
    action: "security.sessions.revoked_all",
    resourceType: "session",
    resourceId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ message: "All other sessions revoked." });
});

router.get("/security/login-history", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const history = await getLoginHistory(userId, limit);
  res.json({ history });
});

router.get("/security/overview", requireJwtAuth, async (req, res): Promise<void> => {
  const { user, userId } = req as AuthenticatedRequest;

  const [twoFaStatus, sessions, recentLogins] = await Promise.all([
    getTwoFactorStatus(userId),
    listUserSessions(userId),
    getLoginHistory(userId, 5),
  ]);

  const failedRecentLogins = recentLogins.filter((l) => !l.success).length;

  res.json({
    twoFactorEnabled: twoFaStatus.enabled,
    activeSessions: sessions.length,
    recentFailedLogins: failedRecentLogins,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    passwordSet: !!user.passwordHash,
    plan: user.plan,
    role: user.role,
  });
});

export default router;
