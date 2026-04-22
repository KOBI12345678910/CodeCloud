export interface Migration {
  id: string;
  version: number;
  name: string;
  sql: string;
  status: "pending" | "applied" | "rolled_back" | "failed";
  appliedAt?: string;
  duration?: number;
  changes: SchemaChange[];
}

export interface SchemaChange {
  type: "create_table" | "alter_table" | "add_column" | "drop_column" | "add_index" | "drop_index" | "modify_column";
  table: string;
  column?: string;
  detail: string;
}

export function detectSchemaChanges(projectId: string): SchemaChange[] {
  return [
    { type: "add_column", table: "users", column: "avatar_url", detail: "ADD COLUMN avatar_url VARCHAR(500)" },
    { type: "add_index", table: "projects", column: "slug", detail: "CREATE INDEX idx_projects_slug ON projects(slug)" },
    { type: "modify_column", table: "files", column: "content", detail: "ALTER COLUMN content TYPE TEXT" },
    { type: "create_table", table: "audit_logs", detail: "CREATE TABLE audit_logs (id SERIAL PRIMARY KEY, ...)" },
  ];
}

export function generateMigration(projectId: string, changes: SchemaChange[]): Migration {
  const sql = changes.map(c => {
    switch (c.type) {
      case "add_column": return `ALTER TABLE ${c.table} ${c.detail};`;
      case "add_index": return `${c.detail};`;
      case "modify_column": return `ALTER TABLE ${c.table} ${c.detail};`;
      case "create_table": return `${c.detail};`;
      default: return `-- ${c.type} on ${c.table}`;
    }
  }).join("\n");

  return { id: crypto.randomUUID(), version: Date.now(), name: `migration_${new Date().toISOString().replace(/[:.]/g, "_")}`, sql, status: "pending", changes };
}

export function applyMigration(migrationId: string): Migration {
  return { id: migrationId, version: Date.now(), name: "applied_migration", sql: "", status: "applied", appliedAt: new Date().toISOString(), duration: Math.floor(Math.random() * 5) + 1, changes: [] };
}

export function rollbackMigration(migrationId: string): Migration {
  return { id: migrationId, version: Date.now(), name: "rolled_back_migration", sql: "", status: "rolled_back", changes: [] };
}

export function getMigrationHistory(projectId: string): Migration[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `mig-${i + 1}`, version: Date.now() - (5 - i) * 86400000, name: `migration_${i + 1}`,
    sql: `ALTER TABLE example ADD COLUMN col_${i} VARCHAR(255);`, status: "applied" as const,
    appliedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(), duration: Math.floor(Math.random() * 3) + 1,
    changes: [{ type: "add_column" as const, table: "example", column: `col_${i}`, detail: `ADD COLUMN col_${i} VARCHAR(255)` }],
  }));
}
