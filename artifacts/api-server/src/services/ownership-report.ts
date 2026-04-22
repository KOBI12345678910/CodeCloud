export interface OwnershipReport {
  projectId: string;
  generatedAt: string;
  summary: OwnershipSummary;
  owners: CodeOwner[];
  orphanedFiles: OrphanedFile[];
  busFactor: BusFactorAnalysis;
  knowledgeDistribution: KnowledgeDistribution[];
}

export interface OwnershipSummary {
  totalFiles: number;
  ownedFiles: number;
  orphanedFiles: number;
  contributors: number;
  avgFilesPerOwner: number;
  topContributor: string;
  topContributorPercent: number;
}

export interface CodeOwner {
  name: string;
  email: string;
  filesOwned: number;
  linesOwned: number;
  percentageOwned: number;
  areas: string[];
  lastActive: string;
  commitCount: number;
}

export interface OrphanedFile {
  path: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  loc: number;
  reason: string;
}

export interface BusFactorAnalysis {
  score: number;
  risk: "low" | "medium" | "high" | "critical";
  criticalAreas: { area: string; soleOwner: string; files: number }[];
  recommendations: string[];
}

export interface KnowledgeDistribution {
  area: string;
  files: number;
  contributors: { name: string; percentage: number }[];
  risk: "low" | "medium" | "high";
}

export class OwnershipReportService {
  async generateReport(projectId: string): Promise<OwnershipReport> {
    const owners: CodeOwner[] = [
      { name: "Sarah Chen", email: "sarah@codecloud.dev", filesOwned: 48, linesOwned: 12400, percentageOwned: 35.6, areas: ["api", "auth", "deployment"], lastActive: new Date(Date.now() - 3600000).toISOString(), commitCount: 342 },
      { name: "Alex Kim", email: "alex@codecloud.dev", filesOwned: 35, linesOwned: 9200, percentageOwned: 25.9, areas: ["frontend", "dashboard", "components"], lastActive: new Date(Date.now() - 7200000).toISOString(), commitCount: 278 },
      { name: "Mike Johnson", email: "mike@codecloud.dev", filesOwned: 28, linesOwned: 7800, percentageOwned: 20.7, areas: ["containers", "runtime", "monitoring"], lastActive: new Date(Date.now() - 14400000).toISOString(), commitCount: 195 },
      { name: "Emily Wong", email: "emily@codecloud.dev", filesOwned: 18, linesOwned: 4200, percentageOwned: 13.3, areas: ["auth", "integrations"], lastActive: new Date(Date.now() - 86400000).toISOString(), commitCount: 124 },
      { name: "David Park", email: "david@codecloud.dev", filesOwned: 6, linesOwned: 1800, percentageOwned: 4.5, areas: ["docs", "config"], lastActive: new Date(Date.now() - 86400000 * 15).toISOString(), commitCount: 45 },
    ];

    const orphanedFiles: OrphanedFile[] = [
      { path: "src/utils/legacy-auth.ts", lastModifiedBy: "Former Employee", lastModifiedAt: new Date(Date.now() - 86400000 * 120).toISOString(), loc: 340, reason: "Author left the team" },
      { path: "src/services/old-billing.ts", lastModifiedBy: "Former Employee", lastModifiedAt: new Date(Date.now() - 86400000 * 90).toISOString(), loc: 520, reason: "Author left the team" },
      { path: "src/lib/xml-parser.ts", lastModifiedBy: "David Park", lastModifiedAt: new Date(Date.now() - 86400000 * 60).toISOString(), loc: 180, reason: "No recent activity, possible dead code" },
      { path: "src/migrations/0001_initial.ts", lastModifiedBy: "Sarah Chen", lastModifiedAt: new Date(Date.now() - 86400000 * 200).toISOString(), loc: 95, reason: "Historical migration, never modified" },
    ];

    const knowledgeDistribution: KnowledgeDistribution[] = [
      { area: "Authentication", files: 12, contributors: [{ name: "Emily Wong", percentage: 60 }, { name: "Sarah Chen", percentage: 30 }, { name: "Alex Kim", percentage: 10 }], risk: "medium" },
      { area: "Deployment", files: 18, contributors: [{ name: "Sarah Chen", percentage: 75 }, { name: "Mike Johnson", percentage: 25 }], risk: "high" },
      { area: "Frontend UI", files: 35, contributors: [{ name: "Alex Kim", percentage: 55 }, { name: "Emily Wong", percentage: 25 }, { name: "Sarah Chen", percentage: 20 }], risk: "low" },
      { area: "Container Runtime", files: 15, contributors: [{ name: "Mike Johnson", percentage: 85 }, { name: "Sarah Chen", percentage: 15 }], risk: "high" },
      { area: "API Routes", files: 22, contributors: [{ name: "Sarah Chen", percentage: 45 }, { name: "Mike Johnson", percentage: 30 }, { name: "Emily Wong", percentage: 25 }], risk: "low" },
      { area: "Database", files: 8, contributors: [{ name: "Sarah Chen", percentage: 90 }, { name: "David Park", percentage: 10 }], risk: "high" },
    ];

    return {
      projectId, generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: 135, ownedFiles: 131, orphanedFiles: 4, contributors: 5,
        avgFilesPerOwner: 27, topContributor: "Sarah Chen", topContributorPercent: 35.6,
      },
      owners, orphanedFiles,
      busFactor: {
        score: 2.3, risk: "medium",
        criticalAreas: [
          { area: "Database", soleOwner: "Sarah Chen", files: 8 },
          { area: "Container Runtime", soleOwner: "Mike Johnson", files: 15 },
          { area: "Deployment", soleOwner: "Sarah Chen", files: 18 },
        ],
        recommendations: [
          "Cross-train team members on deployment infrastructure",
          "Pair program on container runtime changes to spread knowledge",
          "Assign database ownership buddy for Sarah Chen",
          "Review and reassign orphaned files from former employees",
          "Increase code review participation for high-risk areas",
        ],
      },
      knowledgeDistribution,
    };
  }
}

export const ownershipReportService = new OwnershipReportService();
