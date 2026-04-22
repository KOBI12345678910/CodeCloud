import { useState, useMemo } from "react";
import { X, Search, Download, Eye, EyeOff, ArrowLeftRight, Variable, Copy, Check } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface EnvVar { key: string; value: string; source: "container" | "project" | "system"; sensitive: boolean; }

const ENVS: Record<string, EnvVar[]> = {
  development: [
    { key: "NODE_ENV", value: "development", source: "system", sensitive: false },
    { key: "PORT", value: "3000", source: "container", sensitive: false },
    { key: "DATABASE_URL", value: "postgres://user:pass@localhost:5432/dev_db", source: "project", sensitive: true },
    { key: "REDIS_URL", value: "redis://localhost:6379", source: "project", sensitive: false },
    { key: "API_KEY", value: "sk_dev_abc123def456", source: "project", sensitive: true },
    { key: "JWT_SECRET", value: "dev-secret-key-do-not-use", source: "project", sensitive: true },
    { key: "LOG_LEVEL", value: "debug", source: "container", sensitive: false },
    { key: "CORS_ORIGIN", value: "http://localhost:5173", source: "project", sensitive: false },
    { key: "AWS_REGION", value: "us-east-1", source: "project", sensitive: false },
    { key: "S3_BUCKET", value: "codecloud-dev-assets", source: "project", sensitive: false },
    { key: "SMTP_HOST", value: "smtp.mailtrap.io", source: "project", sensitive: false },
    { key: "SMTP_PASS", value: "abc123xyz", source: "project", sensitive: true },
  ],
  staging: [
    { key: "NODE_ENV", value: "staging", source: "system", sensitive: false },
    { key: "PORT", value: "8080", source: "container", sensitive: false },
    { key: "DATABASE_URL", value: "postgres://user:pass@staging-db:5432/staging_db", source: "project", sensitive: true },
    { key: "REDIS_URL", value: "redis://staging-redis:6379", source: "project", sensitive: false },
    { key: "API_KEY", value: "sk_stg_xyz789ghi012", source: "project", sensitive: true },
    { key: "JWT_SECRET", value: "staging-jwt-secret-key", source: "project", sensitive: true },
    { key: "LOG_LEVEL", value: "info", source: "container", sensitive: false },
    { key: "CORS_ORIGIN", value: "https://staging.codecloud.dev", source: "project", sensitive: false },
    { key: "AWS_REGION", value: "us-east-1", source: "project", sensitive: false },
    { key: "S3_BUCKET", value: "codecloud-staging-assets", source: "project", sensitive: false },
    { key: "SMTP_HOST", value: "smtp.sendgrid.net", source: "project", sensitive: false },
    { key: "SMTP_PASS", value: "SG.staging-key", source: "project", sensitive: true },
  ],
  production: [
    { key: "NODE_ENV", value: "production", source: "system", sensitive: false },
    { key: "PORT", value: "8080", source: "container", sensitive: false },
    { key: "DATABASE_URL", value: "postgres://prod_user:***@prod-db.internal:5432/prod", source: "project", sensitive: true },
    { key: "REDIS_URL", value: "redis://prod-redis.internal:6379", source: "project", sensitive: false },
    { key: "API_KEY", value: "sk_prod_LIVE_KEY_HERE", source: "project", sensitive: true },
    { key: "JWT_SECRET", value: "prod-256bit-secret", source: "project", sensitive: true },
    { key: "LOG_LEVEL", value: "warn", source: "container", sensitive: false },
    { key: "CORS_ORIGIN", value: "https://codecloud.dev", source: "project", sensitive: false },
    { key: "AWS_REGION", value: "us-east-1", source: "project", sensitive: false },
    { key: "S3_BUCKET", value: "codecloud-prod-assets", source: "project", sensitive: false },
    { key: "SMTP_HOST", value: "smtp.sendgrid.net", source: "project", sensitive: false },
    { key: "SMTP_PASS", value: "SG.prod-live-key", source: "project", sensitive: true },
    { key: "CDN_URL", value: "https://cdn.codecloud.dev", source: "project", sensitive: false },
  ],
};

const SRC_COLORS: Record<string, string> = { container: "text-blue-400 bg-blue-400/10", project: "text-green-400 bg-green-400/10", system: "text-yellow-400 bg-yellow-400/10" };

export function EnvInspector({ projectId, onClose }: Props) {
  const [env, setEnv] = useState<string>("development");
  const [search, setSearch] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [tab, setTab] = useState<"vars" | "diff">("vars");
  const [diffEnvA, setDiffEnvA] = useState("development");
  const [diffEnvB, setDiffEnvB] = useState("staging");
  const [copied, setCopied] = useState("");

  const vars = useMemo(() => {
    const list = ENVS[env] || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(v => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q));
  }, [env, search]);

  const diffData = useMemo(() => {
    const a = ENVS[diffEnvA] || [];
    const b = ENVS[diffEnvB] || [];
    const allKeys = [...new Set([...a.map(v => v.key), ...b.map(v => v.key)])].sort();
    return allKeys.map(key => {
      const va = a.find(v => v.key === key);
      const vb = b.find(v => v.key === key);
      const status = !va ? "added" : !vb ? "removed" : va.value !== vb.value ? "changed" : "same";
      return { key, a: va, b: vb, status };
    });
  }, [diffEnvA, diffEnvB]);

  const exportEnv = () => {
    const content = vars.map(v => `${v.key}=${v.value}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${env}.env`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(""), 1500);
  };

  const mask = (v: string) => showSecrets ? v : "•".repeat(Math.min(v.length, 20));
  const statusColor: Record<string, string> = { added: "bg-green-400/10 border-green-400/30", removed: "bg-red-400/10 border-red-400/30", changed: "bg-yellow-400/10 border-yellow-400/30", same: "border-border/30" };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="env-inspector">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Variable className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Environment Inspector</span></div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSecrets(v => !v)} className="p-0.5 hover:bg-muted rounded" title={showSecrets ? "Hide secrets" : "Show secrets"}>
            {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={exportEnv} className="p-0.5 hover:bg-muted rounded" title="Export as .env"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 pt-2 shrink-0">
        <div className="flex gap-1">
          <button onClick={() => setTab("vars")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "vars" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Variables</button>
          <button onClick={() => setTab("diff")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "diff" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}><ArrowLeftRight className="w-3 h-3 inline mr-1" />Diff</button>
        </div>
        {tab === "vars" && (
          <>
            <select value={env} onChange={e => setEnv(e.target.value)} className="text-[10px] bg-muted/30 border border-border/30 rounded px-2 py-1 outline-none">
              {Object.keys(ENVS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="flex-1 relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-6 pr-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded outline-none focus:border-primary/50" />
            </div>
          </>
        )}
        {tab === "diff" && (
          <>
            <select value={diffEnvA} onChange={e => setDiffEnvA(e.target.value)} className="text-[10px] bg-muted/30 border border-border/30 rounded px-2 py-1 outline-none">
              {Object.keys(ENVS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <ArrowLeftRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <select value={diffEnvB} onChange={e => setDiffEnvB(e.target.value)} className="text-[10px] bg-muted/30 border border-border/30 rounded px-2 py-1 outline-none">
              {Object.keys(ENVS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tab === "vars" && (
          <>
            <div className="text-[9px] text-muted-foreground mb-1">{vars.length} variable{vars.length !== 1 ? "s" : ""}</div>
            {vars.map(v => (
              <div key={v.key} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 px-2.5 py-1.5 group">
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${SRC_COLORS[v.source]}`}>{v.source}</span>
                <span className="text-[10px] font-mono font-medium w-32 truncate">{v.key}</span>
                <span className="flex-1 text-[10px] font-mono text-muted-foreground truncate">{v.sensitive ? mask(v.value) : v.value}</span>
                <button onClick={() => copyVal(v.key, v.value)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity">
                  {copied === v.key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </>
        )}
        {tab === "diff" && (
          <>
            <div className="flex gap-3 mb-2 text-[9px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400" /> Added in {diffEnvB}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> Removed in {diffEnvB}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400" /> Changed</span>
            </div>
            {diffData.filter(d => d.status !== "same").map(d => (
              <div key={d.key} className={`rounded border p-2 ${statusColor[d.status]}`}>
                <div className="text-[10px] font-mono font-medium mb-1">{d.key}</div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="truncate"><span className="text-muted-foreground">{diffEnvA}:</span> {d.a ? (d.a.sensitive ? mask(d.a.value) : d.a.value) : <span className="italic text-muted-foreground">not set</span>}</div>
                  <div className="truncate"><span className="text-muted-foreground">{diffEnvB}:</span> {d.b ? (d.b.sensitive ? mask(d.b.value) : d.b.value) : <span className="italic text-muted-foreground">not set</span>}</div>
                </div>
              </div>
            ))}
            {diffData.filter(d => d.status === "same").length > 0 && (
              <div className="text-[9px] text-muted-foreground mt-2">{diffData.filter(d => d.status === "same").length} identical variables hidden</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
