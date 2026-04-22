import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, organizationsTable, orgMembersTable, orgInvitesTable, orgSecretsTable, usersTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logAudit } from "../services/audit";
import crypto from "crypto";

const router = Router();

function requireOrgRole(...roles: string[]) {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
    const user = (req as any).user;
    const orgId = req.params["orgId"] as string;
    if (!user || !orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [membership] = await db
      .select()
      .from(orgMembersTable)
      .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));
    if (!membership || !roles.includes(membership.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    (req as any).orgMembership = membership;
    next();
  };
}

router.post("/organizations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { name, slug } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" });
    return;
  }
  const existing = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (existing.length > 0) {
    res.status(409).json({ error: "Organization slug already taken" });
    return;
  }
  const [org] = await db.insert(organizationsTable).values({ name, slug }).returning();
  await db.insert(orgMembersTable).values({ orgId: org.id, userId: user.id, role: "owner" });
  await logAudit({
    userId: user.id, action: "org.create", resourceType: "organization", resourceId: org.id,
    metadata: { name, slug }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.status(201).json(org);
});

router.get("/organizations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const memberships = await db
    .select({ org: organizationsTable, role: orgMembersTable.role })
    .from(orgMembersTable)
    .innerJoin(organizationsTable, eq(orgMembersTable.orgId, organizationsTable.id))
    .where(eq(orgMembersTable.userId, user.id))
    .orderBy(desc(organizationsTable.createdAt));
  res.json(memberships);
});

router.get("/organizations/:orgId", requireAuth, requireOrgRole("owner", "admin", "member"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  const members = await db
    .select({ member: orgMembersTable, user: { id: usersTable.id, username: usersTable.username, email: usersTable.email, avatarUrl: usersTable.avatarUrl } })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(eq(orgMembersTable.orgId, orgId));
  const memberCount = members.length;
  res.json({ ...org, members, memberCount });
});

router.patch("/organizations/:orgId", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const { name, avatarUrl } = req.body;
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  const [updated] = await db.update(organizationsTable).set(updates).where(eq(organizationsTable.id, orgId)).returning();
  await logAudit({
    userId: user.id, action: "org.update", resourceType: "organization", resourceId: orgId,
    metadata: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.json(updated);
});

router.delete("/organizations/:orgId", requireAuth, requireOrgRole("owner"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  await logAudit({
    userId: user.id, action: "org.delete", resourceType: "organization", resourceId: orgId,
    ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.status(204).send();
});

router.get("/organizations/:orgId/members", requireAuth, requireOrgRole("owner", "admin", "member"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const members = await db
    .select({ id: orgMembersTable.id, role: orgMembersTable.role, createdAt: orgMembersTable.createdAt, user: { id: usersTable.id, username: usersTable.username, email: usersTable.email, avatarUrl: usersTable.avatarUrl } })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(eq(orgMembersTable.orgId, orgId));
  res.json(members);
});

router.post("/organizations/:orgId/invite", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const { email, role = "member" } = req.body;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  if (!["admin", "member"].includes(role)) {
    res.status(400).json({ error: "role must be admin or member" });
    return;
  }
  const existingInvite = await db.select().from(orgInvitesTable)
    .where(and(eq(orgInvitesTable.orgId, orgId), eq(orgInvitesTable.email, email), eq(orgInvitesTable.status, "pending")));
  if (existingInvite.length > 0) {
    res.status(409).json({ error: "Invite already pending for this email" });
    return;
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await db.insert(orgInvitesTable).values({
    orgId, email, role, invitedBy: user.id, token, expiresAt,
  }).returning();
  await logAudit({
    userId: user.id, action: "org.member_invite", resourceType: "org_member", resourceId: invite.id,
    metadata: { email, role, orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.status(201).json(invite);
});

router.get("/organizations/:orgId/invites", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const invites = await db.select().from(orgInvitesTable)
    .where(eq(orgInvitesTable.orgId, orgId))
    .orderBy(desc(orgInvitesTable.createdAt));
  res.json(invites);
});

router.post("/organizations/invites/:token/accept", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const token = req.params["token"] as string;
  const [invite] = await db.select().from(orgInvitesTable).where(eq(orgInvitesTable.token, token));
  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  if (invite.status !== "pending") {
    res.status(400).json({ error: `Invite already ${invite.status}` });
    return;
  }
  if (new Date() > invite.expiresAt) {
    await db.update(orgInvitesTable).set({ status: "expired" }).where(eq(orgInvitesTable.id, invite.id));
    res.status(400).json({ error: "Invite has expired" });
    return;
  }
  const existingMember = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, invite.orgId), eq(orgMembersTable.userId, user.id)));
  if (existingMember.length > 0) {
    res.status(409).json({ error: "Already a member" });
    return;
  }
  await db.insert(orgMembersTable).values({ orgId: invite.orgId, userId: user.id, role: invite.role as "owner" | "admin" | "member" });
  await db.update(orgInvitesTable).set({ status: "accepted" }).where(eq(orgInvitesTable.id, invite.id));
  res.json({ message: "Invite accepted" });
});

router.post("/organizations/invites/:token/decline", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const token = req.params["token"] as string;
  const [invite] = await db.select().from(orgInvitesTable).where(eq(orgInvitesTable.token, token));
  if (!invite || invite.status !== "pending") {
    res.status(404).json({ error: "Invite not found or already processed" });
    return;
  }
  await db.update(orgInvitesTable).set({ status: "declined" }).where(eq(orgInvitesTable.id, invite.id));
  res.json({ message: "Invite declined" });
});

router.delete("/organizations/:orgId/invites/:inviteId", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const inviteId = req.params["inviteId"] as string;
  await db.delete(orgInvitesTable).where(and(eq(orgInvitesTable.id, inviteId), eq(orgInvitesTable.orgId, orgId)));
  res.status(204).send();
});

router.patch("/organizations/:orgId/members/:memberId", requireAuth, requireOrgRole("owner"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const memberId = req.params["memberId"] as string;
  const { role } = req.body;
  if (!role || !["owner", "admin", "member"].includes(role)) {
    res.status(400).json({ error: "Valid role required (owner, admin, member)" });
    return;
  }
  const [updated] = await db.update(orgMembersTable).set({ role })
    .where(and(eq(orgMembersTable.id, memberId), eq(orgMembersTable.orgId, orgId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  await logAudit({
    userId: user.id, action: "org.member_role_change", resourceType: "org_member", resourceId: memberId,
    metadata: { role, orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.json(updated);
});

router.delete("/organizations/:orgId/members/:memberId", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const memberId = req.params["memberId"] as string;
  const [member] = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.id, memberId), eq(orgMembersTable.orgId, orgId)));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  if (member.role === "owner") {
    res.status(400).json({ error: "Cannot remove the organization owner" });
    return;
  }
  await db.delete(orgMembersTable).where(eq(orgMembersTable.id, memberId));
  await logAudit({
    userId: user.id, action: "org.member_remove", resourceType: "org_member", resourceId: memberId,
    metadata: { orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.status(204).send();
});

router.get("/organizations/:orgId/secrets", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const secrets = await db
    .select({ id: orgSecretsTable.id, key: orgSecretsTable.key, description: orgSecretsTable.description, createdAt: orgSecretsTable.createdAt, updatedAt: orgSecretsTable.updatedAt })
    .from(orgSecretsTable)
    .where(eq(orgSecretsTable.orgId, orgId))
    .orderBy(desc(orgSecretsTable.createdAt));
  res.json(secrets);
});

router.post("/organizations/:orgId/secrets", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const { key, value, description } = req.body;
  if (!key || !value) {
    res.status(400).json({ error: "key and value are required" });
    return;
  }
  try {
    const [secret] = await db.insert(orgSecretsTable).values({ orgId, key, value, description, createdBy: user.id }).returning();
    await logAudit({
      userId: user.id, action: "org.secret_create", resourceType: "org_secret", resourceId: secret.id,
      metadata: { key, orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
    });
    res.status(201).json({ id: secret.id, key: secret.key, description: secret.description, createdAt: secret.createdAt });
  } catch {
    res.status(409).json({ error: "Secret key already exists in this organization" });
  }
});

router.patch("/organizations/:orgId/secrets/:secretId", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const secretId = req.params["secretId"] as string;
  const { value, description } = req.body;
  const updates: Record<string, string> = {};
  if (value) updates.value = value;
  if (description !== undefined) updates.description = description;
  const [updated] = await db.update(orgSecretsTable).set(updates)
    .where(and(eq(orgSecretsTable.id, secretId), eq(orgSecretsTable.orgId, orgId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Secret not found" });
    return;
  }
  await logAudit({
    userId: user.id, action: "org.secret_update", resourceType: "org_secret", resourceId: secretId,
    metadata: { key: updated.key, orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.json({ id: updated.id, key: updated.key, description: updated.description, updatedAt: updated.updatedAt });
});

router.delete("/organizations/:orgId/secrets/:secretId", requireAuth, requireOrgRole("owner", "admin"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params["orgId"] as string;
  const secretId = req.params["secretId"] as string;
  await db.delete(orgSecretsTable).where(and(eq(orgSecretsTable.id, secretId), eq(orgSecretsTable.orgId, orgId)));
  await logAudit({
    userId: user.id, action: "org.secret_delete", resourceType: "org_secret", resourceId: secretId,
    metadata: { orgId }, ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });
  res.status(204).send();
});

router.get("/organizations/:orgId/projects", requireAuth, requireOrgRole("owner", "admin", "member"), async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params["orgId"] as string;
  const projects = await db.select().from(projectsTable)
    .where(eq(projectsTable.orgId, orgId))
    .orderBy(desc(projectsTable.updatedAt));
  res.json(projects);
});

export default router;
