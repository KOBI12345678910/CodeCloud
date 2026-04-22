import { db, orgPoliciesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface OrgPolicyUpdate {
  require2fa?: boolean;
  defaultMemberRole?: string;
  projectVisibility?: string;
  apiAccessEnabled?: boolean;
  ipAllowlistEnabled?: boolean;
  sessionTimeoutMinutes?: string;
  allowedAuthMethods?: string[];
}

export async function getOrgPolicy(orgId: string) {
  const [policy] = await db.select().from(orgPoliciesTable).where(eq(orgPoliciesTable.orgId, orgId));
  if (policy) return policy;

  const [created] = await db.insert(orgPoliciesTable).values({ orgId }).onConflictDoNothing().returning();
  if (created) return created;

  const [existing] = await db.select().from(orgPoliciesTable).where(eq(orgPoliciesTable.orgId, orgId));
  return existing;
}

export async function updateOrgPolicy(orgId: string, updates: OrgPolicyUpdate) {
  const existing = await getOrgPolicy(orgId);
  if (!existing) return null;

  const [updated] = await db.update(orgPoliciesTable)
    .set(updates as Record<string, unknown>)
    .where(eq(orgPoliciesTable.orgId, orgId))
    .returning();
  return updated;
}
