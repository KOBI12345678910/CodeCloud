export interface TableInfo {
  name: string;
  columns: { name: string; type: string; nullable: boolean; primaryKey: boolean }[];
  rowCount: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  duration: number;
}

class DbBrowserService {
  private tables: Map<string, TableInfo> = new Map();

  registerTable(table: TableInfo): void { this.tables.set(table.name, table); }
  getTables(): TableInfo[] { return Array.from(this.tables.values()); }
  getTable(name: string): TableInfo | null { return this.tables.get(name) || null; }

  executeQuery(sql: string): QueryResult {
    const start = Date.now();
    const lowerSql = sql.toLowerCase().trim();
    if (!lowerSql.startsWith("select")) {
      return { columns: ["result"], rows: [{ result: "Write queries are disabled in browser mode" }], rowCount: 0, duration: Date.now() - start };
    }
    return {
      columns: ["id", "name", "created_at"],
      rows: [{ id: 1, name: "sample", created_at: new Date().toISOString() }],
      rowCount: 1, duration: Date.now() - start,
    };
  }

  getSchemaSQL(): string {
    return Array.from(this.tables.values()).map(t =>
      `CREATE TABLE ${t.name} (\n${t.columns.map(c => `  ${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${c.nullable ? "" : " NOT NULL"}`).join(",\n")}\n);`
    ).join("\n\n");
  }
}

export const dbBrowserService = new DbBrowserService();
