import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getEncryptionStatus, encryptFile, decryptFile, rotateKey } from "../services/file-encryption";

const router: IRouter = Router();

router.get("/projects/:id/encryption", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getEncryptionStatus(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/encryption/encrypt", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { filePath } = req.body;
  if (!filePath) { res.status(400).json({ error: "filePath required" }); return; }
  try { res.json(encryptFile(projectId, filePath)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/encryption/decrypt", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { filePath } = req.body;
  if (!filePath) { res.status(400).json({ error: "filePath required" }); return; }
  try { res.json(decryptFile(projectId, filePath)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/encryption/rotate-key", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { keyId } = req.body;
  try { res.json(rotateKey(projectId, keyId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
