import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, filesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/embed/:projectId", async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const filePath = req.query.file as string;
  const mode = (req.query.mode as string) || "readonly";
  const theme = (req.query.theme as string) || "dark";
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));
    const targetFile = filePath ? files.find(f => f.path === filePath) : files.find(f => !f.isDirectory);
    res.json({
      project: { id: project.id, name: project.name },
      file: targetFile ? { name: targetFile.name, path: targetFile.path, content: targetFile.content } : null,
      config: { mode, theme, showRunButton: mode === "interactive" },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
