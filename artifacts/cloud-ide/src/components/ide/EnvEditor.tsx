import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Table, FileText, Plus, Trash2, Copy, Download, Upload,
  Eye, EyeOff, Search, Lock, Loader2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ServerSecret {
  id?: string;
  key: string;
  value: string;
  description?: string;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  dirty?: boolean;
  saving?: boolean;
}

interface Props {
  projectId: string;
}

const apiBase = `${import.meta.env.VITE_API_URL || ""}/api`;

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
      return { id: `import-${i}-${key}`, key, value, isSecret: true, dirty: true };
    })
    .filter(Boolean) as EnvVar[];
}

function toEnvString(vars: EnvVar[]): string {
  return vars.filter(v => v.key).map((v) => `${v.key}=${v.value}`).join("\n") + "\n";
}

function highlightEnv(text: string): React.ReactElement[] {
  return text.split("\n").map((line, i) => {
    if (line.trim().startsWith("#")) return <div key={i} className="text-muted-foreground/50 italic">{line}</div>;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return <div key={i}>{line || "\u00A0"}</div>;
    return (
      <div key={i}>
        <span className="text-blue-400">{line.slice(0, eqIdx)}</span>
        <span className="text-muted-foreground">=</span>
        <span className="text-green-400">{line.slice(eqIdx + 1)}</span>
      </div>
    );
  });
}

export default function EnvEditor({ projectId }: Props) {
  const { toast } = useToast();
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "file">("table");
  const [fileText, setFileText] = useState("");
  const [search, setSearch] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/project-secrets/${projectId}`, { credentials: "include" });
      if (res.ok) {
        const list: ServerSecret[] = await res.json();
        setVars(list.map((s, i) => ({ id: s.id || `s-${i}-${s.key}`, key: s.key, value: s.value, isSecret: true })));
      }
    } catch {} finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const filteredVars = useMemo(() => {
    if (!search) return vars;
    const q = search.toLowerCase();
    return vars.filter((v) => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q));
  }, [vars, search]);

  const persistVar = useCallback(async (v: EnvVar) => {
    if (!v.key.trim()) return;
    setVars(prev => prev.map(x => x.id === v.id ? { ...x, saving: true } : x));
    try {
      const res = await fetch(`${apiBase}/project-secrets/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: v.key, value: v.value, description: "" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVars(prev => prev.map(x => x.id === v.id ? { ...x, dirty: false, saving: false } : x));
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
      setVars(prev => prev.map(x => x.id === v.id ? { ...x, saving: false } : x));
    }
  }, [projectId, toast]);

  const switchToFile = useCallback(() => { setFileText(toEnvString(vars)); setViewMode("file"); }, [vars]);

  const switchToTable = useCallback(async () => {
    if (viewMode === "file" && fileText.trim()) {
      const parsed = parseEnvString(fileText);
      for (const p of parsed) await persistVar(p);
      await reload();
    }
    setViewMode("table");
  }, [viewMode, fileText, persistVar, reload]);

  const addVar = () => {
    setVars(prev => [...prev, { id: `new-${Date.now()}`, key: "", value: "", isSecret: true, dirty: true }]);
  };

  const updateVar = (id: string, field: "key" | "value", val: string) => {
    setVars(prev => prev.map(v => v.id === id ? { ...v, [field]: val, dirty: true } : v));
  };

  const handleBlur = (v: EnvVar) => { if (v.dirty && v.key.trim()) persistVar(v); };

  const deleteVar = async (v: EnvVar) => {
    if (!v.key) { setVars(prev => prev.filter(x => x.id !== v.id)); return; }
    try {
      const res = await fetch(`${apiBase}/project-secrets/${projectId}/${encodeURIComponent(v.key)}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setVars(prev => prev.filter(x => x.id !== v.id));
        toast({ title: `Deleted ${v.key}` });
      } else throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      toast({ title: "Delete failed", description: String(err), variant: "destructive" });
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExport = () => {
    const blob = new Blob([toEnvString(vars)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `.env`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported .env` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseEnvString(ev.target?.result as string);
      for (const p of parsed) await persistVar(p);
      await reload();
      toast({ title: `Imported ${parsed.length} variables` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="env-editor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-yellow-400/70" />
          <span className="font-medium text-xs">Project Secrets</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => (viewMode === "table" ? switchToFile() : switchToTable())} title={viewMode === "table" ? "View as .env" : "View as table"}>
            {viewMode === "table" ? <FileText className="w-3 h-3" /> : <Table className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()} title="Import .env"><Upload className="w-3 h-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExport} title="Export .env"><Download className="w-3 h-3" /></Button>
          <input ref={fileInputRef} type="file" accept=".env,.env.*,.txt" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {viewMode === "table" && (
        <div className="px-3 py-2 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-7 text-xs pl-7" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {viewMode === "table" ? (
          <div>
            <div className="grid grid-cols-[1fr_1fr_auto] text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 border-b border-border/20 bg-[hsl(222,47%,12%)]">
              <span>Key</span><span>Value</span><span className="w-20 text-center">Actions</span>
            </div>
            {filteredVars.map((v) => (
              <div key={v.id} className="grid grid-cols-[1fr_1fr_auto] items-center px-3 py-1 border-b border-border/10 hover:bg-white/[0.02] group">
                <div className="flex items-center gap-1.5 pr-2">
                  {v.saving ? <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" /> : v.dirty ? <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" /> : <Lock className="w-3 h-3 text-yellow-400/60 shrink-0" />}
                  <Input value={v.key} onChange={(e) => updateVar(v.id, "key", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} onBlur={() => handleBlur(v)} placeholder="KEY" className="h-6 text-xs font-mono bg-transparent border-none px-1 focus-visible:ring-0 text-blue-400" />
                </div>
                <div className="flex items-center pr-2">
                  <Input value={!revealedSecrets.has(v.id) ? "••••••••" : v.value} onChange={(e) => updateVar(v.id, "value", e.target.value)} onBlur={() => handleBlur(v)} placeholder="value" className="h-6 text-xs font-mono bg-transparent border-none px-1 focus-visible:ring-0 text-green-400" readOnly={!revealedSecrets.has(v.id)} />
                </div>
                <div className="flex items-center w-20 justify-end">
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => toggleReveal(v.id)}>
                    {revealedSecrets.has(v.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyValue(v.id, v.value)}>
                    {copiedId === v.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteVar(v)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            <button onClick={addVar} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5">
              <Plus className="w-3 h-3" /> Add Secret
            </button>
          </div>
        ) : (
          <div className="relative h-full">
            <textarea value={fileText} onChange={(e) => setFileText(e.target.value)} className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-xs p-3 resize-none outline-none z-10" spellCheck={false} />
            <div className="absolute inset-0 w-full h-full font-mono text-xs p-3 pointer-events-none whitespace-pre-wrap overflow-auto">{highlightEnv(fileText)}</div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border/30 bg-[hsl(222,47%,13%)] text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span>{vars.length} secret{vars.length !== 1 ? "s" : ""}</span>
        <span>Available in terminal as $KEY</span>
      </div>
    </div>
  );
}
