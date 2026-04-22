import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { generateTestsFromRoutes, runTestSuite, generateSnapshotTests } from "../services/api-tester";

const router: IRouter = Router();

router.post("/projects/:id/api-tests/generate", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const { routes } = req.body;
  if (!routes || !Array.isArray(routes)) { res.status(400).json({ error: "routes array is required" }); return; }
  try { res.json(generateTestsFromRoutes(routes)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/api-tests/run", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { tests } = req.body;
  if (!tests || !Array.isArray(tests)) { res.status(400).json({ error: "tests array is required" }); return; }
  try { res.json(runTestSuite(projectId, tests)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/api-tests/snapshot", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const { responses } = req.body;
  if (!responses || !Array.isArray(responses)) { res.status(400).json({ error: "responses array is required" }); return; }
  try { res.json({ code: generateSnapshotTests(responses) }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
