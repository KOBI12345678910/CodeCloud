import { Router, type IRouter } from "express";
import { db, filesTable } from "@workspace/db";
import { eq, and, like, sql } from "drizzle-orm";
import {
  ListFilesParams,
  ListFilesResponse,
  CreateFileParams,
  CreateFileBody,
  GetFileParams,
  GetFileResponse,
  UpdateFileParams,
  UpdateFileBody,
  UpdateFileResponse,
  DeleteFileParams,
  MoveFileParams,
  MoveFileBody,
  MoveFileResponse,
} from "@workspace/api-zod";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/projects/:id/files", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = ListFilesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const files = await db.select().from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(filesTable.path);

  res.json(ListFilesResponse.parse(files));
});

router.post("/projects/:id/files", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = CreateFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sizeBytes = parsed.data.content ? Buffer.byteLength(parsed.data.content, "utf8") : 0;

  const [file] = await db.insert(filesTable).values({
    projectId: params.data.id,
    path: parsed.data.path,
    name: parsed.data.name,
    isDirectory: parsed.data.isDirectory ?? false,
    content: parsed.data.content ?? null,
    sizeBytes,
  }).returning();

  res.status(201).json(GetFileResponse.parse(file));
});

router.get("/projects/:projectId/files/:fileId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [file] = await db.select().from(filesTable)
    .where(and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    ));

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(GetFileResponse.parse(file));
});

router.patch("/projects/:projectId/files/:fileId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = UpdateFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<{ name: string; path: string; content: string; sizeBytes: number }> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.path !== undefined) updateData.path = parsed.data.path;
  if (parsed.data.content !== undefined) {
    updateData.content = parsed.data.content;
    updateData.sizeBytes = Buffer.byteLength(parsed.data.content, "utf8");
  }

  const [file] = await db.update(filesTable)
    .set(updateData)
    .where(and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    ))
    .returning();

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(UpdateFileResponse.parse(file));
});

router.delete("/projects/:projectId/files/:fileId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [file] = await db.select().from(filesTable)
    .where(and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    ));

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (file.isDirectory) {
    const dirPrefix = `${file.path}/`;
    await db.delete(filesTable).where(
      and(
        eq(filesTable.projectId, params.data.projectId),
        like(filesTable.path, `${dirPrefix}%`),
      )
    );
  }

  await db.delete(filesTable).where(
    and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    )
  );

  res.sendStatus(204);
});

router.patch("/projects/:projectId/files/:fileId/move", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = MoveFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = MoveFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [file] = await db.select().from(filesTable)
    .where(and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    ));

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const newName = parsed.data.newPath.split("/").pop() || "";

  if (file.isDirectory) {
    const oldPrefix = `${file.path}/`;
    const newPrefix = `${parsed.data.newPath}/`;
    const children = await db.select().from(filesTable)
      .where(and(
        eq(filesTable.projectId, params.data.projectId),
        like(filesTable.path, `${oldPrefix}%`),
      ));

    for (const child of children) {
      const newChildPath = newPrefix + child.path.slice(oldPrefix.length);
      const childName = newChildPath.split("/").pop() || child.name;
      await db.update(filesTable)
        .set({ path: newChildPath, name: childName })
        .where(eq(filesTable.id, child.id));
    }
  }

  const [updated] = await db.update(filesTable)
    .set({ path: parsed.data.newPath, name: newName })
    .where(and(
      eq(filesTable.id, params.data.fileId),
      eq(filesTable.projectId, params.data.projectId),
    ))
    .returning();

  res.json(MoveFileResponse.parse(updated));
});

export default router;
