export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimary: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

const DEMO_TABLES: TableInfo[] = [
  {
    name: "users",
    schema: "public",
    rowCount: 1247,
    columns: [
      { name: "id", type: "serial", nullable: false, defaultValue: "nextval('users_id_seq')", isPrimary: true },
      { name: "username", type: "varchar(50)", nullable: false, defaultValue: null, isPrimary: false },
      { name: "email", type: "varchar(255)", nullable: false, defaultValue: null, isPrimary: false },
      { name: "created_at", type: "timestamp", nullable: false, defaultValue: "now()", isPrimary: false },
      { name: "plan", type: "varchar(20)", nullable: false, defaultValue: "'free'", isPrimary: false },
    ],
  },
  {
    name: "projects",
    schema: "public",
    rowCount: 3891,
    columns: [
      { name: "id", type: "serial", nullable: false, defaultValue: "nextval('projects_id_seq')", isPrimary: true },
      { name: "name", type: "varchar(100)", nullable: false, defaultValue: null, isPrimary: false },
      { name: "user_id", type: "integer", nullable: false, defaultValue: null, isPrimary: false },
      { name: "language", type: "varchar(30)", nullable: true, defaultValue: null, isPrimary: false },
      { name: "is_public", type: "boolean", nullable: false, defaultValue: "true", isPrimary: false },
      { name: "created_at", type: "timestamp", nullable: false, defaultValue: "now()", isPrimary: false },
    ],
  },
  {
    name: "files",
    schema: "public",
    rowCount: 28450,
    columns: [
      { name: "id", type: "serial", nullable: false, defaultValue: "nextval('files_id_seq')", isPrimary: true },
      { name: "project_id", type: "integer", nullable: false, defaultValue: null, isPrimary: false },
      { name: "path", type: "varchar(500)", nullable: false, defaultValue: null, isPrimary: false },
      { name: "content", type: "text", nullable: true, defaultValue: null, isPrimary: false },
      { name: "size", type: "integer", nullable: false, defaultValue: "0", isPrimary: false },
    ],
  },
  {
    name: "sessions",
    schema: "public",
    rowCount: 562,
    columns: [
      { name: "id", type: "varchar(36)", nullable: false, defaultValue: "gen_random_uuid()", isPrimary: true },
      { name: "user_id", type: "integer", nullable: false, defaultValue: null, isPrimary: false },
      { name: "expires_at", type: "timestamp", nullable: false, defaultValue: null, isPrimary: false },
    ],
  },
  {
    name: "deployments",
    schema: "public",
    rowCount: 890,
    columns: [
      { name: "id", type: "serial", nullable: false, defaultValue: "nextval('deployments_id_seq')", isPrimary: true },
      { name: "project_id", type: "integer", nullable: false, defaultValue: null, isPrimary: false },
      { name: "status", type: "varchar(20)", nullable: false, defaultValue: "'pending'", isPrimary: false },
      { name: "url", type: "varchar(255)", nullable: true, defaultValue: null, isPrimary: false },
      { name: "created_at", type: "timestamp", nullable: false, defaultValue: "now()", isPrimary: false },
    ],
  },
];

const DEMO_ROWS: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: 1, username: "alice", email: "alice@example.com", created_at: "2025-01-15T10:30:00Z", plan: "pro" },
    { id: 2, username: "bob", email: "bob@example.com", created_at: "2025-02-20T14:15:00Z", plan: "free" },
    { id: 3, username: "carol", email: "carol@dev.io", created_at: "2025-03-10T09:00:00Z", plan: "team" },
    { id: 4, username: "dave", email: "dave@startup.co", created_at: "2025-04-01T16:45:00Z", plan: "pro" },
    { id: 5, username: "eve", email: "eve@company.com", created_at: "2025-04-08T11:20:00Z", plan: "free" },
  ],
  projects: [
    { id: 1, name: "my-portfolio", user_id: 1, language: "typescript", is_public: true, created_at: "2025-01-20T12:00:00Z" },
    { id: 2, name: "api-server", user_id: 1, language: "python", is_public: false, created_at: "2025-02-15T08:30:00Z" },
    { id: 3, name: "game-engine", user_id: 2, language: "rust", is_public: true, created_at: "2025-03-01T14:00:00Z" },
    { id: 4, name: "data-pipeline", user_id: 3, language: "python", is_public: false, created_at: "2025-03-20T10:00:00Z" },
    { id: 5, name: "mobile-app", user_id: 4, language: "typescript", is_public: true, created_at: "2025-04-05T09:15:00Z" },
  ],
  files: [
    { id: 1, project_id: 1, path: "src/index.tsx", content: null, size: 2048 },
    { id: 2, project_id: 1, path: "package.json", content: null, size: 512 },
    { id: 3, project_id: 2, path: "main.py", content: null, size: 1024 },
    { id: 4, project_id: 3, path: "src/engine.rs", content: null, size: 4096 },
    { id: 5, project_id: 4, path: "pipeline.py", content: null, size: 3072 },
  ],
  sessions: [
    { id: "a1b2c3d4", user_id: 1, expires_at: "2025-05-01T00:00:00Z" },
    { id: "e5f6g7h8", user_id: 2, expires_at: "2025-05-02T00:00:00Z" },
    { id: "i9j0k1l2", user_id: 3, expires_at: "2025-04-28T00:00:00Z" },
  ],
  deployments: [
    { id: 1, project_id: 1, status: "live", url: "https://my-portfolio.app", created_at: "2025-04-10T12:00:00Z" },
    { id: 2, project_id: 2, status: "building", url: null, created_at: "2025-04-12T08:00:00Z" },
    { id: 3, project_id: 3, status: "live", url: "https://game-engine.dev", created_at: "2025-04-14T16:00:00Z" },
    { id: 4, project_id: 5, status: "failed", url: null, created_at: "2025-04-15T10:00:00Z" },
  ],
};

export function listTables(): TableInfo[] {
  return DEMO_TABLES;
}

export function getTableRows(tableName: string, limit = 100, offset = 0): QueryResult {
  const start = performance.now();
  const rows = DEMO_ROWS[tableName] || [];
  const paged = rows.slice(offset, offset + limit);
  const table = DEMO_TABLES.find((t) => t.name === tableName);
  const columns = table ? table.columns.map((c) => c.name) : (paged.length > 0 ? Object.keys(paged[0]) : []);
  return {
    columns,
    rows: paged,
    rowCount: rows.length,
    duration: Math.round((performance.now() - start) * 100) / 100,
  };
}

const READONLY_KEYWORDS = ["select", "show", "describe", "explain", "with"];

export function executeQuery(sql: string): QueryResult {
  const start = performance.now();
  const trimmed = sql.trim().toLowerCase();
  const firstWord = trimmed.split(/\s+/)[0];

  if (!READONLY_KEYWORDS.includes(firstWord)) {
    throw new Error("Only SELECT queries are allowed in the database viewer");
  }

  const fromMatch = trimmed.match(/from\s+(\w+)/);
  const tableName = fromMatch?.[1];

  if (tableName && DEMO_ROWS[tableName]) {
    const rows = DEMO_ROWS[tableName];
    const limitMatch = trimmed.match(/limit\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : rows.length;
    const paged = rows.slice(0, limit);
    const table = DEMO_TABLES.find((t) => t.name === tableName);
    const columns = table ? table.columns.map((c) => c.name) : (paged.length > 0 ? Object.keys(paged[0]) : []);
    return {
      columns,
      rows: paged,
      rowCount: paged.length,
      duration: Math.round((performance.now() - start) * 100) / 100,
    };
  }

  return { columns: [], rows: [], rowCount: 0, duration: Math.round((performance.now() - start) * 100) / 100 };
}

export function exportCsv(tableName: string): string {
  const rows = DEMO_ROWS[tableName] || [];
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","));
  }
  return lines.join("\n") + "\n";
}
