import { db, auditLogTable } from "@workspace/db";
import { logger } from "../lib/logger";

export type AuditAction =
  | "user.login"
  | "user.login_failed"
  | "user.logout"
  | "user.register"
  | "user.password_change"
  | "user.password_reset"
  | "user.profile_update"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.fork"
  | "project.clone"
  | "project.export"
  | "review.request"
  | "review.status_change"
  | "deployment.create"
  | "deployment.status_change"
  | "collaborator.invite"
  | "collaborator.remove"
  | "collaborator.role_change"
  | "settings.update"
  | "settings.api_key_create"
  | "settings.api_key_delete"
  | "admin.user_update"
  | "admin.user_delete"
  | "admin.project_delete"
  | "integration.install"
  | "integration.uninstall"
  | "secret.create"
  | "secret.update"
  | "secret.delete"
  | "always_on.enable"
  | "always_on.disable"
  | "container.restart"
  | "container.stop"
  | "feedback_submitted"
  | "oauth_app.create"
  | "oauth_app.update"
  | "oauth_app.delete"
  | "oauth_app.secret_rotate"
  | "oauth_auth.revoke"
  | "webhook.create"
  | "webhook.update"
  | "webhook.delete"
  | "org.create"
  | "org.update"
  | "org.delete"
  | "org.member_invite"
  | "org.member_remove"
  | "org.member_role_change"
  | "org.secret_create"
  | "org.secret_update"
  | "org.secret_delete"
  | "project.transfer.initiated"
  | "project.transfer.accepted"
  | "project.transfer.declined"
  | "project.transfer.cancelled";

export type AuditResourceType =
  | "user"
  | "project"
  | "deployment"
  | "collaborator"
  | "settings"
  | "api_key"
  | "integration"
  | "secret"
  | "container"
  | "feedback"
  | "review"
  | "oauth_app"
  | "oauth_authorization"
  | "webhook"
  | "organization"
  | "org_member"
  | "org_secret";

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const meta = entry.metadata || {};
    if (entry.correlationId) {
      (meta as Record<string, unknown>).correlationId = entry.correlationId;
    }

    await db.insert(auditLogTable).values({
      userId: entry.userId || null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId || null,
      metadata: meta,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
    });

    logger.info(
      {
        audit: true,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        userId: entry.userId,
        correlationId: entry.correlationId,
      },
      `Audit: ${entry.action}`
    );
  } catch (err) {
    logger.error({ err, action: entry.action }, "Failed to write audit log");
  }
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.ip || "unknown";
}

export function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }): string {
  return (req.headers["user-agent"] as string) || "unknown";
}
