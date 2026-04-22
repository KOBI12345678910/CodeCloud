import { useState, useEffect } from "react";
import { X, Shield, AlertTriangle, CheckCircle2, Loader2, ExternalLink, Zap } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function SecurityPatch({ projectId, onClose }: Props) {
  const [vulns, setVulns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState(false);
  const [patchResult, setPatchResult] = useState<any>(null);

  useEffect(() => { fetch(`${API}/projects/${projectId}/security/vulnerabilities`, { credentials: "include" }).then(r => r.json()).then(setVulns).finally(() => setLoading(false)); }, [projectId]);

  const autoPatch = async () => {
    setPatching(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/security/auto-patch`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vulnerabilities: vulns }) });
      if (res.ok) setPatchResult(await res.json());
    } catch {} finally { setPatching(false); }
  };

  const sevColor = (s: string) => s === "critical" ? "text-red-400 bg-red-400/10" : s === "high" ? "text-orange-400 bg-orange-400/10" : s === "medium" ? "text-yellow-400 bg-yellow-400/10" : "text-blue-400 bg-blue-400/10";

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="security-patch">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Security Patching</span>{vulns.length > 0 && <span className="px-1.5 py-0.5 text-[10px] bg-red-400/10 text-red-400 rounded font-bold">{vulns.length} vulnerabilities</span>}</div>
        <div className="flex items-center gap-1">
          {vulns.length > 0 && !patchResult && <button onClick={autoPatch} disabled={patching} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded disabled:opacity-50">{patching ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />} Auto-Patch</button>}
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {patchResult && (
          <div className="flex items-start gap-2 bg-green-400/5 border border-green-400/20 rounded-lg p-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
            <div><div className="text-xs font-medium text-green-400">Patch Ready</div><div className="text-[10px] text-muted-foreground">Tests passed. {patchResult.vulnerabilities?.length} patches ready.</div>{patchResult.prUrl && <a href={patchResult.prUrl} className="flex items-center gap-1 text-[10px] text-primary mt-0.5"><ExternalLink className="w-2.5 h-2.5" /> View PR</a>}</div>
          </div>
        )}
        {vulns.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground text-xs"><div className="text-center"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No known vulnerabilities found</p></div></div> :
          vulns.map((v: any, i: number) => (
            <div key={i} className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="flex items-center gap-2 text-xs"><AlertTriangle className="w-3 h-3 text-muted-foreground" /><span className="font-mono font-bold">{v.name}</span><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${sevColor(v.severity)}`}>{v.severity}</span></div>
              <div className="text-[10px] text-muted-foreground mt-1">{v.description}</div>
              <div className="flex items-center gap-3 mt-1 text-[10px]"><span className="text-red-400">{v.currentVersion}</span><span className="text-muted-foreground">→</span><span className="text-green-400">{v.patchedVersion}</span><span className="text-muted-foreground font-mono">{v.cveId}</span></div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
