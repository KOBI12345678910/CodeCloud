import { Router, Request, Response } from "express";
import { aiCommitReviewService } from "../services/ai-commit-review";

const router = Router();

router.post("/commit-review", (req: Request, res: Response): void => {
  const { commitHash, author, message, diff } = req.body;
  if (!commitHash || !diff) { res.status(400).json({ error: "commitHash and diff required" }); return; }
  res.json(aiCommitReviewService.review(commitHash, author || "unknown", message || "", diff));
});

router.get("/commit-review/:hash", (req: Request, res: Response): void => {
  const review = aiCommitReviewService.getReview(req.params.hash as string);
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(review);
});

router.get("/commit-reviews", (req: Request, res: Response): void => {
  const limit = parseInt((req.query.limit as string) || "20", 10);
  res.json({ reviews: aiCommitReviewService.getReviews(limit) });
});

export default router;
