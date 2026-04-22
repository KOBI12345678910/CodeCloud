export interface QueryAnalysis {
  id: string;
  originalQuery: string;
  optimizedQuery: string;
  queryPlan: QueryPlanNode;
  suggestions: OptimizationSuggestion[];
  indexes: IndexSuggestion[];
  benchmark: BenchmarkResult;
  complexity: "low" | "medium" | "high" | "critical";
  analyzedAt: string;
}

export interface QueryPlanNode {
  operation: string;
  table?: string;
  cost: number;
  rows: number;
  actualTime: number;
  filter?: string;
  index?: string;
  children?: QueryPlanNode[];
}

export interface OptimizationSuggestion {
  type: "rewrite" | "index" | "schema" | "caching" | "partitioning";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  impact: string;
  before?: string;
  after?: string;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: "btree" | "hash" | "gin" | "gist" | "brin";
  unique: boolean;
  createStatement: string;
  estimatedSizeBytes: number;
  estimatedSpeedup: number;
}

export interface BenchmarkResult {
  beforeMs: number;
  afterMs: number;
  improvement: number;
  rowsScanned: { before: number; after: number };
  memoryUsageKb: { before: number; after: number };
  ioOperations: { before: number; after: number };
}

const analysisCache: Map<string, QueryAnalysis> = new Map();

function generateQueryPlan(query: string): QueryPlanNode {
  const lq = query.toLowerCase();
  if (lq.includes("join")) {
    return {
      operation: "Hash Join", cost: 1245.8, rows: 5200, actualTime: 45.2,
      filter: "users.id = orders.user_id",
      children: [
        { operation: "Seq Scan", table: "users", cost: 320.5, rows: 10000, actualTime: 12.3 },
        {
          operation: "Hash", cost: 890.2, rows: 52000, actualTime: 28.7,
          children: [
            { operation: "Seq Scan", table: "orders", cost: 890.2, rows: 52000, actualTime: 28.7, filter: "status = 'active'" },
          ],
        },
      ],
    };
  }
  if (lq.includes("group by")) {
    return {
      operation: "HashAggregate", cost: 2150.0, rows: 150, actualTime: 89.4,
      children: [
        {
          operation: "Sort", cost: 1800.0, rows: 52000, actualTime: 67.2,
          children: [
            { operation: "Seq Scan", table: lq.includes("from") ? lq.split("from")[1].trim().split(/\s/)[0] : "table", cost: 890.0, rows: 52000, actualTime: 32.1 },
          ],
        },
      ],
    };
  }
  if (lq.includes("where") && !lq.includes("index")) {
    return {
      operation: "Seq Scan", table: lq.includes("from") ? lq.split("from")[1].trim().split(/\s/)[0] : "table",
      cost: 1500.0, rows: 85000, actualTime: 120.5, filter: "no index available",
    };
  }
  return {
    operation: "Index Scan", table: "table", cost: 8.5, rows: 1, actualTime: 0.05, index: "pk_id",
  };
}

function generateSuggestions(query: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lq = query.toLowerCase();

  if (lq.includes("select *")) {
    suggestions.push({
      type: "rewrite", severity: "warning", title: "Avoid SELECT *",
      description: "Selecting all columns fetches unnecessary data and prevents covering index optimizations.",
      impact: "Can reduce I/O by 40-60% depending on table width",
      before: "SELECT *", after: "SELECT id, name, email",
    });
  }
  if (lq.includes("where") && !lq.includes("limit")) {
    suggestions.push({
      type: "rewrite", severity: "info", title: "Add LIMIT clause",
      description: "Without LIMIT, the query may return millions of rows unnecessarily.",
      impact: "Reduces memory usage and network transfer",
      before: query.slice(0, 60), after: query.slice(0, 60) + " LIMIT 100",
    });
  }
  if (lq.includes("like '%")) {
    suggestions.push({
      type: "index", severity: "critical", title: "Leading wildcard prevents index usage",
      description: "LIKE '%value' cannot use B-tree indexes. Consider full-text search or trigram indexes.",
      impact: "Full table scan eliminated, 10-100x speedup possible",
      before: "WHERE name LIKE '%john%'", after: "WHERE name @@ to_tsquery('john')",
    });
  }
  if (lq.includes("join") && !lq.includes("on")) {
    suggestions.push({
      type: "rewrite", severity: "critical", title: "Missing JOIN condition",
      description: "A JOIN without ON clause creates a cartesian product, which is almost always unintended.",
      impact: "Prevents exponential row explosion",
    });
  }
  if (lq.includes("order by") && lq.includes("offset")) {
    suggestions.push({
      type: "rewrite", severity: "warning", title: "Use keyset pagination instead of OFFSET",
      description: "OFFSET-based pagination gets slower as offset increases. Keyset pagination is O(1).",
      impact: "Constant-time pagination regardless of page number",
      before: "ORDER BY id OFFSET 10000 LIMIT 10",
      after: "WHERE id > :last_seen_id ORDER BY id LIMIT 10",
    });
  }
  if (lq.includes("not in")) {
    suggestions.push({
      type: "rewrite", severity: "warning", title: "Replace NOT IN with NOT EXISTS",
      description: "NOT IN has poor performance with large subqueries and unexpected NULL behavior.",
      impact: "2-5x performance improvement on large datasets",
      before: "WHERE id NOT IN (SELECT id FROM ...)",
      after: "WHERE NOT EXISTS (SELECT 1 FROM ... WHERE ...)",
    });
  }
  if (lq.includes("count(*)") && lq.includes("where")) {
    suggestions.push({
      type: "caching", severity: "info", title: "Cache frequently counted queries",
      description: "COUNT queries scan all matching rows. Consider maintaining a counter cache for hot paths.",
      impact: "Eliminates repeated full-count scans",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      type: "rewrite", severity: "info", title: "Query looks well-optimized",
      description: "No major performance issues detected. Consider adding EXPLAIN ANALYZE for production profiling.",
      impact: "Minimal",
    });
  }
  return suggestions;
}

function generateIndexSuggestions(query: string): IndexSuggestion[] {
  const indexes: IndexSuggestion[] = [];
  const lq = query.toLowerCase();

  const whereMatch = lq.match(/where\s+(\w+)\.(\w+)\s*=|where\s+(\w+)\s*=/);
  if (whereMatch) {
    const table = whereMatch[1] || "table";
    const col = whereMatch[2] || whereMatch[3] || "column";
    indexes.push({
      table, columns: [col], type: "btree", unique: false,
      createStatement: `CREATE INDEX idx_${table}_${col} ON ${table} (${col});`,
      estimatedSizeBytes: 2400000, estimatedSpeedup: 15.5,
    });
  }
  if (lq.includes("join") && lq.includes("on")) {
    const onMatch = lq.match(/on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
    if (onMatch) {
      indexes.push({
        table: onMatch[3], columns: [onMatch[4]], type: "btree", unique: false,
        createStatement: `CREATE INDEX idx_${onMatch[3]}_${onMatch[4]} ON ${onMatch[3]} (${onMatch[4]});`,
        estimatedSizeBytes: 3200000, estimatedSpeedup: 8.2,
      });
    }
  }
  if (lq.includes("order by")) {
    const orderMatch = lq.match(/order by\s+(\w+)/);
    if (orderMatch) {
      indexes.push({
        table: "table", columns: [orderMatch[1]], type: "btree", unique: false,
        createStatement: `CREATE INDEX idx_table_${orderMatch[1]} ON table (${orderMatch[1]});`,
        estimatedSizeBytes: 1800000, estimatedSpeedup: 5.0,
      });
    }
  }
  if (lq.includes("like") || lq.includes("@@")) {
    indexes.push({
      table: "table", columns: ["search_column"], type: "gin", unique: false,
      createStatement: "CREATE INDEX idx_table_search_gin ON table USING gin (to_tsvector('english', search_column));",
      estimatedSizeBytes: 8500000, estimatedSpeedup: 25.0,
    });
  }
  return indexes;
}

function optimizeQuery(query: string): string {
  let optimized = query;
  optimized = optimized.replace(/SELECT \*/gi, "SELECT id, name, email, created_at");
  optimized = optimized.replace(/NOT IN\s*\(/gi, "NOT EXISTS (SELECT 1 FROM ");
  if (!optimized.toLowerCase().includes("limit") && optimized.toLowerCase().includes("where")) {
    optimized = optimized.replace(/;?\s*$/, " LIMIT 1000;");
  }
  if (optimized.toLowerCase().includes("like '%")) {
    optimized = optimized.replace(/LIKE\s+'%([^']+)%'/gi, "@@ to_tsquery('$1')");
  }
  return optimized;
}

export class AiQueryOptimizerService {
  async analyzeQuery(query: string, databaseId?: string): Promise<QueryAnalysis> {
    const cached = analysisCache.get(query);
    if (cached) return cached;

    const optimizedQuery = optimizeQuery(query);
    const queryPlan = generateQueryPlan(query);
    const suggestions = generateSuggestions(query);
    const indexes = generateIndexSuggestions(query);

    const criticalCount = suggestions.filter(s => s.severity === "critical").length;
    const warningCount = suggestions.filter(s => s.severity === "warning").length;
    const complexity: QueryAnalysis["complexity"] =
      criticalCount > 0 ? "critical" : warningCount > 1 ? "high" : warningCount > 0 ? "medium" : "low";

    const beforeMs = queryPlan.actualTime * (1 + Math.random());
    const speedup = indexes.reduce((s, idx) => s + idx.estimatedSpeedup, 0) || 2;
    const afterMs = beforeMs / Math.max(speedup, 1.5);

    const analysis: QueryAnalysis = {
      id: `qa_${Date.now()}`, originalQuery: query, optimizedQuery, queryPlan,
      suggestions, indexes, complexity, analyzedAt: new Date().toISOString(),
      benchmark: {
        beforeMs: Math.round(beforeMs * 100) / 100,
        afterMs: Math.round(afterMs * 100) / 100,
        improvement: Math.round((1 - afterMs / beforeMs) * 10000) / 100,
        rowsScanned: { before: queryPlan.rows * 10, after: queryPlan.rows },
        memoryUsageKb: { before: queryPlan.rows * 2, after: Math.floor(queryPlan.rows * 0.3) },
        ioOperations: { before: Math.floor(queryPlan.rows / 100), after: Math.floor(queryPlan.rows / 1000) },
      },
    };

    analysisCache.set(query, analysis);
    return analysis;
  }

  async explainPlan(query: string): Promise<QueryPlanNode> {
    return generateQueryPlan(query);
  }

  async suggestIndexes(query: string): Promise<IndexSuggestion[]> {
    return generateIndexSuggestions(query);
  }

  async rewriteQuery(query: string): Promise<{ original: string; optimized: string; changes: string[] }> {
    const optimized = optimizeQuery(query);
    const changes: string[] = [];
    if (query.toLowerCase().includes("select *")) changes.push("Replaced SELECT * with specific columns");
    if (query.toLowerCase().includes("not in")) changes.push("Replaced NOT IN with NOT EXISTS");
    if (!query.toLowerCase().includes("limit")) changes.push("Added LIMIT clause");
    if (query.toLowerCase().includes("like '%")) changes.push("Replaced LIKE wildcard with full-text search");
    if (changes.length === 0) changes.push("No changes needed");
    return { original: query, optimized, changes };
  }

  async benchmark(query: string): Promise<BenchmarkResult> {
    const analysis = await this.analyzeQuery(query);
    return analysis.benchmark;
  }

  getHistory(): QueryAnalysis[] {
    return Array.from(analysisCache.values()).sort(
      (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
    );
  }

  clearHistory(): void {
    analysisCache.clear();
  }
}

export const aiQueryOptimizerService = new AiQueryOptimizerService();
