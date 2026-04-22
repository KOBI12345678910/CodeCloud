export interface ContainerSecret {
  id: string;
  containerId: string;
  key: string;
  value: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  rotateAt: Date | null;
  masked: boolean;
}

export interface SecretAuditEntry {
  id: string;
  secretId: string;
  action: "created" | "read" | "updated" | "rotated" | "deleted";
  actor: string;
  timestamp: Date;
  ip: string;
  details: string;
}

class SecretInjectionService {
  private secrets: Map<string, ContainerSecret> = new Map();
  private auditLog: SecretAuditEntry[] = [];

  inject(containerId: string, key: string, value: string, actor: string): ContainerSecret {
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const secret: ContainerSecret = {
      id, containerId, key, value, version: 1,
      createdAt: new Date(), updatedAt: new Date(),
      rotateAt: null, masked: true,
    };
    this.secrets.set(id, secret);
    this.audit(id, "created", actor, "", `Injected secret ${key}`);
    return { ...secret, value: this.mask(value) };
  }

  getSecrets(containerId: string): Omit<ContainerSecret, "value">[] {
    return Array.from(this.secrets.values())
      .filter(s => s.containerId === containerId)
      .map(({ value, ...rest }) => rest);
  }

  rotate(secretId: string, newValue: string, actor: string): ContainerSecret | null {
    const secret = this.secrets.get(secretId);
    if (!secret) return null;
    secret.value = newValue;
    secret.version++;
    secret.updatedAt = new Date();
    secret.rotateAt = null;
    this.audit(secretId, "rotated", actor, "", `Rotated to version ${secret.version}`);
    return { ...secret, value: this.mask(newValue) };
  }

  delete(secretId: string, actor: string): boolean {
    const secret = this.secrets.get(secretId);
    if (!secret) return false;
    this.audit(secretId, "deleted", actor, "", `Deleted secret ${secret.key}`);
    this.secrets.delete(secretId);
    return true;
  }

  maskInLogs(log: string, containerId: string): string {
    let masked = log;
    for (const secret of this.secrets.values()) {
      if (secret.containerId === containerId && secret.masked) {
        masked = masked.replaceAll(secret.value, "***REDACTED***");
      }
    }
    return masked;
  }

  getAuditLog(secretId?: string, limit = 50): SecretAuditEntry[] {
    let entries = [...this.auditLog];
    if (secretId) entries = entries.filter(e => e.secretId === secretId);
    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  private audit(secretId: string, action: SecretAuditEntry["action"], actor: string, ip: string, details: string): void {
    this.auditLog.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      secretId, action, actor, timestamp: new Date(), ip, details,
    });
  }

  private mask(value: string): string {
    if (value.length <= 4) return "****";
    return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
  }
}

export const secretInjectionService = new SecretInjectionService();
