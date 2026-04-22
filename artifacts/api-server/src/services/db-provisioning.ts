export type DbEngine = "postgresql" | "mysql" | "mongodb";
export type ProvisionStatus = "pending" | "provisioning" | "ready" | "failed" | "deprovisioning" | "deleted";

export interface ProvisionedDatabase {
  id: string;
  projectId: string;
  deploymentId: string;
  engine: DbEngine;
  version: string;
  host: string;
  port: number;
  name: string;
  username: string;
  connectionString: string;
  status: ProvisionStatus;
  sizeBytes: number;
  maxSizeBytes: number;
  backups: DatabaseBackup[];
  migrations: MigrationRun[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseBackup {
  id: string;
  databaseId: string;
  type: "auto" | "manual" | "pre-deploy";
  sizeBytes: number;
  status: "in-progress" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  expiresAt: string;
}

export interface MigrationRun {
  id: string;
  databaseId: string;
  version: string;
  name: string;
  direction: "up" | "down";
  status: "pending" | "running" | "completed" | "failed";
  executedAt: string;
  durationMs: number;
  error: string | null;
}

const databases: ProvisionedDatabase[] = [
  {
    id: "db1", projectId: "p1", deploymentId: "dep-prod-1", engine: "postgresql", version: "15.4",
    host: "db-prod-abc123.internal", port: 5432, name: "app_production", username: "app_user",
    connectionString: "postgresql://app_user:***@db-prod-abc123.internal:5432/app_production",
    status: "ready", sizeBytes: 524288000, maxSizeBytes: 10737418240,
    backups: [
      { id: "bk1", databaseId: "db1", type: "pre-deploy", sizeBytes: 512000000, status: "completed", startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3540000).toISOString(), expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
      { id: "bk2", databaseId: "db1", type: "auto", sizeBytes: 510000000, status: "completed", startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86340000).toISOString(), expiresAt: new Date(Date.now() + 86400000 * 7).toISOString() },
    ],
    migrations: [
      { id: "m1", databaseId: "db1", version: "001", name: "create_users_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 30).toISOString(), durationMs: 245, error: null },
      { id: "m2", databaseId: "db1", version: "002", name: "add_projects_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 25).toISOString(), durationMs: 312, error: null },
      { id: "m3", databaseId: "db1", version: "003", name: "add_deployments_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 10).toISOString(), durationMs: 189, error: null },
    ],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "db2", projectId: "p1", deploymentId: "dep-staging-1", engine: "postgresql", version: "15.4",
    host: "db-staging-def456.internal", port: 5432, name: "app_staging", username: "app_user",
    connectionString: "postgresql://app_user:***@db-staging-def456.internal:5432/app_staging",
    status: "ready", sizeBytes: 104857600, maxSizeBytes: 5368709120,
    backups: [
      { id: "bk3", databaseId: "db2", type: "auto", sizeBytes: 100000000, status: "completed", startedAt: new Date(Date.now() - 43200000).toISOString(), completedAt: new Date(Date.now() - 43140000).toISOString(), expiresAt: new Date(Date.now() + 86400000 * 7).toISOString() },
    ],
    migrations: [
      { id: "m4", databaseId: "db2", version: "001", name: "create_users_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 20).toISOString(), durationMs: 198, error: null },
      { id: "m5", databaseId: "db2", version: "002", name: "add_projects_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 15).toISOString(), durationMs: 267, error: null },
      { id: "m6", databaseId: "db2", version: "003", name: "add_deployments_table", direction: "up", status: "completed", executedAt: new Date(Date.now() - 86400000 * 5).toISOString(), durationMs: 145, error: null },
      { id: "m7", databaseId: "db2", version: "004", name: "add_billing_columns", direction: "up", status: "pending", executedAt: new Date().toISOString(), durationMs: 0, error: null },
    ],
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(), updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "db3", projectId: "p1", deploymentId: "dep-prod-2", engine: "mongodb", version: "7.0",
    host: "mongo-prod-ghi789.internal", port: 27017, name: "app_analytics", username: "analytics_user",
    connectionString: "mongodb://analytics_user:***@mongo-prod-ghi789.internal:27017/app_analytics",
    status: "ready", sizeBytes: 2147483648, maxSizeBytes: 21474836480,
    backups: [
      { id: "bk4", databaseId: "db3", type: "auto", sizeBytes: 2100000000, status: "completed", startedAt: new Date(Date.now() - 21600000).toISOString(), completedAt: new Date(Date.now() - 21300000).toISOString(), expiresAt: new Date(Date.now() + 86400000 * 14).toISOString() },
    ],
    migrations: [],
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(), updatedAt: new Date(Date.now() - 21600000).toISOString(),
  },
];

export class DbProvisioningService {
  async listDatabases(projectId: string): Promise<ProvisionedDatabase[]> {
    return databases.filter(d => d.projectId === projectId || d.projectId === "p1");
  }

  async getDatabase(id: string): Promise<ProvisionedDatabase | undefined> {
    return databases.find(d => d.id === id);
  }

  async provision(projectId: string, opts: { engine: DbEngine; version?: string; deploymentId: string; name?: string }): Promise<ProvisionedDatabase> {
    const defaults: Record<DbEngine, { port: number; version: string }> = {
      postgresql: { port: 5432, version: "15.4" },
      mysql: { port: 3306, version: "8.0" },
      mongodb: { port: 27017, version: "7.0" },
    };
    const def = defaults[opts.engine];
    const id = `db${Date.now()}`;
    const host = `${opts.engine.slice(0, 5)}-${id}.internal`;
    const name = opts.name || `app_${opts.deploymentId.replace(/-/g, "_")}`;
    const username = "app_user";
    const prefix = opts.engine === "mongodb" ? "mongodb" : opts.engine === "mysql" ? "mysql" : "postgresql";
    const db: ProvisionedDatabase = {
      id, projectId, deploymentId: opts.deploymentId, engine: opts.engine,
      version: opts.version || def.version, host, port: def.port, name, username,
      connectionString: `${prefix}://${username}:***@${host}:${def.port}/${name}`,
      status: "ready", sizeBytes: 0, maxSizeBytes: 10737418240,
      backups: [], migrations: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    databases.push(db);
    return db;
  }

  async deprovision(id: string): Promise<boolean> {
    const db = databases.find(d => d.id === id);
    if (!db) return false;
    db.status = "deleted";
    db.updatedAt = new Date().toISOString();
    return true;
  }

  async createBackup(databaseId: string, type: "manual" | "pre-deploy"): Promise<DatabaseBackup | null> {
    const db = databases.find(d => d.id === databaseId);
    if (!db) return null;
    const backup: DatabaseBackup = {
      id: `bk${Date.now()}`, databaseId, type, sizeBytes: db.sizeBytes,
      status: "completed", startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * (type === "pre-deploy" ? 30 : 7)).toISOString(),
    };
    db.backups.push(backup);
    return backup;
  }

  async runMigration(databaseId: string, version: string, name: string, direction: "up" | "down"): Promise<MigrationRun | null> {
    const db = databases.find(d => d.id === databaseId);
    if (!db) return null;
    const migration: MigrationRun = {
      id: `m${Date.now()}`, databaseId, version, name, direction,
      status: "completed", executedAt: new Date().toISOString(),
      durationMs: Math.floor(Math.random() * 500) + 100, error: null,
    };
    db.migrations.push(migration);
    db.updatedAt = new Date().toISOString();
    return migration;
  }

  async getConnectionString(id: string): Promise<{ connectionString: string; envVars: Record<string, string> } | null> {
    const db = databases.find(d => d.id === id);
    if (!db) return null;
    const envPrefix = db.engine === "mongodb" ? "MONGO" : db.engine === "mysql" ? "MYSQL" : "DATABASE";
    return {
      connectionString: db.connectionString,
      envVars: {
        [`${envPrefix}_URL`]: db.connectionString,
        [`${envPrefix}_HOST`]: db.host,
        [`${envPrefix}_PORT`]: String(db.port),
        [`${envPrefix}_NAME`]: db.name,
        [`${envPrefix}_USER`]: db.username,
      },
    };
  }
}

export const dbProvisioningService = new DbProvisioningService();
