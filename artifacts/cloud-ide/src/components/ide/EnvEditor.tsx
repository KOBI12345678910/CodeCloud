import { useState, useCallback, useMemo, useRef } from "react";
import {
  Table, FileText, Plus, Trash2, Copy, Download, Upload,
  Eye, EyeOff, ChevronDown, Search, Lock, Loader2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

type EnvName = "development" | "staging" | "production";

const ENV_COLORS: Record<EnvName, string> = {
  development: "text-green-400 bg-green-500/10",
  staging: "text-yellow-400 bg-yellow-500/10",
  production: "text-red-400 bg-red-500/10",
};

const SAMPLE_VARS: Record<EnvName, EnvVar[]> = {
  development: [
    { id: "1", key: "DATABASE_URL", value: "postgresql://localhost:5432/myapp_dev", isSecret: false },
    { id: "2", key: "API_KEY", value: "dev_sk_test_12345abcdef", isSecret: true },
    { id: "3", key: "NODE_ENV", value: "development", isSecret: false },
    { id: "4", key: "PORT", value: "3000", isSecret: false },
    { id: "5", key: "JWT_SECRET", value: "dev-secret-key-change-in-prod", isSecret: true },
    { id: "6", key: "REDIS_URL", value: "redis://localhost:6379", isSecret: false },
  ],
  staging: [
    { id: "1", key: "DATABASE_URL", value: "postgresql://staging-db:5432/myapp_staging", isSecret: false },
    { id: "2", key: "API_KEY", value: "stg_sk_test_67890ghijkl", isSecret: true },
    { id: "3", key: "NODE_ENV", value: "staging", isSecret: false },
    { id: "4", key: "PORT", value: "8080", isSecret: false },
  ],
  production: [
    { id: "1", key: "DATABASE_URL", value: "postgresql://prod-db:5432/myapp", isSecret: true },
    { id: "2", key: "API_KEY", value: "prod_sk_live_secretkey", isSecret: true },
    { id: "3", key: "NODE_ENV", value: "production", isSecret: false },
    { id: "4", key: "PORT", value: "443", isSecret: false },
    { id: "5", key: "JWT_SECRET", value: "super-secret-prod-key", isSecret: true },
  ],
};

function parseEnvString(text: string): EnvVar[] {
  return text
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line, i) => {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) return null;
      const key = line.slice(0, eqIdx).trim();
      let value = line.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return { id: `import-${i}`, key, value, isSecret: false };
    })
    .filter(Boolean) as EnvVar[];
}

function toEnvString(vars: EnvVar[]): string {
  return vars.map((v) => `${v.key}=${v.value}`).join("\n") + "\n";
}

function highlightEnv(text: string): React.ReactElement[] {
  return text.split("\n").map((line, i) => {
    if (line.trim().startsWith("#")) {
      return <div key={i} className="text-muted-foreground/50 italic">{line}</div>;
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      return <div key={i}>{line || "\u00A0"}</div>;
    }
    const key = line.slice(0, eqIdx);
    const value = line.slice(eqIdx + 1);
    return (
      <div key={i}>
        <span className="text-blue-400">{key}</span>
        <span className="text-muted-foreground">=</span>
        <span className="text-green-400">{value}</span>
      </div>
    );
  });
}

export default function EnvEditor() {
  const { toast } = useToast();
  const [env, setEnv] = useState<EnvName>("development");
  const [vars, setVars] = useState<Record<EnvName, EnvVar[]>>(SAMPLE_VARS);
  const [viewMode, setViewMode] = useState<"table" | "file">("table");
  const [fileText, setFileText] = useState("");
  const [search, setSearch] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVars = vars[env];

  const filteredVars = useMemo(() => {
    if (!search) return currentVars;
    const q = search.toLowerCase();
    return currentVars.filter(
      (v) => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q)
    );
  }, [currentVars, search]);

  const switchToFile = useCallback(() => {
    setFileText(toEnvString(currentVars));
    setViewMode("file");
  }, [currentVars]);

  const switchToTable = useCallback(() => {
    if (viewMode === "file" && fileText.trim()) {
      const parsed = parseEnvString(fileText);
      if (parsed.length > 0) {
        setVars((prev) => ({ ...prev, [env]: parsed }));
      }
    }
    setViewMode("table");
  }, [viewMode, fileText, env]);

  const addVar = () => {
    const newVar: EnvVar = { id: `new-${Date.now()}`, key: "", value: "", isSecret: false };
    setVars((prev) => ({ ...prev, [env]: [...prev[env], newVar] }));
  };

  const updateVar = (id: string, field: "key" | "value", val: string) => {
    setVars((prev) => ({
      ...prev,
      [env]: prev[env].map((v) => (v.id === id ? { ...v, [field]: val } : v)),
    }));
  };

  const toggleSecret = (id: string) => {
    setVars((prev) => ({
      ...prev,
      [env]: prev[env].map((v) => (v.id === id ? { ...v, isSecret: !v.isSecret } : v)),
    }));
  };

  const deleteVar = (id: string) => {
    setVars((prev) => ({
      ...prev,
      [env]: prev[env].filter((v) => v.id !== id),
    }));
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExport = () => {
    const content = toEnvString(currentVars);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${env}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported .env.${env}` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseEnvString(text);
      if (parsed.length > 0) {
        setVars((prev) => ({ ...prev, [env]: parsed }));
        toast({ title: `Imported ${parsed.length} variables` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="env-editor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Environment</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs" data-testid="env-selector">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ENV_COLORS[env]}`}>
                  {env}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(["development", "staging", "production"] as EnvName[]).map((e) => (
                <DropdownMenuItem key={e} onClick={() => setEnv(e)} data-testid={`env-option-${e}`}>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium mr-2 ${ENV_COLORS[e]}`}>{e}</span>
                  {currentVars.length > 0 && e === env && <Check className="w-3 h-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => (viewMode === "table" ? switchToFile() : switchToTable())}
            data-testid="toggle-view"
          >
            {viewMode === "table" ? <FileText className="w-3 h-3" /> : <Table className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()} data-testid="button-import">
            <Upload className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExport} data-testid="button-export">
            <Download className="w-3 h-3" />
          </Button>
          <input ref={fileInputRef} type="file" accept=".env,.env.*,.txt" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {viewMode === "table" && (
        <div className="px-3 py-2 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variables..."
              className="h-7 text-xs pl-7"
              data-testid="search-vars"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {viewMode === "table" ? (
          <div data-testid="table-view">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-0 text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 border-b border-border/20 bg-[hsl(222,47%,12%)]">
              <span>Key</span>
              <span>Value</span>
              <span className="w-20 text-center">Actions</span>
            </div>

            {filteredVars.map((v) => (
              <div
                key={v.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-0 items-center px-3 py-1 border-b border-border/10 hover:bg-white/[0.02] group"
                data-testid={`var-row-${v.key || v.id}`}
              >
                <div className="flex items-center gap-1.5 pr-2">
                  {v.isSecret && <Lock className="w-3 h-3 text-yellow-400/60 shrink-0" />}
                  <Input
                    value={v.key}
                    onChange={(e) => updateVar(v.id, "key", e.target.value)}
                    placeholder="KEY"
                    className="h-6 text-xs font-mono bg-transparent border-none px-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-blue-400"
                  />
                </div>
                <div className="flex items-center gap-1 pr-2">
                  <Input
                    value={v.isSecret && !revealedSecrets.has(v.id) ? "••••••••" : v.value}
                    onChange={(e) => updateVar(v.id, "value", e.target.value)}
                    placeholder="value"
                    className="h-6 text-xs font-mono bg-transparent border-none px-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-green-400"
                    readOnly={v.isSecret && !revealedSecrets.has(v.id)}
                  />
                </div>
                <div className="flex items-center gap-0.5 w-20 justify-end">
                  {v.isSecret && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => toggleReveal(v.id)}>
                      {revealedSecrets.has(v.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyValue(v.id, v.value)}>
                    {copiedId === v.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => toggleSecret(v.id)}>
                    <Lock className={`w-3 h-3 ${v.isSecret ? "text-yellow-400" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteVar(v.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            <button
              onClick={addVar}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              data-testid="button-add-var"
            >
              <Plus className="w-3 h-3" /> Add Variable
            </button>
          </div>
        ) : (
          <div className="relative h-full" data-testid="file-view">
            <textarea
              value={fileText}
              onChange={(e) => setFileText(e.target.value)}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-xs p-3 resize-none outline-none z-10"
              spellCheck={false}
            />
            <div className="absolute inset-0 w-full h-full font-mono text-xs p-3 pointer-events-none whitespace-pre-wrap overflow-auto">
              {highlightEnv(fileText)}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border/30 bg-[hsl(222,47%,13%)] text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span>{currentVars.length} variable{currentVars.length !== 1 ? "s" : ""}</span>
        <span>{currentVars.filter((v) => v.isSecret).length} secret{currentVars.filter((v) => v.isSecret).length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
