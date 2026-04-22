import { db, ipAllowlistTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function addIPRule(data: {
  orgId: string;
  type: string;
  cidr: string;
  description?: string;
  createdBy?: string;
}) {
  const [rule] = await db.insert(ipAllowlistTable).values({
    orgId: data.orgId,
    type: data.type,
    cidr: data.cidr,
    description: data.description,
    createdBy: data.createdBy,
    enabled: true,
  }).returning();
  return rule;
}

function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const [network, bits] = cidr.split("/");
  if (!bits) return ip === network;

  const mask = parseInt(bits, 10);
  const ipParts = ip.split(".").map(Number);
  const netParts = network.split(".").map(Number);

  if (ipParts.length !== 4 || netParts.length !== 4) return false;

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const netNum = (netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3];
  const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

  return ((ipNum & maskNum) >>> 0) === ((netNum & maskNum) >>> 0);
}

export async function checkIP(orgId: string, ip: string): Promise<{ allowed: boolean; matchedRule: string | null }> {
  const rules = await db.select().from(ipAllowlistTable)
    .where(and(eq(ipAllowlistTable.orgId, orgId), eq(ipAllowlistTable.enabled, true)));

  if (rules.length === 0) return { allowed: true, matchedRule: null };

  for (const rule of rules) {
    if (ipMatchesCIDR(ip, rule.cidr)) {
      return { allowed: rule.type === "allow", matchedRule: rule.id };
    }
  }

  const hasAllowRules = rules.some(r => r.type === "allow");
  return { allowed: !hasAllowRules, matchedRule: null };
}

export async function listIPRules(orgId: string) {
  return db.select().from(ipAllowlistTable).where(eq(ipAllowlistTable.orgId, orgId));
}

export async function toggleIPRule(id: string) {
  const [rule] = await db.select().from(ipAllowlistTable).where(eq(ipAllowlistTable.id, id));
  if (!rule) return null;

  const [updated] = await db.update(ipAllowlistTable)
    .set({ enabled: !rule.enabled })
    .where(eq(ipAllowlistTable.id, id))
    .returning();
  return updated;
}

export async function deleteIPRule(id: string): Promise<boolean> {
  const [rule] = await db.select().from(ipAllowlistTable).where(eq(ipAllowlistTable.id, id));
  if (!rule) return false;
  await db.delete(ipAllowlistTable).where(eq(ipAllowlistTable.id, id));
  return true;
}
