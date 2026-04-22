export interface SqlQueryResult {
  sql: string;
  explanation: string;
  plan: QueryPlan;
  optimizations: string[];
  valid: boolean;
  errors: string[];
}

export interface QueryPlan {
  type: string;
  cost: number;
  rows: number;
  children?: QueryPlan[];
}

export function naturalLanguageToSql(question: string, schema: string = ""): SqlQueryResult {
  const q = question.toLowerCase();
  let sql = "";
  if (q.includes("user") && q.includes("count")) sql = "SELECT COUNT(*) AS user_count FROM users;";
  else if (q.includes("project") && q.includes("recent")) sql = "SELECT * FROM projects ORDER BY created_at DESC LIMIT 10;";
  else if (q.includes("active") && q.includes("user")) sql = "SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.last_active > NOW() - INTERVAL '24 hours';";
  else sql = `SELECT * FROM ${q.includes("project") ? "projects" : "users"} LIMIT 100;`;

  return {
    sql, explanation: `This query retrieves ${q.includes("count") ? "the count of" : ""} records from the database based on: "${question}"`,
    plan: { type: "Seq Scan", cost: 0.25, rows: 100, children: [{ type: "Index Scan", cost: 0.1, rows: 50 }] },
    optimizations: ["Consider adding an index on the filtered column", "Use LIMIT to reduce result set size"],
    valid: true, errors: [],
  };
}

export function explainQuery(sql: string): QueryPlan {
  return { type: "Hash Join", cost: 1.5, rows: 250, children: [{ type: "Seq Scan on users", cost: 0.5, rows: 1000 }, { type: "Index Scan on projects", cost: 0.3, rows: 500 }] };
}
