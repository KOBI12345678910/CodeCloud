import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  initRepo, getStatus, stageFile, unstageFile, stageAll,
  commit, getLog, getBranches, createBranch, checkoutBranch, getDiff,
} from "../services/git";

const router = Router();

function pid(req: { params: Record<string, any> }): string {
  return String(req.params.projectId);
}

router.post("/projects/:projectId/git/init", requireAuth, async (req, res): Promise<void> => {
  const status = initRepo(pid(req));
  res.json(status);
});

router.get("/projects/:projectId/git/status", requireAuth, async (req, res): Promise<void> => {
  const status = getStatus(pid(req));
  res.json(status);
});

router.post("/projects/:projectId/git/stage", requireAuth, async (req, res): Promise<void> => {
  const { file, all, files } = req.body;
  if (all && Array.isArray(files)) {
    stageAll(pid(req), files);
  } else if (file) {
    stageFile(pid(req), file);
  }
  res.json({ ok: true });
});

router.post("/projects/:projectId/git/unstage", requireAuth, async (req, res): Promise<void> => {
  const { file } = req.body;
  if (file) unstageFile(pid(req), file);
  res.json({ ok: true });
});

router.post("/projects/:projectId/git/commit", requireAuth, async (req, res): Promise<void> => {
  const { message } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "Commit message is required" });
    return;
  }
  const result = commit(pid(req), message, (req as any).user?.username || "user");
  res.json(result);
});

router.get("/projects/:projectId/git/log", requireAuth, async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const commits = getLog(pid(req), limit);
  res.json(commits);
});

router.get("/projects/:projectId/git/branches", requireAuth, async (req, res): Promise<void> => {
  const branches = getBranches(pid(req));
  res.json(branches);
});

router.post("/projects/:projectId/git/branches", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Branch name is required" });
    return;
  }
  try {
    const branch = createBranch(pid(req), name.trim());
    res.json(branch);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

router.post("/projects/:projectId/git/checkout", requireAuth, async (req, res): Promise<void> => {
  const { branch } = req.body;
  if (!branch?.trim()) {
    res.status(400).json({ error: "Branch name is required" });
    return;
  }
  try {
    checkoutBranch(pid(req), branch.trim());
    res.json({ ok: true, branch: branch.trim() });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/projects/:projectId/git/diff", requireAuth, async (req, res): Promise<void> => {
  const file = req.query.file as string;
  if (!file) {
    res.status(400).json({ error: "file query parameter is required" });
    return;
  }
  const diff = getDiff(pid(req), file);
  res.json(diff);
});

export default router;
