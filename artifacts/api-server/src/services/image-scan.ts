export interface Vulnerability {
  id: string;
  cveId: string;
  severity: "critical" | "high" | "medium" | "low";
  package: string;
  currentVersion: string;
  fixedVersion: string;
  description: string;
  publishedDate: string;
}

export interface ScanResult {
  id: string;
  imageName: string;
  imageTag: string;
  scanDate: string;
  status: "clean" | "vulnerabilities_found";
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities: Vulnerability[];
  blockDeploy: boolean;
}

export function scanImage(imageName: string, tag = "latest"): ScanResult {
  const vulns: Vulnerability[] = [
    { id: "1", cveId: "CVE-2024-1234", severity: "critical", package: "openssl", currentVersion: "1.1.1t", fixedVersion: "1.1.1u", description: "Buffer overflow in SSL handshake", publishedDate: "2024-03-15" },
    { id: "2", cveId: "CVE-2024-5678", severity: "high", package: "libcurl", currentVersion: "7.88.0", fixedVersion: "7.88.1", description: "HTTPS certificate validation bypass", publishedDate: "2024-04-01" },
    { id: "3", cveId: "CVE-2024-9012", severity: "medium", package: "zlib", currentVersion: "1.2.13", fixedVersion: "1.2.14", description: "Memory corruption in inflate", publishedDate: "2024-02-20" },
    { id: "4", cveId: "CVE-2024-3456", severity: "low", package: "bash", currentVersion: "5.2.15", fixedVersion: "5.2.16", description: "Minor input sanitization issue", publishedDate: "2024-01-10" },
  ];

  const selected = vulns.filter(() => Math.random() > 0.3);
  const critical = selected.filter(v => v.severity === "critical").length;
  const high = selected.filter(v => v.severity === "high").length;

  return {
    id: crypto.randomUUID(),
    imageName,
    imageTag: tag,
    scanDate: new Date().toISOString(),
    status: selected.length > 0 ? "vulnerabilities_found" : "clean",
    totalVulnerabilities: selected.length,
    critical, high,
    medium: selected.filter(v => v.severity === "medium").length,
    low: selected.filter(v => v.severity === "low").length,
    vulnerabilities: selected,
    blockDeploy: critical > 0 || high > 1,
  };
}
