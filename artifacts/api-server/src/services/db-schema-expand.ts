export interface SchemaTable {
  name: string;
  columns: { name: string; type: string; nullable: boolean; defaultValue: string | null; primaryKey: boolean; unique: boolean; references: { table: string; column: string } | null }[];
  indexes: { name: string; columns: string[]; unique: boolean }[];
}

export interface SchemaMigration {
  id: string;
  name: string;
  sql: string;
  status: "pending" | "applied" | "failed";
  appliedAt: Date | null;
}

class DbSchemaExpandService {
  private tables: Map<string, SchemaTable> = new Map();
  private migrations: SchemaMigration[] = [];

  constructor() {
    const defaultTables: SchemaTable[] = [
      { name: "users", columns: [
        { name: "id", type: "serial", nullable: false, defaultValue: null, primaryKey: true, unique: true, references: null },
        { name: "clerk_id", type: "varchar(255)", nullable: false, defaultValue: null, primaryKey: false, unique: true, references: null },
        { name: "email", type: "varchar(255)", nullable: false, defaultValue: null, primaryKey: false, unique: true, references: null },
        { name: "username", type: "varchar(100)", nullable: false, defaultValue: null, primaryKey: false, unique: true, references: null },
        { name: "plan", type: "varchar(20)", nullable: false, defaultValue: "'free'", primaryKey: false, unique: false, references: null },
        { name: "avatar_url", type: "text", nullable: true, defaultValue: null, primaryKey: false, unique: false, references: null },
        { name: "created_at", type: "timestamp", nullable: false, defaultValue: "now()", primaryKey: false, unique: false, references: null },
      ], indexes: [{ name: "idx_users_clerk_id", columns: ["clerk_id"], unique: true }] },
      { name: "projects", columns: [
        { name: "id", type: "serial", nullable: false, defaultValue: null, primaryKey: true, unique: true, references: null },
        { name: "name", type: "varchar(255)", nullable: false, defaultValue: null, primaryKey: false, unique: false, references: null },
        { name: "owner_id", type: "integer", nullable: false, defaultValue: null, primaryKey: false, unique: false, references: { table: "users", column: "id" } },
        { name: "language", type: "varchar(50)", nullable: false, defaultValue: "'javascript'", primaryKey: false, unique: false, references: null },
        { name: "visibility", type: "varchar(20)", nullable: false, defaultValue: "'private'", primaryKey: false, unique: false, references: null },
        { name: "created_at", type: "timestamp", nullable: false, defaultValue: "now()", primaryKey: false, unique: false, references: null },
      ], indexes: [{ name: "idx_projects_owner", columns: ["owner_id"], unique: false }] },
    ];
    for (const t of defaultTables) this.tables.set(t.name, t);
  }

  getTables(): SchemaTable[] { return Array.from(this.tables.values()); }
  getTable(name: string): SchemaTable | null { return this.tables.get(name) || null; }

  generateMigration(name: string, changes: { addTable?: SchemaTable; addColumn?: { table: string; column: SchemaTable["columns"][0] }; dropColumn?: { table: string; column: string } }): SchemaMigration {
    let sql = "";
    if (changes.addTable) {
      const t = changes.addTable;
      sql = `CREATE TABLE ${t.name} (\n${t.columns.map(c => `  ${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${c.nullable ? "" : " NOT NULL"}${c.defaultValue ? ` DEFAULT ${c.defaultValue}` : ""}`).join(",\n")}\n);`;
      this.tables.set(t.name, t);
    }
    if (changes.addColumn) {
      const { table, column } = changes.addColumn;
      sql = `ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.type}${column.nullable ? "" : " NOT NULL"}${column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ""};`;
      const t = this.tables.get(table);
      if (t) t.columns.push(column);
    }
    if (changes.dropColumn) {
      sql = `ALTER TABLE ${changes.dropColumn.table} DROP COLUMN ${changes.dropColumn.column};`;
    }
    const migration: SchemaMigration = { id: `mig-${Date.now()}`, name, sql, status: "pending", appliedAt: null };
    this.migrations.push(migration);
    return migration;
  }

  applyMigration(id: string): SchemaMigration | null {
    const m = this.migrations.find(m => m.id === id); if (!m) return null;
    m.status = "applied"; m.appliedAt = new Date();
    return m;
  }

  getMigrations(): SchemaMigration[] { return this.migrations; }
  getSchemaSQL(): string { return Array.from(this.tables.values()).map(t => `CREATE TABLE ${t.name} (\n${t.columns.map(c => `  ${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${c.nullable ? "" : " NOT NULL"}`).join(",\n")}\n);`).join("\n\n"); }
}

export const dbSchemaExpandService = new DbSchemaExpandService();
