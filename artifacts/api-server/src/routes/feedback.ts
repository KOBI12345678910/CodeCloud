import { Router, type IRouter } from "express";
import { db, auditLogTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { validateBody, FeedbackSchema } from "../validators/schemas";

const router: IRouter = Router();

router.post(
  "/feedback",
  requireAuth,
  validateBody(FeedbackSchema),
  async (req, res): Promise<void> => {
    const { userId } = req as AuthenticatedRequest;
    const { type, description, severity, email, projectId } = req.body;

    const [entry] = await db
      .insert(auditLogTable)
      .values({
        userId,
        action: "feedback_submitted",
        resourceType: "feedback",
        resourceId: projectId || null,
        metadata: { type, description, severity, email, userAgent: req.headers["user-agent"] },
        ipAddress: req.ip || null,
      })
      .returning();

    res.status(201).json({
      id: entry.id,
      message: "Feedback submitted successfully. Thank you!",
    });
  }
);

router.get("/feedback", requireAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;

  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const feedback = await db
    .select()
    .from(auditLogTable)
    .where(eq(auditLogTable.action, "feedback_submitted"))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(100);

  res.json(feedback);
});

export default router;
