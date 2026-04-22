import { db, containerNetworksTable, networkMembersTable, exposedPortsTable, networkPoliciesTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

let nextSubnet = 1;

function generateSubnet(): string {
  const subnet = `10.100.${nextSubnet}.0/24`;
  nextSubnet = (nextSubnet % 254) + 1;
  return subnet;
}

function generateInternalIp(subnet: string, index: number): string {
  const base = subnet.split("/")[0].split(".");
  return `${base[0]}.${base[1]}.${base[2]}.${index + 10}`;
}

export async function createNetwork(ownerId: string, name: string, description?: string, policy?: string) {
  const subnet = generateSubnet();
  const [network] = await db.insert(containerNetworksTable).values({
    name,
    ownerId,
    subnet,
    policy: (policy as any) || "allow_all",
    description: description || null,
  }).returning();
  return network;
}

export async function listNetworks(ownerId: string) {
  return db.select().from(containerNetworksTable).where(eq(containerNetworksTable.ownerId, ownerId));
}

export async function getNetwork(networkId: string) {
  const [network] = await db.select().from(containerNetworksTable).where(eq(containerNetworksTable.id, networkId));
  return network || null;
}

export async function updateNetwork(networkId: string, data: { name?: string; policy?: string; description?: string }) {
  const updates: any = {};
  if (data.name) updates.name = data.name;
  if (data.policy) updates.policy = data.policy;
  if (data.description !== undefined) updates.description = data.description;
  const [updated] = await db.update(containerNetworksTable).set(updates).where(eq(containerNetworksTable.id, networkId)).returning();
  return updated;
}

export async function deleteNetwork(networkId: string) {
  await db.delete(containerNetworksTable).where(eq(containerNetworksTable.id, networkId));
}

export async function addMember(networkId: string, projectId: string, hostname: string) {
  const network = await getNetwork(networkId);
  if (!network) throw new Error("Network not found");

  const existingMembers = await db.select().from(networkMembersTable).where(eq(networkMembersTable.networkId, networkId));
  const internalIp = generateInternalIp(network.subnet, existingMembers.length);

  const [member] = await db.insert(networkMembersTable).values({
    networkId,
    projectId,
    hostname,
    internalIp,
    status: "active",
  }).returning();
  return member;
}

export async function removeMember(networkId: string, memberId: string) {
  await db.delete(networkMembersTable).where(and(eq(networkMembersTable.id, memberId), eq(networkMembersTable.networkId, networkId)));
}

export async function listMembers(networkId: string) {
  return db.select().from(networkMembersTable).where(eq(networkMembersTable.networkId, networkId));
}

export async function getProjectNetworks(projectId: string) {
  const memberships = await db.select().from(networkMembersTable).where(eq(networkMembersTable.projectId, projectId));
  if (memberships.length === 0) return [];
  const networkIds = memberships.map(m => m.networkId);
  const networks = [];
  for (const nid of networkIds) {
    const n = await getNetwork(nid);
    if (n) networks.push({ ...n, membership: memberships.find(m => m.networkId === nid) });
  }
  return networks;
}

export async function exposePort(networkId: string, projectId: string, port: number, protocol: string = "tcp", serviceName?: string, description?: string, isPublic: boolean = false) {
  const [exposed] = await db.insert(exposedPortsTable).values({
    networkId,
    projectId,
    port,
    protocol,
    serviceName: serviceName || null,
    description: description || null,
    isPublic,
  }).returning();
  return exposed;
}

export async function unexposePort(portId: string, networkId?: string) {
  const conditions = [eq(exposedPortsTable.id, portId)];
  if (networkId) conditions.push(eq(exposedPortsTable.networkId, networkId));
  await db.delete(exposedPortsTable).where(and(...conditions));
}

export async function listExposedPorts(networkId: string) {
  return db.select().from(exposedPortsTable).where(eq(exposedPortsTable.networkId, networkId));
}

export async function discoverServices(networkId: string) {
  const members = await listMembers(networkId);
  const ports = await listExposedPorts(networkId);

  return members.map(member => ({
    projectId: member.projectId,
    hostname: member.hostname,
    internalIp: member.internalIp,
    status: member.status,
    services: ports.filter(p => p.projectId === member.projectId).map(p => ({
      id: p.id,
      port: p.port,
      protocol: p.protocol,
      serviceName: p.serviceName,
      endpoint: `${member.hostname}:${p.port}`,
      isPublic: p.isPublic,
    })),
  }));
}

export async function addNetworkPolicy(networkId: string, sourceProjectId: string | null, targetProjectId: string | null, action: string, ports?: number[], priority?: number, description?: string) {
  const [policy] = await db.insert(networkPoliciesTable).values({
    networkId,
    sourceProjectId,
    targetProjectId,
    action,
    ports: ports || null,
    priority: priority || 100,
    description: description || null,
  }).returning();
  return policy;
}

export async function removeNetworkPolicy(policyId: string, networkId?: string) {
  const conditions = [eq(networkPoliciesTable.id, policyId)];
  if (networkId) conditions.push(eq(networkPoliciesTable.networkId, networkId));
  await db.delete(networkPoliciesTable).where(and(...conditions));
}

export async function listNetworkPolicies(networkId: string) {
  return db.select().from(networkPoliciesTable).where(eq(networkPoliciesTable.networkId, networkId));
}
