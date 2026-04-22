import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { optionalAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { fullSearch, getAutocomplete } from "../services/search";

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

export default router;
