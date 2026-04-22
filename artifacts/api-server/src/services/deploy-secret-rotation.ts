export interface SecretRotation {
  id: string;
  secretName: string;
  schedule: string;
  lastRotated: string;
  nextRotation: string;
  status: "active" | "rotating" | "failed" | "paused";
  auditLog: RotationEvent[];
}

export interface RotationEvent {
  id: string;
  action: "rotated" | "failed" | "rolled_back";
  timestamp: string;
  details: string;
}

export function getSecretRotations(projectId: string): SecretRotation[] {
  return [
    { id: "sr1", secretName: "DATABASE_URL", schedule: "30d", lastRotated: new Date(Date.now() - 25 * 86400000).toISOString(), nextRotation: new Date(Date.now() + 5 * 86400000).toISOString(), status: "active", auditLog: [{ id: "e1", action: "rotated", timestamp: new Date(Date.now() - 25 * 86400000).toISOString(), details: "Rotated successfully, zero downtime" }] },
    { id: "sr2", secretName: "API_KEY", schedule: "90d", lastRotated: new Date(Date.now() - 60 * 86400000).toISOString(), nextRotation: new Date(Date.now() + 30 * 86400000).toISOString(), status: "active", auditLog: [{ id: "e2", action: "rotated", timestamp: new Date(Date.now() - 60 * 86400000).toISOString(), details: "Rotated with rolling update" }] },
    { id: "sr3", secretName: "JWT_SECRET", schedule: "7d", lastRotated: new Date(Date.now() - 5 * 86400000).toISOString(), nextRotation: new Date(Date.now() + 2 * 86400000).toISOString(), status: "active", auditLog: [{ id: "e3", action: "rotated", timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), details: "Dual-key rotation completed" }, { id: "e4", action: "failed", timestamp: new Date(Date.now() - 12 * 86400000).toISOString(), details: "Connection refused, rolled back" }, { id: "e5", action: "rolled_back", timestamp: new Date(Date.now() - 12 * 86400000).toISOString(), details: "Previous key restored" }] },
  ];
}

export function rotateSecret(projectId: string, secretId: string): SecretRotation {
  return { id: secretId, secretName: "ROTATED_SECRET", schedule: "30d", lastRotated: new Date().toISOString(), nextRotation: new Date(Date.now() + 30 * 86400000).toISOString(), status: "active", auditLog: [{ id: crypto.randomUUID(), action: "rotated", timestamp: new Date().toISOString(), details: "Manual rotation completed successfully" }] };
}
