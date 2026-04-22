export interface ComplianceReport {
  id: string;
  projectId: string;
  framework: "SOC2" | "GDPR" | "HIPAA";
  generatedAt: string;
  overallScore: number;
  status: "compliant" | "non_compliant" | "partial";
  sections: ComplianceSection[];
  evidence: EvidenceItem[];
}

export interface ComplianceSection {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "not_applicable";
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  id: string;
  name: string;
  status: "pass" | "fail" | "warning";
  detail: string;
  remediation?: string;
}

export interface EvidenceItem {
  id: string;
  name: string;
  type: "screenshot" | "log" | "config" | "report";
  collectedAt: string;
  sectionId: string;
}

const FRAMEWORKS: Record<string, { sections: { name: string; checks: string[] }[] }> = {
  SOC2: { sections: [
    { name: "Access Control", checks: ["MFA enabled for all users", "Role-based access control", "Password policy enforcement", "Session timeout configured"] },
    { name: "Data Encryption", checks: ["Data encrypted at rest", "TLS 1.3 for transit", "Key rotation policy", "Certificate management"] },
    { name: "Monitoring", checks: ["Audit logging enabled", "Intrusion detection", "Anomaly alerting", "Log retention policy"] },
    { name: "Availability", checks: ["Uptime SLA met", "Disaster recovery plan", "Backup verification", "Failover testing"] },
  ]},
  GDPR: { sections: [
    { name: "Data Processing", checks: ["Lawful basis documented", "Data processing agreements", "Privacy impact assessment", "Data minimization"] },
    { name: "Data Subject Rights", checks: ["Right to access", "Right to erasure", "Data portability", "Consent management"] },
    { name: "Security Measures", checks: ["Encryption standards", "Access controls", "Breach notification process", "DPO appointed"] },
  ]},
  HIPAA: { sections: [
    { name: "Administrative Safeguards", checks: ["Risk analysis completed", "Workforce training", "Contingency plan", "Business associate agreements"] },
    { name: "Technical Safeguards", checks: ["Access control mechanisms", "Audit controls", "Integrity controls", "Transmission security"] },
    { name: "Physical Safeguards", checks: ["Facility access controls", "Workstation security", "Device controls", "Media disposal"] },
  ]},
};

export function generateComplianceReport(projectId: string, framework: "SOC2" | "GDPR" | "HIPAA"): ComplianceReport {
  const fw = FRAMEWORKS[framework];
  const sections: ComplianceSection[] = fw.sections.map((s, si) => {
    const checks: ComplianceCheck[] = s.checks.map((c, ci) => {
      const r = Math.random();
      const status = r > 0.2 ? "pass" : r > 0.1 ? "warning" : "fail";
      return { id: `${si}-${ci}`, name: c, status: status as any, detail: status === "pass" ? "Requirement met" : status === "warning" ? "Needs attention" : "Non-compliant", remediation: status !== "pass" ? "Review and update configuration" : undefined };
    });
    const allPass = checks.every(c => c.status === "pass");
    const anyFail = checks.some(c => c.status === "fail");
    return { id: `s${si}`, name: s.name, description: `${framework} ${s.name} requirements`, status: allPass ? "pass" : anyFail ? "fail" : "warning", checks };
  });

  const totalChecks = sections.reduce((s, sec) => s + sec.checks.length, 0);
  const passedChecks = sections.reduce((s, sec) => s + sec.checks.filter(c => c.status === "pass").length, 0);
  const score = Math.round((passedChecks / totalChecks) * 100);

  return {
    id: crypto.randomUUID(), projectId, framework, generatedAt: new Date().toISOString(), overallScore: score,
    status: score >= 90 ? "compliant" : score >= 70 ? "partial" : "non_compliant",
    sections,
    evidence: sections.map((s, i) => ({ id: `e${i}`, name: `${s.name} evidence`, type: "config" as const, collectedAt: new Date().toISOString(), sectionId: s.id })),
  };
}
