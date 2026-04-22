import { Router, type IRouter } from "express";
import { db, usersTable, apiKeysTable, projectSecretsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { randomBytes, createHash, createCipheriv, createDecipheriv, scryptSync } from "crypto";

const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn("[settings] SECRETS_ENCRYPTION_KEY not set. Project secret encryption/decryption will fail at runtime until this is configured.");
}
const DERIVED_KEY = ENCRYPTION_KEY ? scryptSync(ENCRYPTION_KEY, "codecloud-salt", 32) : null;

function encryptSecret(plaintext: string): string {
  if (!DERIVED_KEY) throw new Error("SECRETS_ENCRYPTION_KEY is not configured. Cannot encrypt secrets.");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", DERIVED_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSecret(encrypted: string): string {
  if (!DERIVED_KEY) throw new Error("SECRETS_ENCRYPTION_KEY is not configured. Cannot decrypt secrets.");
  const [ivHex, authTagHex, dataHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", DERIVED_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const router: IRouter = Router();

router.get("/settings/api-keys", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const keys = await db.select({
    id: apiKeysTable.id,
    name: apiKeysTable.name,
    keyPrefix: apiKeysTable.keyPrefix,
    scopes: apiKeysTable.scopes,
    isActive: apiKeysTable.isActive,
    lastUsedAt: apiKeysTable.lastUsedAt,
    expiresAt: apiKeysTable.expiresAt,
    createdAt: apiKeysTable.createdAt,
  }).from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId));

  res.json(keys);
});

router.post("/settings/api-keys", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { name, scopes } = req.body;

  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const rawKey = `cc_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 10);

  const [key] = await db.insert(apiKeysTable).values({
    userId,
    name,
    keyHash,
    keyPrefix,
    scopes: scopes || "read",
  }).returning();

  res.status(201).json({ ...key, key: rawKey });
});

router.delete("/settings/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  await db.delete(apiKeysTable)
    .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, userId)));

  res.sendStatus(204);
});

router.get("/projects/:id/secrets", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const env = (req.query.environment as string) || undefined;

  const conditions = [eq(projectSecretsTable.projectId, projectId)];
  if (env) conditions.push(eq(projectSecretsTable.environment, env));

  const secrets = await db.select({
    id: projectSecretsTable.id,
    key: projectSecretsTable.key,
    environment: projectSecretsTable.environment,
    createdAt: projectSecretsTable.createdAt,
    updatedAt: projectSecretsTable.updatedAt,
  }).from(projectSecretsTable)
    .where(and(...conditions));

  res.json(secrets);
});

const VALID_ENVS = ["development", "production"];

router.post("/projects/:id/secrets", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { key, value, environment } = req.body;
  const env = environment || "development";

  if (!key || !value) {
    res.status(400).json({ error: "key and value are required" });
    return;
  }

  if (!VALID_ENVS.includes(env)) {
    res.status(400).json({ error: "environment must be 'development' or 'production'" });
    return;
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || key.length > 256) {
    res.status(400).json({ error: "Invalid key format" });
    return;
  }

  const encrypted = encryptSecret(value);

  const [secret] = await db.insert(projectSecretsTable).values({
    projectId,
    key,
    encryptedValue: encrypted,
    environment: env,
  }).onConflictDoNothing().returning();

  if (!secret) {
    await db.update(projectSecretsTable)
      .set({ encryptedValue: encrypted })
      .where(and(
        eq(projectSecretsTable.projectId, projectId),
        eq(projectSecretsTable.key, key),
        eq(projectSecretsTable.environment, env)
      ));
  }

  res.status(201).json({ key, environment: env });
});

router.post("/projects/:id/secrets/bulk", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { variables, environment } = req.body;
  const env = environment || "development";

  if (!Array.isArray(variables) || variables.length === 0) {
    res.status(400).json({ error: "variables array is required" }); return;
  }

  if (!VALID_ENVS.includes(env)) {
    res.status(400).json({ error: "environment must be 'development' or 'production'" }); return;
  }

  let imported = 0;
  for (const { key, value } of variables) {
    if (!key || !value) continue;
    const encrypted = encryptSecret(value);
    const [secret] = await db.insert(projectSecretsTable).values({
      projectId, key, encryptedValue: encrypted, environment: env,
    }).onConflictDoNothing().returning();
    if (!secret) {
      await db.update(projectSecretsTable)
        .set({ encryptedValue: encrypted })
        .where(and(
          eq(projectSecretsTable.projectId, projectId),
          eq(projectSecretsTable.key, key),
          eq(projectSecretsTable.environment, env)
        ));
    }
    imported++;
  }

  res.json({ imported, environment: env });
});

router.post("/projects/:id/secrets/copy", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { from, to } = req.body;

  if (!from || !to || from === to) {
    res.status(400).json({ error: "from and to environments are required and must differ" }); return;
  }

  if (!VALID_ENVS.includes(from) || !VALID_ENVS.includes(to)) {
    res.status(400).json({ error: "environment must be 'development' or 'production'" }); return;
  }

  const sourceSecrets = await db.select().from(projectSecretsTable)
    .where(and(eq(projectSecretsTable.projectId, projectId), eq(projectSecretsTable.environment, from)));

  let copied = 0;
  for (const secret of sourceSecrets) {
    const [inserted] = await db.insert(projectSecretsTable).values({
      projectId, key: secret.key, encryptedValue: secret.encryptedValue, environment: to,
    }).onConflictDoNothing().returning();
    if (!inserted) {
      await db.update(projectSecretsTable)
        .set({ encryptedValue: secret.encryptedValue })
        .where(and(
          eq(projectSecretsTable.projectId, projectId),
          eq(projectSecretsTable.key, secret.key),
          eq(projectSecretsTable.environment, to)
        ));
    }
    copied++;
  }

  res.json({ copied, from, to });
});

router.get("/projects/:id/secrets/export", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const env = (req.query.environment as string) || "development";

  const secrets = await db.select().from(projectSecretsTable)
    .where(and(eq(projectSecretsTable.projectId, projectId), eq(projectSecretsTable.environment, env)));

  const lines = secrets.map(s => `${s.key}=${decryptSecret(s.encryptedValue)}`);
  res.type("text/plain").send(lines.join("\n"));
});

router.delete("/projects/:projectId/secrets/:secretId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const secretId = Array.isArray(req.params.secretId) ? req.params.secretId[0] : req.params.secretId;
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  await db.delete(projectSecretsTable)
    .where(and(eq(projectSecretsTable.id, secretId), eq(projectSecretsTable.projectId, projectId)));

  res.sendStatus(204);
});

export default router;
