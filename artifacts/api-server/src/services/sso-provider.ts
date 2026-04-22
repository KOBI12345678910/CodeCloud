import { db, ssoConfigurationsTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export interface SSOConfigInput {
  orgId: string;
  provider: string;
  entityId: string;
  loginUrl: string;
  certificate: string;
  metadataXml?: string;
}

export async function configureSSOProvider(data: SSOConfigInput) {
  const spEntityId = `${APP_URL}/api/sso/metadata/${data.orgId}`;
  const acsUrl = `${APP_URL}/api/sso/acs/${data.orgId}`;

  const [config] = await db.insert(ssoConfigurationsTable).values({
    orgId: data.orgId,
    provider: data.provider,
    entityId: data.entityId,
    loginUrl: data.loginUrl,
    certificate: data.certificate,
    metadataXml: data.metadataXml,
    spEntityId,
    acsUrl,
    enabled: true,
  }).returning();

  await db.update(organizationsTable).set({ ssoEnabled: true }).where(eq(organizationsTable.id, data.orgId));
  return config;
}

export async function getSSOConfig(id: string) {
  const [config] = await db.select().from(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.id, id));
  return config ?? null;
}

export async function listSSOByOrg(orgId: string) {
  return db.select().from(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.orgId, orgId));
}

export async function toggleSSOConfig(id: string) {
  const [config] = await db.select().from(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.id, id));
  if (!config) return null;

  const [updated] = await db.update(ssoConfigurationsTable)
    .set({ enabled: !config.enabled })
    .where(eq(ssoConfigurationsTable.id, id))
    .returning();
  return updated;
}

export async function deleteSSOConfig(id: string): Promise<boolean> {
  const [config] = await db.select().from(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.id, id));
  if (!config) return false;

  await db.delete(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.id, id));

  const remaining = await db.select().from(ssoConfigurationsTable).where(eq(ssoConfigurationsTable.orgId, config.orgId));
  if (remaining.length === 0) {
    await db.update(organizationsTable).set({ ssoEnabled: false }).where(eq(organizationsTable.id, config.orgId));
  }
  return true;
}

export function generateSPMetadata(orgId: string) {
  const spEntityId = `${APP_URL}/api/sso/metadata/${orgId}`;
  const acsUrl = `${APP_URL}/api/sso/acs/${orgId}`;

  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${spEntityId}">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="1" />
  </SPSSODescriptor>
</EntityDescriptor>`;
}

export async function initiateLogin(configId: string) {
  const config = await getSSOConfig(configId);
  if (!config || !config.enabled) return null;

  return {
    loginUrl: config.loginUrl,
    entityId: config.entityId,
    provider: config.provider,
    spEntityId: config.spEntityId,
    acsUrl: config.acsUrl,
  };
}
