import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, X, Copy, Upload, Download, Eye, EyeOff,
  ArrowRightLeft, RefreshCw, Check, AlertCircle, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Environment = "development" | "production";

interface EnvVar {
  id: string;
  key: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
}

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

const ENV_COLORS: Record<Environment, { bg: string; text: string; border: string; dot: string }> = {
  development: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-500" },
  production: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-500" },
};

function parseEnvFile(content: string): { key: string; value: string }[] {
  const vars: { key: string; value: string }[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      vars.push({ key, value });
    }
  }
  return vars;
}

export function DeployEnvVars({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [activeEnv, setActiveEnv] = useState<Environment>("development");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showValues, setShowValues] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const safeFetch = async (url: string, opts?: RequestInit) => {
    const r = await fetch(url, { credentials: "include", ...opts });
    if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || r.statusText); }
    return r;
  };

  const { data: devVars = [], isLoading: devLoading } = useQuery<EnvVar[]>({
    queryKey: ["env-vars", projectId, "development"],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/secrets?environment=development`).then(r => r.json()),
  });

  const { data: prodVars = [], isLoading: prodLoading } = useQuery<EnvVar[]>({
    queryKey: ["env-vars", projectId, "production"],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/secrets?environment=production`).then(r => r.json()),
  });

  const vars = activeEnv === "development" ? devVars : prodVars;
  const isLoading = activeEnv === "development" ? devLoading : prodLoading;
  const colors = ENV_COLORS[activeEnv];

  const filtered = search ? vars.filter(v => v.key.toLowerCase().includes(search.toLowerCase())) : vars;

  const addVar = useMutation({
    mutationFn: () => fetch(`${API}/projects/${projectId}/secrets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: newKey.trim(), value: newValue, environment: activeEnv }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["env-vars", projectId, activeEnv] });
      setNewKey(""); setNewValue(""); setShowAdd(false);
    },
  });

  const deleteVar = useMutation({
    mutationFn: (secretId: string) => safeFetch(`${API}/projects/${projectId}/secrets/${secretId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["env-vars", projectId, activeEnv] }),
  });

  const copyEnv = useMutation({
    mutationFn: (direction: { from: Environment; to: Environment }) =>
      safeFetch(`${API}/projects/${projectId}/secrets/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(direction),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["env-vars", projectId] });
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    },
  });

  const bulkImport = useMutation({
    mutationFn: (variables: { key: string; value: string }[]) =>
      safeFetch(`${API}/projects/${projectId}/secrets/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables, environment: activeEnv }),
      }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["env-vars", projectId, activeEnv] });
      setImportResult(`Imported ${data.imported} variables`);
      setTimeout(() => setImportResult(null), 3000);
    },
  });

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseEnvFile(content);
      if (parsed.length > 0) bulkImport.mutate(parsed);
      else setImportResult("No valid variables found in file");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [bulkImport]);

  const handleExport = useCallback(async () => {
    const res = await safeFetch(`${API}/projects/${projectId}/secrets/export?environment=${activeEnv}`);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeEnv}.env`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectId, activeEnv]);

  const toggleShowValue = useCallback((id: string) => {
    setShowValues(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const otherEnv: Environment = activeEnv === "development" ? "production" : "development";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="deploy-env-vars">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Environment Variables</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        {(["development", "production"] as Environment[]).map(env => {
          const c = ENV_COLORS[env];
          const count = env === "development" ? devVars.length : prodVars.length;
          return (
            <button
              key={env}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                activeEnv === env ? `${c.bg} ${c.text} ${c.border}` : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveEnv(env)}
            >
              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
              {env === "development" ? "Development" : "Production"}
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
            onClick={() => copyEnv.mutate({ from: activeEnv, to: otherEnv })}
            disabled={copyEnv.isPending}
            title={`Copy all to ${otherEnv}`}>
            {copySuccess ? <Check className="w-3 h-3 text-green-500" /> : <ArrowRightLeft className="w-3 h-3" />}
            Copy to {otherEnv === "development" ? "Dev" : "Prod"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".env,.env.*,.txt" className="hidden" onChange={handleFileImport} />
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
            onClick={() => fileInputRef.current?.click()} title="Import from .env file">
            <Upload className="w-3 h-3" /> Import
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
            onClick={handleExport} title="Export as .env file">
            <Download className="w-3 h-3" /> Export
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
            onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              value={newKey}
              onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="KEY_NAME"
              className="h-7 text-xs font-mono flex-1"
            />
            <Input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="value"
              className="h-7 text-xs font-mono flex-1"
              type="password"
            />
            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => addVar.mutate()}
              disabled={!newKey.trim() || !newValue || addVar.isPending}>
              {addVar.isPending ? "Adding..." : "Add"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            Adding to {activeEnv}
          </p>
          {addVar.isError && <p className="text-[10px] text-red-500 mt-1">{(addVar.error as Error).message}</p>}
        </div>
      )}

      {importResult && (
        <div className="px-3 py-1.5 bg-green-500/10 border-b border-green-500/20 text-[10px] text-green-500 flex items-center gap-1">
          <Check className="w-3 h-3" /> {importResult}
        </div>
      )}

      {vars.length > 5 && (
        <div className="px-3 py-1.5 border-b border-border/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter variables..."
              className="h-6 text-[10px] pl-7"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <AlertCircle className="w-8 h-8 opacity-30" />
            <p className="text-xs">{search ? "No variables match your filter" : `No ${activeEnv} variables configured`}</p>
            <p className="text-[10px]">{search ? "Try a different search" : "Click Add to create one, or import from a .env file"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            <div className="grid grid-cols-[1fr,1fr,auto] gap-0 px-3 py-1 text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border/30">
              <span>Key</span>
              <span>Value</span>
              <span className="w-16 text-right">Actions</span>
            </div>
            {filtered.map(v => (
              <div key={v.id} className="grid grid-cols-[1fr,1fr,auto] gap-0 px-3 py-1.5 items-center hover:bg-muted/20 group">
                <span className="text-xs font-mono font-medium truncate pr-2">{v.key}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {showValues.has(v.id) ? "(encrypted)" : "••••••••"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 justify-end w-16">
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => toggleShowValue(v.id)}>
                    {showValues.has(v.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-500 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteVar.mutate(v.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground shrink-0">
        <span>{filtered.length} variable{filtered.length !== 1 ? "s" : ""} in {activeEnv}</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Dev: {devVars.length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Prod: {prodVars.length}
          </span>
        </div>
      </div>
    </div>
  );
}
