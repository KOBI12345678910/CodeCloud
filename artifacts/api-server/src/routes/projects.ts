import { Router, type IRouter } from "express";
import { db, projectsTable, filesTable, usersTable, templatesTable } from "@workspace/db";
import { eq, and, ilike, desc, asc, sql, count } from "drizzle-orm";
import {
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  ForkProjectParams,
  CloneProjectParams,
  CloneProjectBody,
  ListProjectsQueryParams,
  ListProjectsResponse,
} from "@workspace/api-zod";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const params = ListProjectsQueryParams.safeParse(req.query);
  const { userId } = req as AuthenticatedRequest;

  const search = params.success ? params.data.search : undefined;
  const language = params.success ? params.data.language : undefined;
  const sort = params.success ? params.data.sort : "recent";
  const limit = params.success ? params.data.limit : 20;
  const offset = params.success ? params.data.offset : 0;

  const includeArchived = req.query["archived"] === "true";
  const conditions = [eq(projectsTable.ownerId, userId)];
  if (!includeArchived) conditions.push(eq(projectsTable.isArchived, false));
  if (search) conditions.push(ilike(projectsTable.name, `%${search}%`));
  if (language) conditions.push(eq(projectsTable.language, language));

  const orderBy = sort === "name" ? asc(projectsTable.name)
    : sort === "updated" ? desc(projectsTable.updatedAt)
    : desc(projectsTable.createdAt);

  const projects = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    clonedFromId: projectsTable.clonedFromId,
    cloneCount: projectsTable.cloneCount,
    runCommand: projectsTable.runCommand,
    testCommand: projectsTable.testCommand,
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
    .orderBy(orderBy)
    .limit(limit ?? 20)
    .offset(offset ?? 0);

  const [totalResult] = await db.select({ count: count() })
    .from(projectsTable)
    .where(and(...conditions));

  res.json(ListProjectsResponse.parse({
    projects,
    total: totalResult?.count ?? 0,
  }));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = req as AuthenticatedRequest;
  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const [project] = await db.insert(projectsTable).values({
    ownerId: userId,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    language: parsed.data.language,
    templateId: parsed.data.templateId,
    isPublic: parsed.data.isPublic ?? true,
  }).returning();

  if (parsed.data.templateId) {
    const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, parsed.data.templateId));
    if (template && template.filesSnapshot) {
      const snapshot = template.filesSnapshot as Record<string, string>;
      const fileInserts = Object.entries(snapshot).map(([path, content]) => ({
        projectId: project.id,
        path,
        name: path.split("/").pop() || path,
        isDirectory: false,
        content,
        sizeBytes: Buffer.byteLength(content, "utf8"),
      }));
      if (fileInserts.length > 0) {
        await db.insert(filesTable).values(fileInserts);
      }
      await db.update(projectsTable).set({
        runCommand: template.runCommand,
        entryFile: template.entryFile,
      }).where(eq(projectsTable.id, project.id));
    }
  }

  const [fullProject] = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    clonedFromId: projectsTable.clonedFromId,
    cloneCount: projectsTable.cloneCount,
    runCommand: projectsTable.runCommand,
    testCommand: projectsTable.testCommand,
    entryFile: projectsTable.entryFile,
    containerStatus: projectsTable.containerStatus,
    gpuEnabled: projectsTable.gpuEnabled,
    deployedUrl: projectsTable.deployedUrl,
    lastAccessedAt: projectsTable.lastAccessedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
    ownerName: usersTable.displayName,
  }).from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.id, project.id));

  logAudit({
    userId,
    action: "project.create",
    resourceType: "project",
    resourceId: project.id,
    metadata: { name: parsed.data.name, language: parsed.data.language },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json(GetProjectResponse.parse(fullProject));
});

router.get("/projects/archived/list", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const projects = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    isArchived: projectsTable.isArchived,
    archivedAt: projectsTable.archivedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
  })
    .from(projectsTable)
    .where(and(eq(projectsTable.ownerId, userId), eq(projectsTable.isArchived, true)))
    .orderBy(desc(projectsTable.archivedAt));

  res.json({ projects });
});

router.get("/projects/:id", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    clonedFromId: projectsTable.clonedFromId,
    cloneCount: projectsTable.cloneCount,
    runCommand: projectsTable.runCommand,
    testCommand: projectsTable.testCommand,
    entryFile: projectsTable.entryFile,
    containerStatus: projectsTable.containerStatus,
    gpuEnabled: projectsTable.gpuEnabled,
    deployedUrl: projectsTable.deployedUrl,
    lastAccessedAt: projectsTable.lastAccessedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
    ownerName: usersTable.displayName,
  }).from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.update(projectsTable).set({ lastAccessedAt: new Date() }).where(eq(projectsTable.id, params.data.id));

  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [fullProject] = await db.select({
    id: projectsTable.id,
    ownerId: projectsTable.ownerId,
    name: projectsTable.name,
    slug: projectsTable.slug,
    description: projectsTable.description,
    language: projectsTable.language,
    isPublic: projectsTable.isPublic,
    forkedFromId: projectsTable.forkedFromId,
    clonedFromId: projectsTable.clonedFromId,
    cloneCount: projectsTable.cloneCount,
    runCommand: projectsTable.runCommand,
    testCommand: projectsTable.testCommand,
    entryFile: projectsTable.entryFile,
    containerStatus: projectsTable.containerStatus,
    gpuEnabled: projectsTable.gpuEnabled,
    deployedUrl: projectsTable.deployedUrl,
    lastAccessedAt: projectsTable.lastAccessedAt,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
    ownerName: usersTable.displayName,
  }).from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(eq(projectsTable.id, params.data.id));

  res.json(UpdateProjectResponse.parse(fullProject));
});

router.delete("/projects/:id", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.ownerId, (req as AuthenticatedRequest).userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  logAudit({
    userId: (req as AuthenticatedRequest).userId,
    action: "project.delete",
    resourceType: "project",
    resourceId: params.data.id,
    metadata: { name: deleted.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.sendStatus(204);
});

router.post("/projects/:id/fork", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = ForkProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [original] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { userId } = req as AuthenticatedRequest;
  const slug = `${original.slug}-fork-${Date.now().toString(36)}`;

  const [forked] = await db.insert(projectsTable).values({
    ownerId: userId,
    name: `${original.name} (Fork)`,
    slug,
    description: original.description,
    language: original.language,
    isPublic: true,
    forkedFromId: original.id,
    runCommand: original.runCommand,
    entryFile: original.entryFile,
  }).returning();

  const originalFiles = await db.select().from(filesTable).where(eq(filesTable.projectId, original.id));
  if (originalFiles.length > 0) {
    await db.insert(filesTable).values(originalFiles.map(f => ({
      projectId: forked.id,
      path: f.path,
      name: f.name,
      isDirectory: f.isDirectory,
      content: f.content,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
    })));
  }

  res.status(201).json(GetProjectResponse.parse({ ...forked, gpuEnabled: forked.gpuEnabled ?? false, ownerName: null }));
});

router.post("/projects/:id/clone", requireAuth, async (req, res): Promise<void> => {
  const params = CloneProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CloneProjectBody.safeParse(req.body);

  const [original] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (!original.isPublic) {
    const { userId } = req as AuthenticatedRequest;
    if (original.ownerId !== userId) {
      res.status(403).json({ error: "Cannot clone a private project" });
      return;
    }
  }

  const { userId } = req as AuthenticatedRequest;
  const customName = body.success && body.data?.name ? body.data.name : `${original.name} (Clone)`;
  const slug = `${original.slug}-clone-${Date.now().toString(36)}`;

  const [cloned] = await db.insert(projectsTable).values({
    ownerId: userId,
    name: customName,
    slug,
    description: original.description,
    language: original.language,
    isPublic: true,
    clonedFromId: original.id,
    runCommand: original.runCommand,
    entryFile: original.entryFile,
  }).returning();

  const originalFiles = await db.select().from(filesTable).where(eq(filesTable.projectId, original.id));
  if (originalFiles.length > 0) {
    await db.insert(filesTable).values(originalFiles.map(f => ({
      projectId: cloned.id,
      path: f.path,
      name: f.name,
      isDirectory: f.isDirectory,
      content: f.content,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
    })));
  }

  await db.update(projectsTable)
    .set({ cloneCount: sql`${projectsTable.cloneCount} + 1` })
    .where(eq(projectsTable.id, original.id));

  logAudit({
    userId,
    action: "project.clone",
    resourceType: "project",
    resourceId: cloned.id,
    metadata: { originalId: original.id, originalName: original.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json(GetProjectResponse.parse({ ...cloned, ownerName: null }));
});

router.post("/projects/:id/archive", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const projectId = req.params["id"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.isArchived) {
    res.status(400).json({ error: "Project is already archived" });
    return;
  }

  const [updated] = await db.update(projectsTable)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      containerStatus: "stopped",
    })
    .where(eq(projectsTable.id, projectId))
    .returning();

  logAudit({
    userId,
    action: "project.update",
    resourceType: "project",
    resourceId: projectId,
    metadata: { action: "archive", name: project.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json(updated);
});

router.post("/projects/:id/unarchive", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const projectId = req.params["id"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (!project.isArchived) {
    res.status(400).json({ error: "Project is not archived" });
    return;
  }

  const [updated] = await db.update(projectsTable)
    .set({
      isArchived: false,
      archivedAt: null,
    })
    .where(eq(projectsTable.id, projectId))
    .returning();

  logAudit({
    userId,
    action: "project.update",
    resourceType: "project",
    resourceId: projectId,
    metadata: { action: "unarchive", name: project.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json(updated);
});

export default router;
