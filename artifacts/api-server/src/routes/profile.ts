import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody, GetProfileResponse, UpdateProfileResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  res.json(GetProfileResponse.parse(user));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = req as AuthenticatedRequest;
  const [updated] = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateProfileResponse.parse(updated));
});

export default router;
