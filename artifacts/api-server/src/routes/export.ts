import { Router, type IRouter } from "express";
import archiver from "archiver";
import { db, filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get(
  "/projects/:id/export",
  requireAuth,
  requireProjectAccess("viewer"),
  async (req, res): Promise<void> => {
    const { project } = req as AuthenticatedRequest;
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const files = await db
      .select({
        path: filesTable.path,
        content: filesTable.content,
        isDirectory: filesTable.isDirectory,
      })
      .from(filesTable)
      .where(eq(filesTable.projectId, project.id));

    if (files.length === 0) {
      res.status(404).json({ error: "No files to export" });
      return;
    }

    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create archive" });
      }
    });

    archive.pipe(res);

    for (const file of files) {
      if (file.isDirectory) continue;
      const filePath = file.path.startsWith("/")
        ? file.path.slice(1)
        : file.path;
      archive.append(file.content || "", { name: filePath });
    }

    await archive.finalize();
  }
);

export default router;
