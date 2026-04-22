import { useEffect, useMemo, useState, useCallback } from "react";
import { Package, Plus, Trash2, Search, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Runtime = "npm" | "pip";

interface InstalledPackage {
  name: string;
  version: string;
  runtime: Runtime;
}

interface NpmHit {
  package: { name: string; version: string; description?: string; links?: { npm?: string } };
}

interface Props {
  projectId?: string;
  files?: Array<{ name: string; path: string; content?: string | null; isDirectory: boolean }>;
  onShellCommand?: (command: string) => void;
}

function parseInstalled(files: Props["files"], runtime: Runtime): InstalledPackage[] {
  if (!files) return [];
  if (runtime === "npm") {
    const pkg = files.find(f => !f.isDirectory && (f.path === "package.json" || f.name === "package.json"));
    if (!pkg?.content) return [];
    try {
      const json = JSON.parse(pkg.content);
      const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
      return Object.entries(deps).map(([name, version]) => ({ name, version: String(version), runtime: "npm" as const }));
    } catch { return []; }
  }
  const req = files.find(f => !f.isDirectory && (f.name === "requirements.txt"));
  if (!req?.content) return [];
  return req.content.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#")).map(l => {
    const m = l.match(/^([A-Za-z0-9_.\-]+)\s*([<>=!~]+\s*[\w.\-*]+)?/);
    return { name: m?.[1] || l, version: m?.[2]?.replace(/\s+/g, "") || "*", runtime: "pip" as const };
  });
}

export default function PackagesPanel({ projectId, files, onShellCommand }: Props) {
  const { toast } = useToast();
  const [runtime, setRuntime] = useState<Runtime>("npm");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NpmHit[]>([]);
  const [searching, setSearching] = useState(false);

  const installed = useMemo(() => parseInstalled(files, runtime), [files, runtime]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        if (runtime === "npm") {
          const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=10`, { signal: ctrl.signal });
          const data = await res.json();
          setResults(data.objects || []);
        } else {
          const res = await fetch(`https://pypi.org/search/?q=${encodeURIComponent(q)}&format=json`, { signal: ctrl.signal }).catch(() => null);
          if (res?.ok) {
            const data = await res.json();
            const items = (data.results || data || []).slice(0, 10);
            setResults(items.map((p: any) => ({ package: { name: p.name || p, version: p.version || "latest", description: p.description } })));
          } else {
            setResults([{ package: { name: q, version: "latest", description: "Press Install to add this package" } }]);
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally { setSearching(false); }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [query, runtime]);

  const install = useCallback((name: string) => {
    const cmd = runtime === "npm" ? `npm install ${name}` : `pip install ${name}`;
    if (onShellCommand) {
      onShellCommand(cmd);
      toast({ title: `Installing ${name}`, description: "Running in terminal — check output below" });
    } else {
      toast({ title: "Open Terminal", description: `Run: ${cmd}` });
    }
    setQuery("");
  }, [runtime, onShellCommand, toast]);

  const remove = useCallback((name: string) => {
    const cmd = runtime === "npm" ? `npm uninstall ${name}` : `pip uninstall -y ${name}`;
    if (onShellCommand) {
      onShellCommand(cmd);
      toast({ title: `Uninstalling ${name}` });
    } else {
      toast({ title: "Open Terminal", description: `Run: ${cmd}` });
    }
  }, [runtime, onShellCommand, toast]);

  const installedNames = useMemo(() => new Set(installed.map(p => p.name)), [installed]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-sidebar-border/70 space-y-2">
        <div className="flex rounded-md border border-border/50 overflow-hidden text-[11px]">
          {(["npm", "pip"] as const).map((rt) => (
            <button key={rt} onClick={() => setRuntime(rt)} className={`flex-1 h-6 ${runtime === rt ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`} data-testid={`runtime-${rt}`}>{rt}</button>
          ))}
        </div>
        <div className="relative">
          {searching ? <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" /> : <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />}
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) install(query.trim()); }} placeholder={`Search ${runtime}…`} className="h-7 pl-7 pr-7 text-xs" data-testid="input-search-package" />
          {query && <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
        </div>
        {results.length > 0 && (
          <div className="rounded-md border border-border/50 bg-popover/60 max-h-60 overflow-auto divide-y divide-border/30">
            {results.map((r) => (
              <div key={r.package.name} className="flex items-start gap-2 px-2 py-1.5 hover:bg-accent/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{r.package.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{r.package.version}</span>
                    {installedNames.has(r.package.name) && <span className="text-[9px] text-green-400">installed</span>}
                  </div>
                  {r.package.description && <div className="text-[10px] text-muted-foreground truncate">{r.package.description}</div>}
                </div>
                {r.package.links?.npm && <a href={r.package.links.npm} target="_blank" rel="noopener" className="opacity-50 hover:opacity-100"><ExternalLink className="w-3 h-3" /></a>}
                {!installedNames.has(r.package.name) && (
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => install(r.package.name)} title={`Install ${r.package.name}`}><Plus className="w-3 h-3 text-primary" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
        {query && !searching && results.length === 0 && (
          <Button size="sm" className="h-7 w-full text-xs gap-1" onClick={() => install(query.trim())}>
            <Plus className="w-3 h-3" /> Install "{query}"
          </Button>
        )}
        <div className="text-[10px] text-muted-foreground">{installed.length} {runtime} package{installed.length === 1 ? "" : "s"} in {runtime === "npm" ? "package.json" : "requirements.txt"}</div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {installed.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No {runtime} packages.<br />
            {runtime === "npm" ? "Add a package.json or search above." : "Add a requirements.txt or search above."}
          </div>
        )}
        {installed.map((pkg) => (
          <div key={`${pkg.runtime}:${pkg.name}`} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40">
            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{pkg.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">{pkg.version}</div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => remove(pkg.name)} title={`Uninstall ${pkg.name}`}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
