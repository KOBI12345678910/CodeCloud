export interface VulnerableDep {
  name: string;
  currentVersion: string;
  patchedVersion: string;
  severity: "critical" | "high" | "medium" | "low";
  cveId: string;
  description: string;
}

export interface PatchResult {
  id: string;
  projectId: string;
  status: "pending" | "testing" | "ready" | "applied" | "failed";
  vulnerabilities: VulnerableDep[];
  prUrl?: string;
  testsPassed?: boolean;
  createdAt: string;
}

export function detectVulnerableDeps(deps: Record<string, string>): VulnerableDep[] {
  const knownVulns: Record<string, Omit<VulnerableDep, "name" | "currentVersion">> = {
    "lodash": { patchedVersion: "4.17.21", severity: "high", cveId: "CVE-2021-23337", description: "Prototype pollution in lodash" },
    "express": { patchedVersion: "4.19.2", severity: "medium", cveId: "CVE-2024-29041", description: "Open redirect vulnerability" },
    "axios": { patchedVersion: "1.6.5", severity: "high", cveId: "CVE-2023-45857", description: "CSRF token exposure" },
  };

  const vulns: VulnerableDep[] = [];
  for (const [name, version] of Object.entries(deps)) {
    if (knownVulns[name]) {
      vulns.push({ name, currentVersion: String(version).replace("^", "").replace("~", ""), ...knownVulns[name] });
    }
  }
  return vulns;
}

export function createPatchPR(projectId: string, vulns: VulnerableDep[]): PatchResult {
  return {
    id: crypto.randomUUID(),
    projectId,
    status: "ready",
    vulnerabilities: vulns,
    prUrl: `https://github.com/user/project/pull/${Math.floor(Math.random() * 100) + 1}`,
    testsPassed: true,
    createdAt: new Date().toISOString(),
  };
}
