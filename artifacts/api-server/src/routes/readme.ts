import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { analyzeProject, generateReadme } from "../services/readme-generator";

const router: IRouter = Router();

router.post("/projects/:id/readme/generate", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { includeApi, includeBadges, includeContributing, includeLicense, customSections } = req.body;
  try {
    const analysis = await analyzeProject(projectId);
    const readme = generateReadme(analysis, {
      includeApi: includeApi !== false,
      includeBadges: includeBadges !== false,
      includeContributing: includeContributing !== false,
      includeLicense: includeLicense !== false,
      customSections,
    });
    res.json({ readme, analysis: { name: analysis.name, language: analysis.language, framework: analysis.framework, totalFiles: analysis.sourceFiles.length, hasTests: analysis.hasTests, hasDocker: analysis.hasDocker, hasCI: analysis.hasCI } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/readme/analyze", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const analysis = await analyzeProject(projectId);
    res.json(analysis);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
