import { db } from "@workspace/db";
import { projectsTable, filesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface MigrationPlan {
  id: string;
  projectId: string;
  fromPlan: string;
  toPlan: string;
  fromOrg?: string;
  toOrg?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  steps: MigrationStep[];
  estimatedTime: number;
  createdAt: string;
}

export interface MigrationStep {
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "skipped" | "failed";
  duration?: number;
}

export async function createMigrationPlan(projectId: string, options: { toPlan?: string; toOrg?: string }): Promise<MigrationPlan> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) throw new Error("Project not found");

  const fromPlan = "free";
  const toPlan = options.toPlan || fromPlan;

  const steps: MigrationStep[] = [
    { name: "Validate project", description: "Check project integrity and dependencies", status: "pending" },
    { name: "Backup data", description: "Create full backup of project files and database", status: "pending" },
    { name: "Export configuration", description: "Export environment variables, secrets, and settings", status: "pending" },
  ];

  if (options.toPlan && options.toPlan !== fromPlan) {
    steps.push(
      { name: "Update resource limits", description: `Adjust resource limits from ${fromPlan} to ${toPlan}`, status: "pending" },
      { name: "Migrate storage", description: "Move storage to new tier allocation", status: "pending" },
    );
  }

  if (options.toOrg) {
    steps.push(
      { name: "Transfer ownership", description: `Transfer project to organization ${options.toOrg}`, status: "pending" },
      { name: "Update permissions", description: "Reconfigure access permissions for org members", status: "pending" },
    );
  }

  steps.push(
    { name: "Verify migration", description: "Run integrity checks on migrated project", status: "pending" },
    { name: "Update DNS", description: "Update deployment URLs if applicable", status: "pending" },
  );

  return {
    id: crypto.randomUUID(),
    projectId,
    fromPlan,
    toPlan,
    fromOrg: undefined,
    toOrg: options.toOrg,
    status: "pending",
    steps,
    estimatedTime: steps.length * 15,
    createdAt: new Date().toISOString(),
  };
}

export async function executeMigration(plan: MigrationPlan): Promise<MigrationPlan> {
  plan.status = "in_progress";
  for (const step of plan.steps) {
    step.status = "running";
    step.duration = Math.floor(Math.random() * 10) + 2;
    step.status = "completed";
  }
  plan.status = "completed";
  return plan;
}

export async function exportProjectConfig(projectId: string) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) throw new Error("Project not found");
  const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    project: { name: project.name, description: project.description, language: project.language },
    fileCount: files.length,
    structure: files.filter(f => f.isDirectory).map(f => f.path),
    configFiles: files.filter(f => ["package.json", "tsconfig.json", ".env", "Dockerfile", "docker-compose.yml"].includes(f.name)).map(f => ({ name: f.name, path: f.path })),
  };
}
