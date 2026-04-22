export interface Vulnerability {
  id: string;
  package: string;
  severity: "critical" | "high" | "medium" | "low";
  currentVersion: string;
  fixedVersion: string;
  description: string;
  cve: string | null;
  autoFixAvailable: boolean;
}

export interface PatchResult {
  id: string;
  vulnerabilityId: string;
  status: "applied" | "failed" | "skipped";
  fromVersion: string;
  toVersion: string;
  appliedAt: Date;
  message: string;
}

class SecurityPatchingService {
  private vulnerabilities: Vulnerability[] = [];
  private patches: PatchResult[] = [];

  scan(deps: { name: string; version: string }[]): Vulnerability[] {
    this.vulnerabilities = deps.map(d => ({
      id: `vuln-${Math.random().toString(36).slice(2, 8)}`, package: d.name,
      severity: (["low", "medium", "high", "critical"] as const)[Math.floor(Math.random() * 4)],
      currentVersion: d.version,
      fixedVersion: d.version.replace(/\d+$/, (m) => String(parseInt(m) + 1)),
      description: `Security vulnerability in ${d.name}`, cve: `CVE-2024-${Math.floor(Math.random() * 9999)}`,
      autoFixAvailable: Math.random() > 0.3,
    })).filter(() => Math.random() > 0.7);
    return this.vulnerabilities;
  }

  applyPatch(vulnId: string): PatchResult {
    const vuln = this.vulnerabilities.find(v => v.id === vulnId);
    if (!vuln) throw new Error("Vulnerability not found");
    const result: PatchResult = {
      id: `patch-${Date.now()}`, vulnerabilityId: vulnId,
      status: vuln.autoFixAvailable ? "applied" : "skipped",
      fromVersion: vuln.currentVersion, toVersion: vuln.fixedVersion,
      appliedAt: new Date(), message: vuln.autoFixAvailable ? "Patch applied successfully" : "Manual fix required",
    };
    this.patches.push(result);
    return result;
  }

  applyAll(): PatchResult[] {
    return this.vulnerabilities.filter(v => v.autoFixAvailable).map(v => this.applyPatch(v.id));
  }

  getVulnerabilities(): Vulnerability[] { return this.vulnerabilities; }
  getPatches(): PatchResult[] { return this.patches; }
}

export const securityPatchingService = new SecurityPatchingService();
