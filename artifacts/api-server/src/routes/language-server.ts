import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { goToDefinition, findReferences, getHoverInfo, renameSymbol } from "../services/language-server";

const router: IRouter = Router();

router.post("/projects/:id/lsp/definition", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { file, line, column } = req.body;
  try { res.json(goToDefinition(projectId, file, line, column)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/lsp/references", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(findReferences(projectId, req.body.symbol)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/lsp/hover", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { file, line, column } = req.body;
  try { res.json(getHoverInfo(projectId, file, line, column)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/lsp/rename", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(renameSymbol(projectId, req.body.symbol, req.body.newName)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
