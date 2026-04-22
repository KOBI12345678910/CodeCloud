import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { optionalAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { fullSearch, getAutocomplete } from "../services/search";
import {
  discoverySearch,
  getRecentSearches,
  getTrendingSearches,
  trackSearch,
  getTopUsers,
  getTagCloud,
  getTrendingProjects,
} from "../services/search-discovery";

const router = Router();

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  scope: z.enum(["all", "own", "public"]).optional().default("all"),
  language: z.string().max(50).optional(),
  type: z.enum(["projects", "files", "all"]).optional().default("all"),
  sort: z.enum(["relevance", "recent", "name"]).optional().default("relevance"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const AutocompleteQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});

router.get("/search", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search parameters", details: parsed.error.message });
    return;
  }

  const { q, scope, language, type, sort, limit, offset } = parsed.data;
  const userId = (req as AuthenticatedRequest).userId;

  const effectiveScope = scope === "own" && !userId ? "public" : scope;

  const results = await fullSearch({
    query: q,
    userId,
    scope: effectiveScope,
    language,
    type,
    sort,
    limit,
    offset,
  });

  res.json(results);
});

router.get("/search/autocomplete", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = AutocompleteQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid autocomplete parameters" });
    return;
  }

  const { q, limit } = parsed.data;
  const userId = (req as AuthenticatedRequest).userId;

  const suggestions = await getAutocomplete({ query: q, userId, limit });
  res.json({ suggestions });
});

const GlobalQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
});

router.get("/search/global", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = GlobalQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid global search params" });
    return;
  }
  const userId = (req as AuthenticatedRequest).userId;
  const result = await discoverySearch({ query: parsed.data.q, userId, limit: parsed.data.limit });
  res.json(result);
});

router.get("/search/recent", optionalAuth, (req: Request, res: Response): void => {
  const userId = (req as AuthenticatedRequest).userId;
  res.json({ recent: getRecentSearches(userId) });
});

router.get("/search/trending", (_req: Request, res: Response): void => {
  res.json({ trending: getTrendingSearches() });
});

router.post("/search/track", optionalAuth, (req: Request, res: Response): void => {
  const q = typeof req.body?.q === "string" ? req.body.q : "";
  if (!q || q.length > 200) { res.status(400).json({ error: "Invalid query" }); return; }
  const userId = (req as AuthenticatedRequest).userId;
  trackSearch(q, userId);
  res.json({ ok: true });
});

router.get("/explore/trending", async (req: Request, res: Response): Promise<void> => {
  const window = (req.query.window as "day" | "week" | "month") || "week";
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const projects = await getTrendingProjects(window, limit);
  res.json({ projects, window });
});

router.get("/explore/top-users", async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 8, 30);
  const users = await getTopUsers(limit);
  res.json({ users });
});

router.get("/explore/tags", async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 24, 60);
  const tags = await getTagCloud(limit);
  res.json({ tags });
});

export default router;
