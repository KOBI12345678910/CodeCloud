import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "crypto";

interface SSHKey {
  id: string;
  name: string;
  key: string;
  fingerprint: string;
  createdAt: string;
}

export class SSHService {
  private activeConnections = new Map<string, { userId: string; projectId: string }>();

  async initialize(): Promise<void> {
    logger.info("SSH service initialized (simulated)");
  }

  async addSSHKey(userId: string, name: string, publicKey: string): Promise<SSHKey> {
    const fingerprint = this.getKeyFingerprint(publicKey);
    const keyEntry: SSHKey = {
      id: crypto.randomBytes(8).toString("hex"),
      name,
      key: publicKey.trim(),
      fingerprint,
      createdAt: new Date().toISOString(),
    };

    await db.execute(sql`
      UPDATE users SET
        ssh_public_keys = COALESCE(ssh_public_keys, '[]'::jsonb) || ${JSON.stringify(keyEntry)}::jsonb
      WHERE id = ${userId}
    `);

    logger.info(`SSH key added for user ${userId}: ${name} (${fingerprint})`);
    return keyEntry;
  }

  async removeSSHKey(userId: string, keyId: string): Promise<void> {
    const result = await db.execute(sql`SELECT ssh_public_keys FROM users WHERE id = ${userId}`);
    const keys: SSHKey[] = (result as any).rows?.[0]?.ssh_public_keys || [];
    const filtered = keys.filter((k) => k.id !== keyId);

    await db.execute(sql`
      UPDATE users SET ssh_public_keys = ${JSON.stringify(filtered)}::jsonb WHERE id = ${userId}
    `);
  }

  async getSSHKeys(userId: string): Promise<SSHKey[]> {
    const result = await db.execute(sql`SELECT ssh_public_keys FROM users WHERE id = ${userId}`);
    return ((result as any).rows?.[0]?.ssh_public_keys || []).map((k: SSHKey) => ({
      ...k,
      key: k.key.length > 60 ? k.key.substring(0, 40) + "..." + k.key.substring(k.key.length - 20) : k.key,
    }));
  }

  private getKeyFingerprint(publicKey: string): string {
    const keyData = Buffer.from(publicKey.split(" ")[1] || publicKey, "base64");
    return crypto.createHash("sha256").update(keyData).digest("hex").match(/.{2}/g)!.join(":");
  }

  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  getConnectionsForProject(projectId: string): number {
    return [...this.activeConnections.values()].filter((c) => c.projectId === projectId).length;
  }

  async shutdown(): Promise<void> {
    this.activeConnections.clear();
    logger.info("SSH service stopped");
  }
}

export const sshService = new SSHService();
