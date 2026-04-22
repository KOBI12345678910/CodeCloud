export interface DepLicenseEntry {
  name: string;
  version: string;
  license: string;
  category: "permissive" | "copyleft" | "weak-copyleft" | "proprietary" | "unknown";
  compatible: boolean;
  riskLevel: "low" | "medium" | "high";
}

export interface LicenseReport {
  totalDeps: number;
  compatible: number;
  incompatible: number;
  highRisk: number;
  dependencies: DepLicenseEntry[];
  generatedAt: Date;
}

class DepLicenseService {
  private licenseMap: Record<string, { category: DepLicenseEntry["category"]; risk: DepLicenseEntry["riskLevel"] }> = {
    "MIT": { category: "permissive", risk: "low" }, "ISC": { category: "permissive", risk: "low" },
    "BSD-2-Clause": { category: "permissive", risk: "low" }, "BSD-3-Clause": { category: "permissive", risk: "low" },
    "Apache-2.0": { category: "permissive", risk: "low" }, "0BSD": { category: "permissive", risk: "low" },
    "GPL-2.0": { category: "copyleft", risk: "high" }, "GPL-3.0": { category: "copyleft", risk: "high" },
    "AGPL-3.0": { category: "copyleft", risk: "high" }, "LGPL-2.1": { category: "weak-copyleft", risk: "medium" },
    "LGPL-3.0": { category: "weak-copyleft", risk: "medium" }, "MPL-2.0": { category: "weak-copyleft", risk: "medium" },
  };

  check(deps: { name: string; version: string; license: string }[], isCommercial: boolean = true): LicenseReport {
    const entries: DepLicenseEntry[] = deps.map(d => {
      const info = this.licenseMap[d.license] || { category: "unknown" as const, risk: "medium" as const };
      const compatible = isCommercial ? info.category === "permissive" || info.category === "weak-copyleft" : true;
      return { ...d, category: info.category, compatible, riskLevel: info.risk };
    });
    return {
      totalDeps: entries.length, compatible: entries.filter(e => e.compatible).length,
      incompatible: entries.filter(e => !e.compatible).length,
      highRisk: entries.filter(e => e.riskLevel === "high").length,
      dependencies: entries, generatedAt: new Date(),
    };
  }
}

export const depLicenseService = new DepLicenseService();
