export interface ImageVulnerability {
  id: string;
  imageId: string;
  package: string;
  version: string;
  severity: "critical" | "high" | "medium" | "low" | "negligible";
  title: string;
  description: string;
  fixedVersion: string | null;
  cve: string;
  publishedAt: Date;
}

export interface ScanResult {
  imageId: string;
  imageName: string;
  scannedAt: Date;
  vulnerabilities: ImageVulnerability[];
  summary: Record<string, number>;
  riskScore: number;
}

class VulnScanService {
  private scans: Map<string, ScanResult> = new Map();

  scan(imageId: string, imageName: string): ScanResult {
    const vulns: ImageVulnerability[] = [];
    const severities: ImageVulnerability["severity"][] = ["critical", "high", "medium", "low", "negligible"];
    const count = Math.floor(Math.random() * 15) + 3;
    for (let i = 0; i < count; i++) {
      const sev = severities[Math.floor(Math.random() * severities.length)];
      vulns.push({
        id: `v-${i}`, imageId, package: `lib-${Math.random().toString(36).slice(2, 6)}`,
        version: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
        severity: sev, title: `Vulnerability in package`, description: `A ${sev} vulnerability was found`,
        fixedVersion: Math.random() > 0.3 ? "latest" : null, cve: `CVE-2024-${1000 + i}`, publishedAt: new Date(),
      });
    }
    const summary: Record<string, number> = {};
    for (const v of vulns) summary[v.severity] = (summary[v.severity] || 0) + 1;
    const weights: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1, negligible: 0 };
    const riskScore = Math.min(100, vulns.reduce((s, v) => s + (weights[v.severity] || 0), 0));
    const result: ScanResult = { imageId, imageName, scannedAt: new Date(), vulnerabilities: vulns, summary, riskScore };
    this.scans.set(imageId, result);
    return result;
  }

  getResult(imageId: string): ScanResult | null { return this.scans.get(imageId) || null; }
  listScans(): ScanResult[] { return Array.from(this.scans.values()); }
}

export const vulnScanService = new VulnScanService();
