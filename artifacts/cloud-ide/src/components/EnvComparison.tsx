import { useState } from "react";
import { X, ArrowLeftRight, Check, AlertTriangle, Copy } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface EnvVar { key: string; dev: string; staging: string; prod: string; }

export function EnvComparison({ projectId, onClose }: Props) {
  const [vars] = useState<EnvVar[]>([
    { key: "DATABASE_URL", dev: "postgres://localhost/dev", staging: "postgres://staging/db", prod: "postgres://prod/db" },
    { key: "API_KEY", dev: "dev-key-123", staging: "stg-key-456", prod: "prod-key-789" },
    { key: "NODE_ENV", dev: "development", staging: "staging", prod: "production" },
    { key: "LOG_LEVEL", dev: "debug", staging: "info", prod: "warn" },
    { key: "REDIS_URL", dev: "redis://localhost", staging: "redis://staging", prod: "redis://prod" },
    { key: "CORS_ORIGIN", dev: "http://localhost:3000", staging: "https://staging.app.com", prod: "https://app.com" },
    { key: "DEBUG", dev: "true", staging: "false", prod: "" },
    { key: "SENTRY_DSN", dev: "", staging: "https://sentry.io/stg", prod: "https://sentry.io/prod" },
  ]);

  const hasDiff = (v: EnvVar) => v.dev !== v.staging || v.staging !== v.prod || v.dev !== v.prod;
  const missing = (val: string) => !val || val === "";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="env-comparison">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Environment Comparison</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-card/50 sticky top-0">
            <tr className="border-b border-border/30">
              <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider w-40">Variable</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Development</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Staging</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Production</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {vars.map(v => (
              <tr key={v.key} className={`hover:bg-muted/30 ${hasDiff(v) ? "" : ""}`}>
                <td className="px-3 py-1.5 font-mono font-bold">{v.key}</td>
                <td className={`px-3 py-1.5 font-mono ${missing(v.dev) ? "text-red-400 italic" : ""}`}>{missing(v.dev) ? "(not set)" : v.dev}</td>
                <td className={`px-3 py-1.5 font-mono ${missing(v.staging) ? "text-red-400 italic" : v.staging !== v.dev ? "text-yellow-400" : ""}`}>{missing(v.staging) ? "(not set)" : v.staging}</td>
                <td className={`px-3 py-1.5 font-mono ${missing(v.prod) ? "text-red-400 italic" : v.prod !== v.staging ? "text-yellow-400" : ""}`}>{missing(v.prod) ? "(not set)" : v.prod}</td>
                <td className="px-1">
                  {hasDiff(v) ? <AlertTriangle className="w-3 h-3 text-yellow-400" /> : <Check className="w-3 h-3 text-green-400" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
