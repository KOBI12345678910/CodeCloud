import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database, Table2, Play, Download, Loader2, ChevronRight,
  Search, Key, Hash, Type, Clock, ToggleLeft,
  AlertCircle, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimary: boolean;
}

interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnInfo[];
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

const TYPE_ICONS: Record<string, typeof Hash> = {
  serial: Hash,
  integer: Hash,
  varchar: Type,
  text: Type,
  boolean: ToggleLeft,
  timestamp: Clock,
};

interface DatabaseViewerProps {
  projectId: string;
}

export default function DatabaseViewer({ projectId }: DatabaseViewerProps) {
  const { toast } = useToast();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [tab, setTab] = useState<"data" | "query">("data");
  const [search, setSearch] = useState("");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API_BASE}/api/projects/${projectId}/database${path}`, {
      credentials: "include",
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    apiFetch("/tables").then(setTables).catch(() => {}).finally(() => setLoading(false));
  }, [apiFetch]);

  const loadTableData = async (tableName: string) => {
    setSelectedTable(tableName);
    setTab("data");
    setLoading(true);
    try {
      const data = await apiFetch(`/tables/${tableName}/rows?limit=100`);
      setTableData(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const runQuery = async () => {
    if (!queryText.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const result = await apiFetch("/query", {
        method: "POST",
        body: JSON.stringify({ sql: queryText }),
      });
      setQueryResult(result);
    } catch (err: any) {
      setQueryError(err.message);
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleExport = async (tableName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/database/tables/${tableName}/export`, {
        credentials: "include",
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${tableName}.csv` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const copyCell = (value: string, cellId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 1200);
  };

  const filteredTables = tables.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTableInfo = tables.find((t) => t.name === selectedTable);
  const displayResult = tab === "data" ? tableData : queryResult;

  return (
    <div className="flex h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="database-viewer">
      <div className="w-56 border-r border-border/30 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-border/30 bg-[hsl(222,47%,13%)]">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tables</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables..."
              className="h-6 text-[10px] pl-6"
              data-testid="search-tables"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredTables.map((t) => (
            <button
              key={t.name}
              onClick={() => loadTableData(t.name)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors ${selectedTable === t.name ? "bg-primary/10 text-primary" : ""}`}
              data-testid={`table-${t.name}`}
            >
              <Table2 className="w-3 h-3 shrink-0" />
              <span className="flex-1 text-left truncate">{t.name}</span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">{t.rowCount}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
          <div className="flex items-center gap-2">
            {(["data", "query"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2 py-1 text-[10px] rounded capitalize transition-colors ${
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${t}`}
              >
                {t === "data" ? "Data" : "SQL Query"}
              </button>
            ))}
            {selectedTable && tab === "data" && (
              <span className="text-xs text-muted-foreground ml-2">
                <span className="font-medium text-foreground">{selectedTable}</span>
                {tableData && <span className="ml-1">({tableData.rowCount} rows, {tableData.duration}ms)</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedTable && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleExport(selectedTable)} data-testid="button-export-csv">
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
            )}
          </div>
        </div>

        {tab === "query" && (
          <div className="border-b border-border/30 p-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="SELECT * FROM users LIMIT 10;"
                className="w-full h-20 bg-[hsl(222,47%,9%)] border border-border/30 rounded-md px-3 py-2 font-mono text-xs text-foreground resize-none outline-none focus:border-primary/50"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runQuery(); } }}
                spellCheck={false}
                data-testid="sql-input"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">Ctrl+Enter to run</span>
              <Button size="sm" className="h-6 text-[10px] px-3" onClick={runQuery} disabled={queryLoading || !queryText.trim()} data-testid="button-run-query">
                {queryLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                Run Query
              </Button>
            </div>
            {queryError && (
              <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2" data-testid="query-error">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {queryError}
              </div>
            )}
            {queryResult && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {queryResult.rowCount} row{queryResult.rowCount !== 1 ? "s" : ""} in {queryResult.duration}ms
              </div>
            )}
          </div>
        )}

        {tab === "data" && selectedTableInfo && (
          <div className="border-b border-border/20 px-3 py-1.5 bg-[hsl(222,47%,12%)]">
            <div className="flex flex-wrap gap-3">
              {selectedTableInfo.columns.map((col) => {
                const baseType = col.type.replace(/\(.*\)/, "");
                const Icon = TYPE_ICONS[baseType] || Type;
                return (
                  <span key={col.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {col.isPrimary && <Key className="w-2.5 h-2.5 text-yellow-400" />}
                    <Icon className="w-2.5 h-2.5" />
                    <span className={col.isPrimary ? "text-yellow-400" : "text-foreground/70"}>{col.name}</span>
                    <span className="text-muted-foreground/40">{col.type}</span>
                    {col.nullable && <span className="text-muted-foreground/30">null</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto" data-testid="data-grid">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !displayResult || !selectedTable && tab === "data" ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
              <Database className="w-10 h-10 mb-3" />
              <p className="text-xs">{tab === "data" ? "Select a table to view data" : "Run a query to see results"}</p>
            </div>
          ) : displayResult.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
              <p className="text-xs">No rows returned</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[hsl(222,47%,14%)]">
                  {displayResult.columns.map((col) => (
                    <th key={col} className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border/30 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayResult.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.02] border-b border-border/10">
                    {displayResult.columns.map((col) => {
                      const val = row[col];
                      const display = val === null ? "NULL" : String(val);
                      const cellId = `${ri}-${col}`;
                      return (
                        <td
                          key={col}
                          className={`px-3 py-1 whitespace-nowrap max-w-[300px] truncate cursor-pointer group relative ${
                            val === null ? "text-muted-foreground/30 italic" : ""
                          } ${typeof val === "number" ? "tabular-nums text-blue-400/80" : ""} ${typeof val === "boolean" ? (val ? "text-green-400" : "text-red-400") : ""}`}
                          onClick={() => copyCell(display, cellId)}
                          title={display}
                        >
                          {display}
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                            {copiedCell === cellId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground/30" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
