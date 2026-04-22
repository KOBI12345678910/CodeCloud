import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { deploymentsTable, projectsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/projects/:id/feed.xml", async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { res.status(404).send("Project not found"); return; }
    const deployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.projectId, projectId)).orderBy(desc(deploymentsTable.createdAt)).limit(20);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>`;
    xml += `<title>${project.name} - Changelog</title>`;
    xml += `<description>Deployment feed for ${project.name}</description>`;
    xml += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;
    for (const d of deployments) {
      xml += `<item><title>Deployment ${d.status} - v${d.version || "latest"}</title>`;
      xml += `<description>Status: ${d.status}</description>`;
      xml += `<pubDate>${new Date(d.createdAt).toUTCString()}</pubDate>`;
      xml += `<guid>${d.id}</guid></item>`;
    }
    xml += `</channel></rss>`;
    res.type("application/rss+xml").send(xml);
  } catch (err: any) { res.status(500).send(err.message); }
});

export default router;
