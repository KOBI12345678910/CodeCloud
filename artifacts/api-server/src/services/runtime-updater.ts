export interface RuntimeVersion {
  id: string;
  runtime: string;
  currentVersion: string;
  availableVersions: AvailableVersion[];
  updatePolicy: UpdatePolicy;
  updateHistory: RuntimeUpdate[];
}

export interface AvailableVersion {
  version: string;
  releaseDate: string;
  eol: string | null;
  lts: boolean;
  compatible: boolean;
  breakingChanges: string[];
  securityFixes: number;
}

export interface UpdatePolicy {
  autoUpdate: boolean;
  allowMajor: boolean;
  stagedRollout: boolean;
  rolloutPercentages: number[];
  rollbackOnFailure: boolean;
  testBeforeRollout: boolean;
}

export interface RuntimeUpdate {
  id: string;
  fromVersion: string;
  toVersion: string;
  status: "pending" | "testing" | "rolling-out" | "completed" | "rolled-back" | "failed";
  stage: number;
  totalStages: number;
  startedAt: string;
  completedAt: string | null;
  rollbackReason: string | null;
  healthChecks: { stage: number; passed: boolean; errors: string[] }[];
}

const runtimes: RuntimeVersion[] = [
  {
    id: "rt1", runtime: "node", currentVersion: "20.11.0",
    availableVersions: [
      { version: "20.12.0", releaseDate: "2026-03-15", eol: null, lts: true, compatible: true, breakingChanges: [], securityFixes: 3 },
      { version: "22.0.0", releaseDate: "2026-04-01", eol: null, lts: false, compatible: false, breakingChanges: ["ESM-only by default", "Removed --experimental-modules flag", "Buffer.from() strict mode"], securityFixes: 0 },
      { version: "18.20.0", releaseDate: "2026-02-01", eol: "2025-04-30", lts: true, compatible: true, breakingChanges: [], securityFixes: 5 },
    ],
    updatePolicy: { autoUpdate: false, allowMajor: false, stagedRollout: true, rolloutPercentages: [10, 25, 50, 100], rollbackOnFailure: true, testBeforeRollout: true },
    updateHistory: [
      { id: "u1", fromVersion: "20.10.0", toVersion: "20.11.0", status: "completed", stage: 4, totalStages: 4, startedAt: new Date(Date.now() - 86400000 * 14).toISOString(), completedAt: new Date(Date.now() - 86400000 * 12).toISOString(), rollbackReason: null, healthChecks: [{ stage: 1, passed: true, errors: [] }, { stage: 2, passed: true, errors: [] }, { stage: 3, passed: true, errors: [] }, { stage: 4, passed: true, errors: [] }] },
      { id: "u2", fromVersion: "20.9.0", toVersion: "20.10.0", status: "completed", stage: 4, totalStages: 4, startedAt: new Date(Date.now() - 86400000 * 30).toISOString(), completedAt: new Date(Date.now() - 86400000 * 28).toISOString(), rollbackReason: null, healthChecks: [{ stage: 1, passed: true, errors: [] }, { stage: 2, passed: true, errors: [] }, { stage: 3, passed: true, errors: [] }, { stage: 4, passed: true, errors: [] }] },
    ],
  },
  {
    id: "rt2", runtime: "python", currentVersion: "3.12.2",
    availableVersions: [
      { version: "3.12.3", releaseDate: "2026-04-10", eol: null, lts: false, compatible: true, breakingChanges: [], securityFixes: 2 },
      { version: "3.13.0", releaseDate: "2026-10-01", eol: null, lts: false, compatible: false, breakingChanges: ["Removed deprecated asyncio APIs", "Type hint syntax changes"], securityFixes: 0 },
    ],
    updatePolicy: { autoUpdate: false, allowMajor: false, stagedRollout: true, rolloutPercentages: [10, 50, 100], rollbackOnFailure: true, testBeforeRollout: true },
    updateHistory: [],
  },
  {
    id: "rt3", runtime: "go", currentVersion: "1.22.1",
    availableVersions: [
      { version: "1.22.2", releaseDate: "2026-04-05", eol: null, lts: false, compatible: true, breakingChanges: [], securityFixes: 4 },
      { version: "1.23.0", releaseDate: "2026-08-01", eol: null, lts: false, compatible: true, breakingChanges: ["Iterator changes", "New range syntax"], securityFixes: 0 },
    ],
    updatePolicy: { autoUpdate: true, allowMajor: false, stagedRollout: true, rolloutPercentages: [25, 50, 100], rollbackOnFailure: true, testBeforeRollout: true },
    updateHistory: [
      { id: "u3", fromVersion: "1.22.0", toVersion: "1.22.1", status: "completed", stage: 3, totalStages: 3, startedAt: new Date(Date.now() - 86400000 * 7).toISOString(), completedAt: new Date(Date.now() - 86400000 * 5).toISOString(), rollbackReason: null, healthChecks: [{ stage: 1, passed: true, errors: [] }, { stage: 2, passed: true, errors: [] }, { stage: 3, passed: true, errors: [] }] },
    ],
  },
];

export class RuntimeUpdaterService {
  async listRuntimes(projectId: string): Promise<RuntimeVersion[]> {
    return runtimes;
  }

  async getRuntime(id: string): Promise<RuntimeVersion | undefined> {
    return runtimes.find(r => r.id === id);
  }

  async updatePolicy(id: string, policy: Partial<UpdatePolicy>): Promise<RuntimeVersion | null> {
    const rt = runtimes.find(r => r.id === id);
    if (!rt) return null;
    rt.updatePolicy = { ...rt.updatePolicy, ...policy };
    return rt;
  }

  async initiateUpdate(id: string, targetVersion: string): Promise<RuntimeUpdate | null> {
    const rt = runtimes.find(r => r.id === id);
    if (!rt) return null;
    const update: RuntimeUpdate = {
      id: `u${Date.now()}`, fromVersion: rt.currentVersion, toVersion: targetVersion,
      status: "testing", stage: 1, totalStages: rt.updatePolicy.rolloutPercentages.length,
      startedAt: new Date().toISOString(), completedAt: null, rollbackReason: null,
      healthChecks: [{ stage: 1, passed: true, errors: [] }],
    };
    rt.updateHistory.unshift(update);
    return update;
  }

  async rollback(runtimeId: string, updateId: string, reason: string): Promise<RuntimeUpdate | null> {
    const rt = runtimes.find(r => r.id === runtimeId);
    if (!rt) return null;
    const update = rt.updateHistory.find(u => u.id === updateId);
    if (!update) return null;
    update.status = "rolled-back";
    update.completedAt = new Date().toISOString();
    update.rollbackReason = reason;
    return update;
  }

  async checkCompatibility(runtimeId: string, targetVersion: string): Promise<{ compatible: boolean; issues: string[] }> {
    const rt = runtimes.find(r => r.id === runtimeId);
    if (!rt) return { compatible: false, issues: ["Runtime not found"] };
    const v = rt.availableVersions.find(av => av.version === targetVersion);
    if (!v) return { compatible: false, issues: ["Version not found"] };
    return { compatible: v.compatible, issues: v.breakingChanges };
  }
}

export const runtimeUpdaterService = new RuntimeUpdaterService();
