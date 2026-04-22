import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { optionalAuth, requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { bountyService } from "../services/bounties";

const router: IRouter = Router();

const ListQuery = z.object({
  category: z.string().max(50).optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  q: z.string().max(200).optional(),
});

const CreateBody = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(2).max(50),
  budgetUsd: z.number().min(10).max(1_000_000),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  tags: z.array(z.string()).optional(),
});

const ApplyBody = z.object({ message: z.string().min(5).max(2000) });
const StatusBody = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
});
const ReviewBody = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().min(3).max(2000) });

router.get("/bounties", optionalAuth, (req: Request, res: Response): void => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filters" });
    return;
  }
  const list = bountyService.list(parsed.data);
  res.json({ bounties: list, total: list.length });
});

router.get("/bounties/:id", optionalAuth, (req: Request, res: Response): void => {
  const b = bountyService.get(req.params.id as string);
  if (!b) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...b, averageRating: bountyService.averageRating(b.id) });
});

router.post("/bounties", requireAuth, (req: Request, res: Response): void => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid bounty", details: parsed.error.message }); return; }
  const auth = req as AuthenticatedRequest;
  const bounty = bountyService.create({
    ...parsed.data,
    posterId: auth.userId || "anon",
    posterName: auth.user?.username || "anon",
  });
  res.status(201).json(bounty);
});

router.post("/bounties/:id/apply", requireAuth, (req: Request, res: Response): void => {
  const parsed = ApplyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid application" }); return; }
  const auth = req as AuthenticatedRequest;
  const app = bountyService.apply(req.params.id as string, {
    applicantId: auth.userId || "anon",
    applicantName: auth.user?.username || "anon",
    message: parsed.data.message,
  });
  if (!app) { res.status(400).json({ error: "Bounty not open" }); return; }
  res.status(201).json(app);
});

router.patch("/bounties/:id/status", requireAuth, (req: Request, res: Response): void => {
  const parsed = StatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }
  const auth = req as AuthenticatedRequest;
  const existing = bountyService.get(req.params.id as string);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.posterId !== auth.userId) {
    res.status(403).json({ error: "Only the bounty poster can change status" });
    return;
  }
  const b = bountyService.setStatus(req.params.id as string, parsed.data.status, parsed.data.assigneeId, parsed.data.assigneeName);
  if (!b) { res.status(400).json({ error: "Invalid assignee — must be an applicant" }); return; }
  res.json(b);
});

router.post("/bounties/:id/reviews", requireAuth, (req: Request, res: Response): void => {
  const parsed = ReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid review" }); return; }
  const auth = req as AuthenticatedRequest;
  const userId = auth.userId || "";
  if (!bountyService.canReview(req.params.id as string, userId)) {
    res.status(403).json({ error: "Only the bounty poster or assignee can review, after completion" });
    return;
  }
  const review = bountyService.review(req.params.id as string, {
    reviewerId: userId,
    reviewerName: auth.user?.username || "anon",
    ...parsed.data,
  });
  if (!review) { res.status(400).json({ error: "Already reviewed or not completed" }); return; }
  res.status(201).json(review);
});

export default router;
