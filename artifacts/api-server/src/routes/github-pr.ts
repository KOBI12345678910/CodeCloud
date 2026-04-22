import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import {
  createPullRequest,
  listPullRequests,
  getPullRequest,
  mergePullRequest,
  closePullRequest,
  getPRComments,
  getPRReviews,
  getPRFiles,
  getCIStatus,
  listBranches,
  addPRComment,
  requestReview,
} from "../services/github-pr";

const router: IRouter = Router();

function extractGHParams(req: any): { token: string; owner: string; repo: string } | null {
  const token = req.headers["x-github-token"] as string;
  const owner = (req.query.owner || req.body?.owner) as string;
  const repo = (req.query.repo || req.body?.repo) as string;
  if (!token || !owner || !repo) return null;
  return { token, owner, repo };
}

router.get("/projects/:id/github/branches", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  if (!gh) { res.status(400).json({ error: "X-GitHub-Token header, owner, and repo are required" }); return; }
  try {
    const branches = await listBranches(gh.token, gh.owner, gh.repo);
    res.json(branches);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/pulls", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const state = (req.query.state as string) || "open";
  if (!gh) { res.status(400).json({ error: "X-GitHub-Token header, owner, and repo are required" }); return; }
  try {
    const prs = await listPullRequests(gh.token, gh.owner, gh.repo, state);
    res.json(prs);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/pulls/:prNumber", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const pr = await getPullRequest(gh.token, gh.owner, gh.repo, prNumber);
    res.json(pr);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.post("/projects/:id/github/pulls", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const { title, body, head, base, draft } = req.body;
  if (!gh || !title || !head || !base) {
    res.status(400).json({ error: "X-GitHub-Token header, owner, repo, title, head, and base are required" }); return;
  }
  try {
    const pr = await createPullRequest(gh.token, { owner: gh.owner, repo: gh.repo, title, body, head, base, draft });
    res.status(201).json(pr);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.put("/projects/:id/github/pulls/:prNumber/merge", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const mergeMethod = req.body.mergeMethod || "merge";
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const result = await mergePullRequest(gh.token, gh.owner, gh.repo, prNumber, mergeMethod);
    res.json(result);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.patch("/projects/:id/github/pulls/:prNumber/close", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const result = await closePullRequest(gh.token, gh.owner, gh.repo, prNumber);
    res.json(result);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/pulls/:prNumber/comments", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const comments = await getPRComments(gh.token, gh.owner, gh.repo, prNumber);
    res.json(comments);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/pulls/:prNumber/reviews", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const reviews = await getPRReviews(gh.token, gh.owner, gh.repo, prNumber);
    res.json(reviews);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/pulls/:prNumber/files", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and valid prNumber are required" }); return; }
  try {
    const files = await getPRFiles(gh.token, gh.owner, gh.repo, prNumber);
    res.json(files);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.get("/projects/:id/github/ci-status", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const ref = req.query.ref as string;
  if (!gh || !ref) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, and ref are required" }); return; }
  try {
    const status = await getCIStatus(gh.token, gh.owner, gh.repo, ref);
    res.json(status);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.post("/projects/:id/github/pulls/:prNumber/comments", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const { body } = req.body;
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || !body || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, body, and valid prNumber are required" }); return; }
  try {
    const comment = await addPRComment(gh.token, gh.owner, gh.repo, prNumber, body);
    res.status(201).json(comment);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

router.post("/projects/:id/github/pulls/:prNumber/reviewers", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const gh = extractGHParams(req);
  const { reviewers } = req.body;
  const prNumber = parseInt(Array.isArray(req.params.prNumber) ? req.params.prNumber[0] : req.params.prNumber);
  if (!gh || !Array.isArray(reviewers) || isNaN(prNumber)) { res.status(400).json({ error: "X-GitHub-Token header, owner, repo, reviewers[], and valid prNumber are required" }); return; }
  try {
    const result = await requestReview(gh.token, gh.owner, gh.repo, prNumber, reviewers);
    res.json(result);
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

export default router;
