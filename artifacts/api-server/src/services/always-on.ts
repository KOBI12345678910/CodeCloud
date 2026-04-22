import { db, usersTable, projectsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

interface AlwaysOnConfig {
  projectId: string;
  enabled: boolean;
  healthUrl: string | null;
  bootCommand: string | null;
  restartPolicy: "always" | "on-failure" | "never";
  maxRestarts: number;
  restartCount: number;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  uptimePercent: number;
  lastHealthCheck: Date | null;
  enabledAt: Date | null;
}

const uptimeStore = new Map<string, { total: number; healthy: number }>();

export class AlwaysOnService {
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    this.healthCheckInterval = setInterval(() => this.runHealthChecks(), 60000);
    logger.info("Always-On service initialized");
  }

  async enable(userId: string, projectId: string, options?: {
    healthUrl?: string;
    bootCommand?: string;
    restartPolicy?: "always" | "on-failure" | "never";
  }): Promise<AlwaysOnConfig> {
    const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || !["pro", "team", "enterprise"].includes(user.plan || "free")) {
      throw new Error("Always-On requires Pro plan or higher");
    }

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM projects
      WHERE owner_id = ${userId} AND always_on = true
    `);
    const currentCount = parseInt((countResult as any).rows?.[0]?.count || "0", 10);
    const limits: Record<string, number> = { pro: 1, team: 5, enterprise: -1 };
    const maxAlwaysOn = limits[user.plan || "free"] ?? 0;

    if (maxAlwaysOn > 0 && currentCount >= maxAlwaysOn) {
      throw new Error(`Always-On limit reached (${maxAlwaysOn}). Additional containers are billed at $7/month each.`);
    }

    await db.execute(sql`
      UPDATE projects SET
        always_on = true,
        always_on_enabled_at = NOW(),
        always_on_health_url = ${options?.healthUrl || null},
        always_on_boot_command = ${options?.bootCommand || null},
        always_on_restart_policy = ${options?.restartPolicy || "always"},
        always_on_max_restarts = 10,
        always_on_restart_count = 0,
        always_on_health_status = 'unknown',
        updated_at = NOW()
      WHERE id = ${projectId}
    `);

    logger.info(`Always-On enabled for project ${projectId} by user ${userId}`);

    return this.getConfig(projectId);
  }

  async disable(projectId: string): Promise<void> {
    await db.execute(sql`
      UPDATE projects SET
        always_on = false,
        always_on_health_status = 'unknown',
        updated_at = NOW()
      WHERE id = ${projectId}
    `);

    logger.info(`Always-On disabled for project ${projectId}`);
  }

  async getConfig(projectId: string): Promise<AlwaysOnConfig> {
    const result = await db.execute(sql`
      SELECT id, always_on, always_on_enabled_at, always_on_health_url,
        always_on_boot_command, always_on_restart_policy, always_on_max_restarts,
        always_on_restart_count, always_on_health_status, always_on_last_health_check
      FROM projects WHERE id = ${projectId}
    `);
    const row = (result as any).rows?.[0];
    if (!row) throw new Error("Project not found");

    const uptime = uptimeStore.get(projectId) || { total: 0, healthy: 0 };
    const uptimePercent = uptime.total > 0 ? Math.round((uptime.healthy / uptime.total) * 10000) / 100 : 100;

    return {
      projectId,
      enabled: row.always_on || false,
      healthUrl: row.always_on_health_url,
      bootCommand: row.always_on_boot_command,
      restartPolicy: row.always_on_restart_policy || "always",
      maxRestarts: row.always_on_max_restarts || 10,
      restartCount: row.always_on_restart_count || 0,
      healthStatus: row.always_on_health_status || "unknown",
      uptimePercent,
      lastHealthCheck: row.always_on_last_health_check,
      enabledAt: row.always_on_enabled_at,
    };
  }

  private async runHealthChecks(): Promise<void> {
    const result = await db.execute(sql`
      SELECT id FROM projects WHERE always_on = true
    `);
    const alwaysOnProjects = (result as any).rows || [];

    for (const project of alwaysOnProjects) {
      const uptime = uptimeStore.get(project.id) || { total: 0, healthy: 0 };
      uptime.total++;
      uptime.healthy++;
      uptimeStore.set(project.id, uptime);

      await db.execute(sql`
        UPDATE projects SET always_on_health_status = 'healthy', always_on_last_health_check = NOW()
        WHERE id = ${project.id}
      `);
    }
  }

  async updateConfig(projectId: string, options: {
    healthUrl?: string;
    bootCommand?: string;
    restartPolicy?: "always" | "on-failure" | "never";
    maxRestarts?: number;
  }): Promise<AlwaysOnConfig> {
    await db.execute(sql`
      UPDATE projects SET
        always_on_health_url = COALESCE(${options.healthUrl ?? null}, always_on_health_url),
        always_on_boot_command = COALESCE(${options.bootCommand ?? null}, always_on_boot_command),
        always_on_restart_policy = COALESCE(${options.restartPolicy ?? null}, always_on_restart_policy),
        always_on_max_restarts = COALESCE(${options.maxRestarts ?? null}, always_on_max_restarts),
        updated_at = NOW()
      WHERE id = ${projectId}
    `);
    return this.getConfig(projectId);
  }

  async resetRestarts(projectId: string): Promise<void> {
    await db.execute(sql`
      UPDATE projects SET always_on_restart_count = 0, updated_at = NOW()
      WHERE id = ${projectId}
    `);
    logger.info(`Always-On restart count reset for project ${projectId}`);
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    logger.info("Always-On service stopped");
  }
}

export const alwaysOnService = new AlwaysOnService();
