import { db, usersTable, projectsTable, filesTable, notificationsTable, deploymentsTable, starsTable } from "@workspace/db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

export class MobileApiService {
  async getDashboard(userId: string): Promise<{
    user: any;
    recentProjects: any[];
    notifications: { unread: number; items: any[] };
    quickStats: { projects: number; deployments: number; stars: number };
  }> {
    const [userRows, recentProjectsRaw, notifs, statsProjectCount, statsDeployCount, statsStarCount] = await Promise.all([
      db.select({
        id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl, plan: usersTable.plan, email: usersTable.email,
      }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),

      db.select({
        id: projectsTable.id, name: projectsTable.name, slug: projectsTable.slug,
        language: projectsTable.language, containerStatus: projectsTable.containerStatus,
        updatedAt: projectsTable.updatedAt,
      }).from(projectsTable).where(eq(projectsTable.ownerId, userId))
        .orderBy(desc(projectsTable.updatedAt)).limit(10),

      db.select({
        id: notificationsTable.id, type: notificationsTable.type, title: notificationsTable.title,
        message: notificationsTable.message, isRead: notificationsTable.isRead, createdAt: notificationsTable.createdAt,
      }).from(notificationsTable).where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt)).limit(20),

      db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(eq(projectsTable.ownerId, userId)),
      db.select({ count: sql<number>`count(*)` }).from(deploymentsTable).where(eq(deploymentsTable.deployedBy, userId)),
      db.select({ count: sql<number>`count(*)` }).from(starsTable).where(eq(starsTable.userId, userId)),
    ]);

    const unreadNotifs = notifs.filter((n) => !n.isRead).length;

    return {
      user: userRows[0] || null,
      recentProjects: recentProjectsRaw,
      notifications: { unread: unreadNotifs, items: notifs },
      quickStats: {
        projects: Number(statsProjectCount[0]?.count || 0),
        deployments: Number(statsDeployCount[0]?.count || 0),
        stars: Number(statsStarCount[0]?.count || 0),
      },
    };
  }

  async getProjectQuickView(projectId: string): Promise<{
    project: any;
    fileTree: any[];
    recentFiles: any[];
    deployStatus: any;
  }> {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
    if (!project) throw new Error("Project not found");

    const [fileTree, recentFiles, lastDeploy] = await Promise.all([
      db.select({
        id: filesTable.id, path: filesTable.path, name: filesTable.name,
        isDirectory: filesTable.isDirectory, sizeBytes: filesTable.sizeBytes, mimeType: filesTable.mimeType,
      }).from(filesTable)
        .where(eq(filesTable.projectId, projectId))
        .orderBy(filesTable.path)
        .limit(200),

      db.select({
        id: filesTable.id, path: filesTable.path, name: filesTable.name, updatedAt: filesTable.updatedAt,
      }).from(filesTable)
        .where(and(eq(filesTable.projectId, projectId), eq(filesTable.isDirectory, false)))
        .orderBy(desc(filesTable.updatedAt))
        .limit(5),

      db.select({
        id: deploymentsTable.id, status: deploymentsTable.status, subdomain: deploymentsTable.subdomain,
        version: deploymentsTable.version, createdAt: deploymentsTable.createdAt,
      }).from(deploymentsTable)
        .where(eq(deploymentsTable.projectId, projectId))
        .orderBy(desc(deploymentsTable.createdAt))
        .limit(1),
    ]);

    return {
      project,
      fileTree,
      recentFiles,
      deployStatus: lastDeploy[0] || null,
    };
  }

  async getFileContent(projectId: string, fileId: string): Promise<{
    file: any;
    syntaxLanguage: string;
  }> {
    const [file] = await db.select().from(filesTable)
      .where(and(eq(filesTable.id, fileId), eq(filesTable.projectId, projectId)))
      .limit(1);

    if (!file) throw new Error("File not found");

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const SYNTAX_MAP: Record<string, string> = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
      html: "html", css: "css", scss: "scss", json: "json", yaml: "yaml",
      yml: "yaml", md: "markdown", sql: "sql", sh: "bash", bash: "bash",
      dockerfile: "dockerfile", xml: "xml", svg: "xml", toml: "toml",
      env: "shell", gitignore: "shell", php: "php", c: "c", cpp: "cpp",
      h: "c", hpp: "cpp", swift: "swift", kt: "kotlin",
    };

    return {
      file,
      syntaxLanguage: SYNTAX_MAP[ext] || "plaintext",
    };
  }

  async getChangedFiles(projectId: string, since: Date): Promise<{
    created: any[];
    modified: any[];
    deleted: string[];
  }> {
    const changedFiles = await db.select({
      id: filesTable.id, path: filesTable.path, name: filesTable.name,
      content: filesTable.content, isDirectory: filesTable.isDirectory,
      sizeBytes: filesTable.sizeBytes, updatedAt: filesTable.updatedAt,
      createdAt: filesTable.createdAt,
    }).from(filesTable)
      .where(and(eq(filesTable.projectId, projectId), gte(filesTable.updatedAt, since)));

    const created = changedFiles.filter((f) => f.createdAt && f.createdAt >= since);
    const modified = changedFiles.filter((f) => f.createdAt && f.createdAt < since);

    return { created, modified, deleted: [] };
  }
}

export const mobileApiService = new MobileApiService();
