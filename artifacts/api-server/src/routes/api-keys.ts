import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  createApiKey,
  listApiKeysByUser,
  getApiKey,
  revokeApiKey,
  deleteApiKey,
} from "../services/api-keys";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

router.get("/api-keys", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const keys = await listApiKeysByUser(userId);
  res.json(keys);
});

router.post("/api-keys", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { name, scopes, scopeDetails, expiresAt } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const result = await createApiKey({
    userId,
    name,
    scopes,
    scopeDetails,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  logAudit({
    userId,
    action: "settings.api_key_create",
    resourceType: "api_key",
    resourceId: result.key.id,
    metadata: { name, scopes },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.status(201).json({
    key: result.key,
    rawKey: result.rawKey,
  });
});

router.get("/api-keys/:id", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const key = await getApiKey(req.params.id as string);
  if (!key) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { userId } = req as AuthenticatedRequest;
  if (key.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  res.json(key);
});

router.post("/api-keys/:id/revoke", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const key = await getApiKey(req.params.id as string);
  if (!key || key.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const revoked = await revokeApiKey(req.params.id as string);
  if (revoked) {
    logAudit({
      userId,
      action: "settings.api_key_delete",
      resourceType: "api_key",
      resourceId: req.params.id as string,
      metadata: { name: key.name },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

router.delete("/api-keys/:id", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const key = await getApiKey(req.params.id as string);
  if (!key || key.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const deleted = await deleteApiKey(req.params.id as string);
  if (deleted) {
    logAudit({
      userId,
      action: "settings.api_key_delete",
      resourceType: "api_key",
      resourceId: req.params.id as string,
      metadata: { name: key.name },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

export default router;
