import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  validateTwoFactorCode,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
} from "../services/two-factor";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

router.post("/two-factor/setup", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const result = await setupTwoFactor(userId);
    res.json({
      qrCodeUrl: result.qrCodeUrl,
      secret: result.secret,
      backupCodes: result.backupCodes,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to set up 2FA" });
  }
});

router.post("/two-factor/verify", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Verification code required" });
    return;
  }

  const verified = await verifyAndEnableTwoFactor(userId, code);
  if (verified) {
    logAudit({
      userId,
      action: "settings.update",
      resourceType: "user",
      resourceId: userId,
      metadata: { action: "2fa_enabled" },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid verification code" });
  }
});

router.post("/two-factor/validate", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { code } = req.body;
  const valid = await validateTwoFactorCode(userId, code || "");
  res.json({ valid });
});

router.post("/two-factor/disable", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { code } = req.body;

  const valid = await validateTwoFactorCode(userId, code || "");
  if (!valid) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  const disabled = await disableTwoFactor(userId);
  if (disabled) {
    logAudit({
      userId,
      action: "settings.update",
      resourceType: "user",
      resourceId: userId,
      metadata: { action: "2fa_disabled" },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "2FA not configured" });
  }
});

router.get("/two-factor/status", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const status = await getTwoFactorStatus(userId);
  res.json(status);
});

router.post("/two-factor/backup-codes", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { code } = req.body;

  const valid = await validateTwoFactorCode(userId, code || "");
  if (!valid) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  const codes = await regenerateBackupCodes(userId);
  if (codes) {
    res.json({ codes });
  } else {
    res.status(404).json({ error: "2FA not enabled" });
  }
});

export default router;
