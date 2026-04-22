import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import { getLoginHistory } from "../services/login-history";
import { listUserSessions } from "../services/session-manager";
import { getTwoFactorStatus } from "../services/two-factor";
import { listApiKeysByUser } from "../services/api-keys";

const router = Router();

router.get("/security/overview", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;

  const [twoFactorStatus, sessions, loginHistory, apiKeys] = await Promise.all([
    getTwoFactorStatus(userId),
    listUserSessions(userId),
    getLoginHistory(userId, 10),
    listApiKeysByUser(userId),
  ]);

  const activeApiKeys = apiKeys.filter(k => k.isActive);
  const recentFailedLogins = loginHistory.filter(l => !l.success);

  res.json({
    twoFactor: twoFactorStatus,
    sessions: {
      active: sessions.length,
      list: sessions.slice(0, 10),
    },
    loginHistory: loginHistory.slice(0, 20),
    apiKeys: {
      total: apiKeys.length,
      active: activeApiKeys.length,
      list: apiKeys,
    },
    securityScore: calculateSecurityScore({
      has2fa: twoFactorStatus.enabled,
      hasStrongPassword: !!user.passwordHash,
      activeSessionCount: sessions.length,
      recentFailedLogins: recentFailedLogins.length,
      apiKeyCount: activeApiKeys.length,
    }),
  });
});

router.get("/security/login-history", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Number(req.query.limit) || 50;
  const history = await getLoginHistory(userId, limit);
  res.json(history);
});

function calculateSecurityScore(params: {
  has2fa: boolean;
  hasStrongPassword: boolean;
  activeSessionCount: number;
  recentFailedLogins: number;
  apiKeyCount: number;
}): { score: number; maxScore: number; recommendations: string[] } {
  let score = 0;
  const maxScore = 100;
  const recommendations: string[] = [];

  if (params.has2fa) {
    score += 40;
  } else {
    recommendations.push("Enable two-factor authentication for enhanced security");
  }

  if (params.hasStrongPassword) {
    score += 20;
  } else {
    recommendations.push("Set a strong password for your account");
  }

  if (params.activeSessionCount <= 5) {
    score += 15;
  } else {
    recommendations.push("Review and revoke unused sessions");
  }

  if (params.recentFailedLogins === 0) {
    score += 15;
  } else {
    recommendations.push("Recent failed login attempts detected - review login history");
  }

  if (params.apiKeyCount <= 3) {
    score += 10;
  } else {
    recommendations.push("Review API keys and revoke any that are no longer needed");
  }

  return { score, maxScore, recommendations };
}

export default router;
