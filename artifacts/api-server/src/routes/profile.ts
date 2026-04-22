import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody, GetProfileResponse, UpdateProfileResponse } from "@workspace/api-zod";
import { isSupported } from "@workspace/i18n";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { sendLocalizedError } from "../lib/errors";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  res.json(GetProfileResponse.parse(user));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    sendLocalizedError(req, res, "errors.validation");
    return;
  }

  const { userId } = req as AuthenticatedRequest;
  const [updated] = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    sendLocalizedError(req, res, "errors.notFound");
    return;
  }

  res.json(UpdateProfileResponse.parse(updated));
});

router.patch("/profile/locale", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { locale?: unknown };
  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!locale || !isSupported(locale)) {
    sendLocalizedError(req, res, "errors.validation");
    return;
  }

  const { userId, user } = req as AuthenticatedRequest;
  const prevPrefs = (user?.preferences as Record<string, unknown> | null) ?? {};
  const [updated] = await db.update(usersTable)
    .set({ preferences: { ...prevPrefs, locale } })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    sendLocalizedError(req, res, "errors.notFound");
    return;
  }

  res.json({ ok: true, locale });
});

export default router;
