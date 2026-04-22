import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  generateTOTPSecret,
  generateBackupCodes,
  generateQRCodeDataURL,
  getUserTwoFactor,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTOTPToken,
  consumeBackupCode,
} from "../services/totp";
import { getUserSessions, revokeSession, revokeAllUserSessions } from "../services/sessions";
import { getLoginHistory } from "../services/loginHistory";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router: IRouter = Router();

router.get("/security/2fa/status", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const record = await getUserTwoFactor(userId);
  res.json({
    enabled: record?.enabled ?? false,
    verifiedAt: record?.verifiedAt ?? null,
    hasBackupCodes: record?.backupCodes ? JSON.parse(record.backupCodes).length > 0 : false,
  });
});

router.post("/security/2fa/setup", requireJwtAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  const existing = await getUserTwoFactor(user.id);
  if (existing?.enabled) {
    res.status(400).json({ error: "2FA is already enabled. Disable it first to reconfigure." });
    return;
  }

  const { secret, uri } = generateTOTPSecret(user.email);
  const backupCodes = generateBackupCodes(10);
  const qrCode = await generateQRCodeDataURL(uri);

  await setupTwoFactor(user.id, secret, backupCodes);

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
    qrCode,
    secret,
    backupCodes,
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

  const record = await getUserTwoFactor(userId);
  if (!record) {
    res.status(400).json({ error: "2FA has not been set up. Call setup first." });
    return;
  }

  if (record.enabled) {
    res.status(400).json({ error: "2FA is already enabled." });
    return;
  }

  const valid = verifyTOTPToken(record.secret, token);
  if (!valid) {
    res.status(400).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  await enableTwoFactor(userId);

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
  const { token, backupCode } = req.body;

  const record = await getUserTwoFactor(userId);
  if (!record || !record.enabled) {
    res.status(400).json({ error: "2FA is not enabled." });
    return;
  }

  let verified = false;
  if (token) {
    verified = verifyTOTPToken(record.secret, token);
  } else if (backupCode) {
    verified = await consumeBackupCode(userId, backupCode);
  }

  if (!verified) {
    res.status(400).json({ error: "Invalid verification code or backup code." });
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

  const record = await getUserTwoFactor(userId);
  if (!record || !record.enabled) {
    res.status(400).json({ error: "2FA must be enabled to regenerate backup codes." });
    return;
  }

  if (!token || !verifyTOTPToken(record.secret, token)) {
    res.status(400).json({ error: "Valid TOTP code required to regenerate backup codes." });
    return;
  }

  const newCodes = generateBackupCodes(10);
  await setupTwoFactor(userId, record.secret, newCodes);
  await enableTwoFactor(userId);

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
  const sessions = await getUserSessions(userId);

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      city: s.city,
      country: s.country,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.isCurrent,
    })),
  });
});

router.delete("/security/sessions/:id", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  await revokeSession(id, userId);

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
  const { exceptCurrent } = req.body;

  await revokeAllUserSessions(userId, exceptCurrent ? req.body.currentSessionId : undefined);

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

  const [twoFa, sessions, recentLogins] = await Promise.all([
    getUserTwoFactor(userId),
    getUserSessions(userId),
    getLoginHistory(userId, 5),
  ]);

  const failedRecentLogins = recentLogins.filter((l) => !l.success).length;

  res.json({
    twoFactorEnabled: twoFa?.enabled ?? false,
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
