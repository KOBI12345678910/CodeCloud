import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  listUserRepos,
  getRepoContents,
  getFileRawContent,
  detectLanguage,
  detectRunCommand,
} from "../services/github";

const router = Router();

router.get("/github/repos", requireAuth, async (req, res): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: "GitHub token is required" });
    return;
  }
  try {
    const page = parseInt(req.query.page as string) || 1;
    const repos = await listUserRepos(token, page);
    res.json(
      repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        isPrivate: r.private,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
        detectedLanguage: detectLanguage(r.language),
      }))
    );
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to list repos" });
  }
});

router.post("/github/import", requireAuth, async (req, res): Promise<void> => {
  const { token, owner, repo, branch } = req.body;
  if (!token || !owner || !repo) {
    res.status(400).json({ error: "token, owner, and repo are required" });
    return;
  }
  try {
    const branchName = branch || "main";
    const rootContents = await getRepoContents(token, owner, repo, "", branchName);
    const fileNames = rootContents.map((f) => f.name);

    const files: Array<{ path: string; content: string }> = [];
    const MAX_FILES = 100;
    const MAX_FILE_SIZE = 512 * 1024;

    async function collectFiles(entries: typeof rootContents, prefix: string) {
      for (const entry of entries) {
        if (files.length >= MAX_FILES) break;
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.name.startsWith(".") && entry.name !== ".gitignore" && entry.name !== ".env.example") continue;
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "__pycache__") continue;

        if (entry.type === "file") {
          if (entry.size > MAX_FILE_SIZE) continue;
          try {
            const content = await getFileRawContent(token, owner, repo, fullPath, branchName);
            files.push({ path: fullPath, content });
          } catch {
          }
        } else if (entry.type === "dir") {
          try {
            const subEntries = await getRepoContents(token, owner, repo, fullPath, branchName);
            await collectFiles(subEntries, fullPath);
          } catch {
          }
        }
      }
    }

    await collectFiles(rootContents, "");

    const allPaths = files.map((f) => f.path);
    const repoInfo = {
      name: repo,
      owner,
      branch: branchName,
      fileCount: files.length,
      files,
      detectedLanguage: detectLanguage(
        rootContents.find((f) => f.name === "package.json") ? "JavaScript" : null
      ),
      runCommand: detectRunCommand(
        detectLanguage(null),
        allPaths
      ),
    };

    res.json(repoInfo);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to import repo" });
  }
});

export default router;
