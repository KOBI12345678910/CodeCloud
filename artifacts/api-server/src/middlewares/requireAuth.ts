import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, projectsTable, collaboratorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { LANG_BY_CODE, FALLBACK_LOCALE, isSupported, interpolate } from "@workspace/i18n";
import { loadServerBundle } from "../services/i18n";
import type { Response as ExResponse } from "express";
import type { AuthenticatedRequest } from "../types";

function applyUserLocale(req: Request, res: ExResponse, user: { preferences?: unknown } | null | undefined): void {
  const prefs = (user?.preferences ?? {}) as { locale?: string };
  const userLocale = prefs.locale;
  if (userLocale && isSupported(userLocale)) {
    // User-record locale wins over Accept-Language/cookie/path defaults.
    // Explicit path prefix or ?lang= still wins because they were chosen
    // with highest priority in i18nMiddleware; we only promote user.locale
    // above the header/cookie default.
    // Path-prefix locale only counts as explicit if the segment is an
    // actually-supported locale (not e.g. `/api/...`).
    const segMatch = (req.originalUrl || "/").match(
      /^\/([a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?)(?:\/|$)/,
    );
    const pathLocaleExplicit = !!(segMatch && isSupported(segMatch[1]));
    const explicit =
      typeof req.query.lang === "string" || pathLocaleExplicit;
    if (!explicit && req.locale !== userLocale) {
      req.locale = userLocale;
      req.dir = LANG_BY_CODE[userLocale]?.dir ?? "ltr";
      res.setHeader("Content-Language", userLocale);
      // Re-bind t() so subsequent handlers use the user's locale.
      req.t = (key: string, params?: Record<string, unknown> & { defaultValue?: string }) => {
        for (const code of [userLocale, FALLBACK_LOCALE]) {
          const bundle = loadServerBundle(code);
          const v = bundle?.[key];
          if (typeof v === "string") return interpolate(v, params, userLocale);
        }
        return interpolate(params?.defaultValue ?? key, params, userLocale);
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));

  if (!user) {
    const sessionClaims = (auth as Record<string, unknown>).sessionClaims as Record<string, string> | undefined;
    const email = sessionClaims?.email || `${clerkUserId}@user.local`;
    const username = clerkUserId.replace(/^user_/, "").slice(0, 20);
    [user] = await db.insert(usersTable).values({
      clerkId: clerkUserId,
      email,
      username,
    }).onConflictDoNothing().returning();

    if (!user) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));
    }
  }

  if (!user) {
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  authReq.userId = user.id;
  authReq.user = user;
  applyUserLocale(req, res, user);
  next();
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    next();
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId));
  if (user) {
    const authReq = req as AuthenticatedRequest;
    authReq.userId = user.id;
    authReq.user = user;
    applyUserLocale(req, res, user);
  }
  next();
};

export const requireProjectAccess = (requiredRole?: "viewer" | "editor" | "admin") => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawId = req.params.id || req.params.projectId;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!projectId) {
      res.status(400).json({ error: "Missing project ID" });
      return;
    }

    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (project.ownerId === userId) {
      authReq.project = project;
      authReq.projectRole = "admin";
      next();
      return;
    }

    const [collab] = await db.select().from(collaboratorsTable)
      .where(and(
        eq(collaboratorsTable.projectId, projectId),
        eq(collaboratorsTable.userId, userId),
      ));

    if (collab) {
      if (requiredRole === "admin" && collab.role !== "admin") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      if (requiredRole === "editor" && collab.role === "viewer") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      authReq.project = project;
      authReq.projectRole = collab.role as "viewer" | "editor" | "admin";
      next();
      return;
    }

    if (project.isPublic && (!requiredRole || requiredRole === "viewer")) {
      authReq.project = project;
      authReq.projectRole = "viewer";
      next();
      return;
    }

    res.status(403).json({ error: "Access denied" });
  };
};
