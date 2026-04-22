import { Router, type IRouter } from "express";
import { db, projectsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, desc, count } from "drizzle-orm";
import {
  ExploreProjectsQueryParams,
  ExploreProjectsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/explore", async (req, res): Promise<void> => {
  const params = ExploreProjectsQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;
  const language = params.success ? params.data.language : undefined;
  const limit = params.success ? params.data.limit : 20;
  const offset = params.success ? params.data.offset : 0;

  const conditions = [eq(projectsTable.isPublic, true)];
  if (search) conditions.push(ilike(projectsTable.name, `%${search}%`));
  if (language) conditions.push(eq(projectsTable.language, language));

  const projects = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    runCommand: projectsTable.runCommand,
    entryFile: projectsTable.entryFile,
    containerStatus: projectsTable.containerStatus,
    gpuEnabled: projectsTable.gpuEnabled,
    deployedUrl: projectsTable.deployedUrl,
    lastAccessedAt: projectsTable.lastAccessedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
    ownerName: usersTable.displayName,
  })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(projectsTable.createdAt))
    .limit(limit ?? 20)
    .offset(offset ?? 0);

  const [totalResult] = await db.select({ count: count() })
    .from(projectsTable)
    .where(and(...conditions));

  res.json(ExploreProjectsResponse.parse({
    projects,
    total: totalResult?.count ?? 0,
  }));
});

export default router;
