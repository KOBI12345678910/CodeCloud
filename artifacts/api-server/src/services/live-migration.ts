import crypto from "crypto";

export type MigrationPhase =
  | "initializing"
  | "snapshotting_memory"
  | "transferring_state"
  | "syncing_filesystem"
  | "reconnecting_network"
  | "verifying"
  | "completed"
  | "failed";

export interface MigrationJob {
  id: string;
  projectId: string;
  sourceHost: string;
  targetHost: string;
  phase: MigrationPhase;
  progress: number;
  memorySnapshotMb: number;
  filesTransferred: number;
  totalFiles: number;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  downtime: number;
}

const activeMigrations = new Map<string, MigrationJob>();

const HOSTS = [
  "us-east-1a.codecloud.io",
  "us-east-1b.codecloud.io",
  "us-west-2a.codecloud.io",
  "us-west-2b.codecloud.io",
  "eu-west-1a.codecloud.io",
  "eu-central-1a.codecloud.io",
  "ap-southeast-1a.codecloud.io",
];

const PHASE_SEQUENCE: MigrationPhase[] = [
  "initializing",
  "snapshotting_memory",
  "transferring_state",
  "syncing_filesystem",
  "reconnecting_network",
  "verifying",
  "completed",
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selectTargetHost(sourceHost: string): string {
  const candidates = HOSTS.filter((h) => h !== sourceHost);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function startMigration(projectId: string, preferredTarget?: string): MigrationJob {
  const existing = Array.from(activeMigrations.values()).find(
    (m) => m.projectId === projectId && m.phase !== "completed" && m.phase !== "failed"
  );
  if (existing) {
    throw new Error("A migration is already in progress for this project");
  }

  const sourceHost = HOSTS[Math.floor(Math.random() * HOSTS.length)];
  const targetHost = preferredTarget || selectTargetHost(sourceHost);
  const totalFiles = randomBetween(50, 500);

  const job: MigrationJob = {
    id: crypto.randomUUID(),
    projectId,
    sourceHost,
    targetHost,
    phase: "initializing",
    progress: 0,
    memorySnapshotMb: 0,
    filesTransferred: 0,
    totalFiles,
    startedAt: new Date(),
    completedAt: null,
    error: null,
    downtime: 0,
  };

  activeMigrations.set(job.id, job);
  simulateMigration(job);
  return job;
}

function simulateMigration(job: MigrationJob) {
  let phaseIndex = 0;
  const phaseTimings = [800, 1500, 2000, 2500, 1200, 1000, 0];

  function advancePhase() {
    if (phaseIndex >= PHASE_SEQUENCE.length - 1) {
      job.phase = "completed";
      job.progress = 100;
      job.completedAt = new Date();
      job.downtime = randomBetween(50, 200);
      job.filesTransferred = job.totalFiles;
      return;
    }

    job.phase = PHASE_SEQUENCE[phaseIndex];

    switch (job.phase) {
      case "initializing":
        job.progress = 5;
        break;
      case "snapshotting_memory":
        job.progress = 20;
        job.memorySnapshotMb = randomBetween(128, 1024);
        break;
      case "transferring_state":
        job.progress = 40;
        job.filesTransferred = Math.floor(job.totalFiles * 0.3);
        break;
      case "syncing_filesystem":
        job.progress = 65;
        job.filesTransferred = Math.floor(job.totalFiles * 0.8);
        break;
      case "reconnecting_network":
        job.progress = 85;
        job.filesTransferred = job.totalFiles;
        break;
      case "verifying":
        job.progress = 95;
        break;
    }

    phaseIndex++;
    setTimeout(advancePhase, phaseTimings[phaseIndex] || 1000);
  }

  setTimeout(advancePhase, 500);
}

export function getMigration(migrationId: string): MigrationJob | undefined {
  return activeMigrations.get(migrationId);
}

export function getProjectMigrations(projectId: string): MigrationJob[] {
  return Array.from(activeMigrations.values())
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function cancelMigration(migrationId: string): MigrationJob | undefined {
  const job = activeMigrations.get(migrationId);
  if (!job) return undefined;
  if (job.phase === "completed" || job.phase === "failed") return job;
  job.phase = "failed";
  job.error = "Migration cancelled by user";
  job.completedAt = new Date();
  return job;
}

export function getAvailableHosts(): string[] {
  return [...HOSTS];
}
