import { Router, type IRouter } from "express";
import { db, templatesTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { ListTemplatesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(templatesTable)
    .orderBy(asc(templatesTable.sortOrder));

  res.json(ListTemplatesResponse.parse(templates));
});

export default router;
