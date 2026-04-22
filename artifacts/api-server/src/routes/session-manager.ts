import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  listUserSessions,
  revokeSession,
  revokeAllSessions,
  touchSession,
} from "../services/session-manager";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

router.get("/session-manager/sessions", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const sessions = await listUserSessions(userId);
  res.json(sessions);
});

router.post("/session-manager/:id/revoke", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const sessions = await listUserSessions(userId);
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const revoked = await revokeSession(req.params.id as string);
  if (revoked) {
    logAudit({
      userId,
      action: "user.logout",
      resourceType: "user",
      resourceId: userId,
      metadata: { action: "session_revoked", sessionId: req.params.id },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

router.post("/session-manager/revoke-all", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const exceptId = req.query.except as string | undefined;
  const revoked = await revokeAllSessions(userId, exceptId);
  logAudit({
    userId,
    action: "user.logout",
    resourceType: "user",
    resourceId: userId,
    metadata: { action: "all_sessions_revoked", count: revoked },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });
  res.json({ revoked });
});

router.post("/session-manager/:id/touch", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const sessions = await listUserSessions(userId);
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const touched = await touchSession(req.params.id as string);
  touched ? res.json({ success: true }) : res.status(404).json({ error: "Session not found" });
});

export default router;
