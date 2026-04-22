import React, { useState, useCallback, useRef } from "react";
import {
  Database, Play, Save, Clock, Trash2, X, ChevronDown,
  ChevronRight, Table, Download, Copy, Star, StarOff, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryResult {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  rowCount: number;
  duration: number;
  error: string | null;
}

interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: Date;
}

interface QueryHistoryEntry {
  id: string;
  sql: string;
  timestamp: Date;
  duration: number;
  rowCount: number;
  error: string | null;
}

interface DatabaseConsoleProps {
  onClose?: () => void;
}

const SAMPLE_TABLES = ["users", "projects", "files", "deployments", "collaborators", "templates", "sessions"];

const SAMPLE_RESULT: QueryResult = {
  columns: ["id", "username", "email", "plan", "created_at"],
  rows: [
    { id: 1, username: "alice", email: "alice@example.com", plan: "pro", created_at: "2025-11-15" },
    { id: 2, username: "bob", email: "bob@example.com", plan: "free", created_at: "2025-12-01" },
    { id: 3, username: "charlie", email: "charlie@example.com", plan: "team", created_at: "2026-01-10" },
    { id: 4, username: "diana", email: "diana@example.com", plan: "pro", created_at: "2026-02-20" },
    { id: 5, username: "eve", email: "eve@example.com", plan: "free", created_at: "2026-03-05" },
  ],
  rowCount: 5, duration: 12, error: null,
};

const SQL_KEYWORDS = ["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN", "LEFT", "RIGHT", "INNER", "ON", "AND", "OR", "NOT", "IN", "LIKE", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "AS", "COUNT", "SUM", "AVG", "MAX", "MIN", "DISTINCT", "CREATE", "ALTER", "DROP", "TABLE", "INDEX", "NULL", "IS", "BETWEEN", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END"];

export default function DatabaseConsole({ onClose }: DatabaseConsoleProps): React.ReactElement {
  const [sql, setSql] = useState("SELECT * FROM users LIMIT 10;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"results" | "history" | "saved">("results");
  const [history, setHistory] = useState<QueryHistoryEntry[]>([
    { id: "h1", sql: "SELECT * FROM users LIMIT 10;", timestamp: new Date(Date.now() - 3600000), duration: 12, rowCount: 5, error: null },
    { id: "h2", sql: "SELECT COUNT(*) FROM projects;", timestamp: new Date(Date.now() - 7200000), duration: 3, rowCount: 1, error: null },
    { id: "h3", sql: "SELECT * FROM nonexistent;", timestamp: new Date(Date.now() - 86400000), duration: 1, rowCount: 0, error: 'relation "nonexistent" does not exist' },
  ]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([
    { id: "sq1", name: "All users", sql: "SELECT * FROM users;", createdAt: new Date(Date.now() - 86400000 * 7) },
    { id: "sq2", name: "Active projects", sql: "SELECT * FROM projects WHERE status = 'active';", createdAt: new Date(Date.now() - 86400000 * 3) },
  ]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const executeQuery = useCallback(() => {
    if (!sql.trim()) return;
    setRunning(true);
    setTimeout(() => {
      const isError = sql.toLowerCase().includes("nonexistent");
      const queryResult: QueryResult = isError
        ? { columns: [], rows: [], rowCount: 0, duration: 1, error: 'relation "nonexistent" does not exist' }
        : { ...SAMPLE_RESULT, duration: Math.floor(Math.random() * 50) + 5 };

      setResult(queryResult);
      setHistory(prev => [{
        id: `h-${Date.now()}`, sql: sql.trim(), timestamp: new Date(),
        duration: queryResult.duration, rowCount: queryResult.rowCount,
        error: queryResult.error,
      }, ...prev].slice(0, 50));
      setRunning(false);
      setTab("results");
    }, 500);
  }, [sql]);

  const saveQuery = () => {
    const name = prompt("Query name:");
    if (!name) return;
    setSavedQueries(prev => [...prev, { id: `sq-${Date.now()}`, name, sql, createdAt: new Date() }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      executeQuery();
    }
    if (e.key === " " && e.ctrlKey) {
      e.preventDefault();
      const word = sql.split(/\s/).pop()?.toUpperCase() || "";
      const suggestions = [...SQL_KEYWORDS.filter(k => k.startsWith(word)), ...SAMPLE_TABLES.filter(t => t.startsWith(word.toLowerCase()))];
      setAutocompleteSuggestions(suggestions.slice(0, 8));
      setShowAutocomplete(suggestions.length > 0);
    }
    if (e.key === "Escape") setShowAutocomplete(false);
  };

  const insertSuggestion = (suggestion: string) => {
    const words = sql.split(/\s/);
    words[words.length - 1] = suggestion;
    setSql(words.join(" ") + " ");
    setShowAutocomplete(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Database Console</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={executeQuery} disabled={running || !sql.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50">
            {running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Run (Ctrl+Enter)
          </button>
          <button onClick={saveQuery} className="p-1 rounded text-gray-500 hover:text-gray-300" title="Save Query">
            <Save size={12} />
          </button>
          {onClose && <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex border-b border-[#333]">
        <div className="w-40 border-r border-[#333] bg-[#1e1e1e] overflow-y-auto max-h-32">
          <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tables</div>
          {SAMPLE_TABLES.map(table => (
            <button key={table} onClick={() => setSql(`SELECT * FROM ${table} LIMIT 10;`)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-[#2a2d2e] text-gray-400 hover:text-gray-200">
              <Table size={10} className="text-gray-600" /> {table}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={e => { setSql(e.target.value); setShowAutocomplete(false); }}
            onKeyDown={handleKeyDown}
            className="w-full h-24 bg-[#1e1e1e] text-gray-200 font-mono text-xs p-3 outline-none resize-none"
            placeholder="Enter SQL query... (Ctrl+Enter to run, Ctrl+Space for autocomplete)"
            spellCheck={false}
          />
          {showAutocomplete && (
            <div className="absolute z-10 bg-[#252526] border border-[#444] rounded shadow-lg max-h-40 overflow-y-auto" style={{ bottom: 4, left: 12 }}>
              {autocompleteSuggestions.map(s => (
                <button key={s} onClick={() => insertSuggestion(s)}
                  className="w-full px-3 py-1 text-xs text-left hover:bg-[#2a2d2e] font-mono text-gray-300">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1 border-b border-[#333] bg-[#252526]">
        {(["results", "history", "saved"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium ${tab === t ? "bg-[#333] text-gray-200" : "text-gray-500 hover:text-gray-300"}`}>
            {t === "results" ? `Results${result ? ` (${result.rowCount})` : ""}` : t === "history" ? `History (${history.length})` : `Saved (${savedQueries.length})`}
          </button>
        ))}
        {result && !result.error && (
          <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-500">
            <span>{result.rowCount} rows</span>
            <span>{result.duration}ms</span>
            <button className="p-0.5 hover:text-gray-300" title="Copy"><Copy size={10} /></button>
            <button className="p-0.5 hover:text-gray-300" title="Export CSV"><Download size={10} /></button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "results" && result && (
          result.error ? (
            <div className="px-3 py-3 text-xs text-red-400 bg-red-400/5">
              <div className="font-semibold mb-1">Error</div>
              {result.error}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#252526]">
                  {result.columns.map(col => (
                    <th key={col} className="text-left px-3 py-1.5 font-medium text-gray-400 border-b border-[#333] sticky top-0 bg-[#252526]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-[#2a2d2e] border-b border-[#2a2a2a]">
                    {result.columns.map(col => (
                      <td key={col} className="px-3 py-1.5 font-mono text-gray-300">
                        {row[col] === null ? <span className="text-gray-600 italic">NULL</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
        {tab === "results" && !result && (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">Run a query to see results</div>
        )}
        {tab === "history" && (
          <div className="divide-y divide-[#2a2a2a]">
            {history.map(h => (
              <button key={h.id} onClick={() => setSql(h.sql)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[#2a2d2e]">
                <Clock size={10} className="text-gray-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-300 truncate">{h.sql}</div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                    <span>{h.timestamp.toLocaleTimeString()}</span>
                    <span>{h.duration}ms</span>
                    {h.error ? <span className="text-red-400">Error</span> : <span>{h.rowCount} rows</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {tab === "saved" && (
          <div className="divide-y divide-[#2a2a2a]">
            {savedQueries.map(sq => (
              <div key={sq.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#2a2d2e]">
                <Star size={10} className="text-yellow-500 shrink-0" />
                <button onClick={() => setSql(sq.sql)} className="flex-1 text-left min-w-0">
                  <div className="text-xs text-gray-300">{sq.name}</div>
                  <div className="text-[10px] font-mono text-gray-500 truncate">{sq.sql}</div>
                </button>
                <button onClick={() => setSavedQueries(prev => prev.filter(s => s.id !== sq.id))}
                  className="p-1 text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
