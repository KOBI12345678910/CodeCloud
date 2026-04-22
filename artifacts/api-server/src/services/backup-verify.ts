export interface BackupVerification {
  id: string;
  projectId: string;
  backupId: string;
  status: "pending" | "verifying" | "passed" | "failed";
  checksumMatch: boolean;
  restoreTestResult?: "success" | "failure" | "skipped";
  fileCount: number;
  totalSize: number;
  verifiedAt: string;
  duration: number;
  errors: string[];
}

export interface BackupComplianceReport {
  projectId: string;
  totalBackups: number;
  verifiedBackups: number;
  failedVerifications: number;
  lastVerifiedAt: string;
  retentionPolicy: { days: number; compliant: boolean };
  encryptionStatus: "encrypted" | "unencrypted";
  backupSchedule: { frequency: string; lastRun: string; nextRun: string };
  history: BackupVerification[];
}

export function verifyBackup(projectId: string, backupId: string): BackupVerification {
  const passed = Math.random() > 0.1;
  return {
    id: crypto.randomUUID(),
    projectId,
    backupId,
    status: passed ? "passed" : "failed",
    checksumMatch: passed,
    restoreTestResult: passed ? "success" : "failure",
    fileCount: Math.floor(Math.random() * 500) + 50,
    totalSize: Math.floor(Math.random() * 500000000) + 1000000,
    verifiedAt: new Date().toISOString(),
    duration: Math.floor(Math.random() * 120) + 10,
    errors: passed ? [] : ["Checksum mismatch on 2 files"],
  };
}

export function getComplianceReport(projectId: string): BackupComplianceReport {
  const history = Array.from({ length: 10 }, (_, i) => verifyBackup(projectId, `backup-${i + 1}`));
  return {
    projectId,
    totalBackups: 30,
    verifiedBackups: history.filter(h => h.status === "passed").length,
    failedVerifications: history.filter(h => h.status === "failed").length,
    lastVerifiedAt: new Date().toISOString(),
    retentionPolicy: { days: 30, compliant: true },
    encryptionStatus: "encrypted",
    backupSchedule: { frequency: "daily", lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 82800000).toISOString() },
    history,
  };
}
