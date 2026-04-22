export interface LicenseCheck {
  id: string;
  projectId: string;
  dependencies: DependencyLicense[];
  issues: LicenseIssue[];
  score: number;
  checkedAt: Date;
}

interface DependencyLicense {
  name: string;
  version: string;
  license: string;
  category: "permissive" | "copyleft" | "weak-copyleft" | "proprietary" | "unknown";
  compatible: boolean;
}

interface LicenseIssue {
  dependency: string;
  license: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
}

class LicenseComplianceService {
  private checks: LicenseCheck[] = [];

  private licenseCategories: Record<string, "permissive" | "copyleft" | "weak-copyleft" | "proprietary"> = {
    "MIT": "permissive", "Apache-2.0": "permissive", "BSD-2-Clause": "permissive",
    "BSD-3-Clause": "permissive", "ISC": "permissive", "0BSD": "permissive",
    "GPL-2.0": "copyleft", "GPL-3.0": "copyleft", "AGPL-3.0": "copyleft",
    "LGPL-2.1": "weak-copyleft", "LGPL-3.0": "weak-copyleft", "MPL-2.0": "weak-copyleft",
  };

  check(projectId: string, deps: { name: string; version: string; license: string }[], isCommercial: boolean): LicenseCheck {
    const dependencies: DependencyLicense[] = [];
    const issues: LicenseIssue[] = [];

    for (const dep of deps) {
      const category: string = this.licenseCategories[dep.license] || "unknown";
      const compatible = isCommercial ? category === "permissive" || category === "weak-copyleft" : true;
      dependencies.push({ ...dep, category: category as DependencyLicense["category"], compatible });

      if (!compatible && isCommercial) {
        issues.push({
          dependency: dep.name, license: dep.license,
          severity: category === "copyleft" ? "critical" : "high",
          reason: `${dep.license} is ${category} — incompatible with commercial use`,
        });
      }
      if (category === "unknown") {
        issues.push({
          dependency: dep.name, license: dep.license, severity: "medium",
          reason: "Unknown license — manual review required",
        });
      }
    }

    const compatible = dependencies.filter(d => d.compatible).length;
    const check: LicenseCheck = {
      id: `lc-${Date.now()}`, projectId, dependencies, issues,
      score: deps.length > 0 ? Math.round((compatible / deps.length) * 100) : 100,
      checkedAt: new Date(),
    };
    this.checks.push(check);
    return check;
  }

  list(projectId?: string): LicenseCheck[] {
    return projectId ? this.checks.filter(c => c.projectId === projectId) : this.checks;
  }

  getMatrix(): Record<string, Record<string, boolean>> {
    return {
      "MIT": { "MIT": true, "Apache-2.0": true, "GPL-3.0": true, "LGPL-3.0": true },
      "Apache-2.0": { "MIT": true, "Apache-2.0": true, "GPL-3.0": false, "LGPL-3.0": true },
      "GPL-3.0": { "MIT": true, "Apache-2.0": false, "GPL-3.0": true, "LGPL-3.0": true },
    };
  }
}

export const licenseComplianceService = new LicenseComplianceService();
