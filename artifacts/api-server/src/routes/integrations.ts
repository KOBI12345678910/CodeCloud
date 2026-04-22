import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, projectIntegrationsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

const INTEGRATION_CATALOG = [
  {
    id: "slack",
    name: "Slack",
    description: "Get build notifications, deployment alerts, and collaborate with your team directly in Slack channels.",
    icon: "slack",
    category: "communication",
    features: ["Build notifications", "Deploy alerts", "Team mentions", "Custom webhooks"],
    docsUrl: "https://api.slack.com",
    requiredScopes: ["chat:write", "channels:read"],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send project events and deployment status updates to your Discord server channels.",
    icon: "discord",
    category: "communication",
    features: ["Event notifications", "Deploy status", "Error alerts", "Rich embeds"],
    docsUrl: "https://discord.com/developers",
    requiredScopes: ["bot", "webhook.incoming"],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Link commits to Jira issues, auto-update ticket status on deploy, and track progress.",
    icon: "jira",
    category: "project-management",
    features: ["Issue linking", "Auto transitions", "Sprint tracking", "Smart commits"],
    docsUrl: "https://developer.atlassian.com",
    requiredScopes: ["read:jira-work", "write:jira-work"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Sync your development workflow with Linear issues, automate status updates on merge and deploy.",
    icon: "linear",
    category: "project-management",
    features: ["Issue sync", "Auto close on merge", "Branch tracking", "Cycle reports"],
    docsUrl: "https://developers.linear.app",
    requiredScopes: ["read", "write", "issues:create"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Automatically publish changelogs, sync documentation, and keep your Notion workspace updated.",
    icon: "notion",
    category: "documentation",
    features: ["Changelog sync", "Doc publishing", "Database updates", "Page embeds"],
    docsUrl: "https://developers.notion.com",
    requiredScopes: ["read_content", "update_content", "insert_content"],
  },
  {
    id: "figma",
    name: "Figma",
    description: "Import design tokens, sync component specs, and bridge design-to-code workflows.",
    icon: "figma",
    category: "design",
    features: ["Design tokens", "Component specs", "Asset export", "Style sync"],
    docsUrl: "https://www.figma.com/developers",
    requiredScopes: ["file_read", "file_dev_resources:read"],
  },
];

router.get("/integrations/catalog", (_req, res): void => {
  res.json({ integrations: INTEGRATION_CATALOG });
});

router.get("/projects/:projectId/integrations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const integrations = await db
    .select({
      id: projectIntegrationsTable.id,
      provider: projectIntegrationsTable.provider,
      status: projectIntegrationsTable.status,
      webhookUrl: projectIntegrationsTable.webhookUrl,
      externalAccountName: projectIntegrationsTable.externalAccountName,
      lastSyncAt: projectIntegrationsTable.lastSyncAt,
      createdAt: projectIntegrationsTable.createdAt,
    })
    .from(projectIntegrationsTable)
    .where(eq(projectIntegrationsTable.projectId, projectId as string));

  res.json({ integrations });
});

router.post("/projects/:projectId/integrations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  const { provider } = req.body;

  if (!provider || !INTEGRATION_CATALOG.find((i) => i.id === provider)) {
    res.status(400).json({ error: "Invalid integration provider" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectIntegrationsTable)
    .where(
      and(
        eq(projectIntegrationsTable.projectId, projectId as string),
        eq(projectIntegrationsTable.provider, provider)
      )
    );

  if (existing) {
    res.status(409).json({ error: "Integration already installed" });
    return;
  }

  const webhookSecret = crypto.randomBytes(32).toString("hex");

  const [integration] = await db
    .insert(projectIntegrationsTable)
    .values({
      projectId: projectId as string,
      installedBy: userId,
      provider,
      status: "connected",
      webhookSecret,
      externalAccountName: `${provider}-workspace`,
    })
    .returning();

  res.status(201).json({ integration });
});

router.delete("/projects/:projectId/integrations/:integrationId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, integrationId } = req.params;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project || project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [deleted] = await db
    .delete(projectIntegrationsTable)
    .where(
      and(
        eq(projectIntegrationsTable.id, integrationId as string),
        eq(projectIntegrationsTable.projectId, projectId as string)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  res.json({ message: "Integration removed" });
});

router.post("/projects/:projectId/integrations/:integrationId/webhook", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, integrationId } = req.params;
  const { webhookUrl } = req.body;

  if (!webhookUrl || typeof webhookUrl !== "string") {
    res.status(400).json({ error: "webhookUrl is required" });
    return;
  }

  try {
    new URL(webhookUrl);
  } catch {
    res.status(400).json({ error: "Invalid webhook URL" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId as string));
  if (!project || project.ownerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [updated] = await db
    .update(projectIntegrationsTable)
    .set({ webhookUrl })
    .where(
      and(
        eq(projectIntegrationsTable.id, integrationId as string),
        eq(projectIntegrationsTable.projectId, projectId as string)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }

  res.json({ integration: updated });
});

export default router;
