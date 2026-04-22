import { useState } from "react";
import { X, Scan, Loader2, AlertTriangle, Shield, CheckCircle2, XOctagon } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

export function VulnScanner({ onClose }: Props) {
  const [imageName, setImageName] = useState("node:20-alpine");
  const [tag, setTag] = useState("latest");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    setLoading(true);
    try { const res = await fetch(`${API}/docker/scan`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageName, tag }) }); if (res.ok) setResult(await res.json()); } catch {} finally { setLoading(false); }
  };

  const sevColor = (s: string) => s === "critical" ? "text-red-400 bg-red-400/10" : s === "high" ? "text-orange-400 bg-orange-400/10" : s === "medium" ? "text-yellow-400 bg-yellow-400/10" : "text-blue-400 bg-blue-400/10";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="vuln-scanner">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Scan className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Image Vulnerability Scan</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <input value={imageName} onChange={e => setImageName(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="Image name..." />
        <span className="text-xs text-muted-foreground">:</span>
        <input value={tag} onChange={e => setTag(e.target.value)} className="w-20 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="Tag" />
        <button onClick={scan} disabled={loading} className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />} Scan</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!result && !loading && <div className="flex items-center justify-center h-full text-muted-foreground text-xs"><div className="text-center"><Shield className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>Enter an image name and scan for vulnerabilities</p></div></div>}
        {loading && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {result && (
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {result.status === "clean" ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
              <div><div className="text-xs font-bold">{result.imageName}:{result.imageTag}</div><div className="text-[10px] text-muted-foreground">{result.totalVulnerabilities} vulnerabilities found</div></div>
              {result.blockDeploy && <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 font-bold"><XOctagon className="w-3 h-3" /> Blocked</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-red-400/5 rounded p-1.5 text-center"><div className="text-sm font-bold text-red-400">{result.critical}</div><div className="text-[9px] text-muted-foreground">Critical</div></div>
              <div className="bg-orange-400/5 rounded p-1.5 text-center"><div className="text-sm font-bold text-orange-400">{result.high}</div><div className="text-[9px] text-muted-foreground">High</div></div>
              <div className="bg-yellow-400/5 rounded p-1.5 text-center"><div className="text-sm font-bold text-yellow-400">{result.medium}</div><div className="text-[9px] text-muted-foreground">Medium</div></div>
              <div className="bg-blue-400/5 rounded p-1.5 text-center"><div className="text-sm font-bold text-blue-400">{result.low}</div><div className="text-[9px] text-muted-foreground">Low</div></div>
            </div>
            {result.vulnerabilities?.map((v: any) => (
              <div key={v.id} className="bg-card/50 rounded p-2 border border-border/30 text-xs">
                <div className="flex items-center gap-2"><span className="font-mono font-bold">{v.package}</span><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${sevColor(v.severity)}`}>{v.severity}</span><span className="text-[10px] text-muted-foreground ml-auto">{v.cveId}</span></div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{v.description}</div>
                <div className="flex gap-2 mt-0.5 text-[10px]"><span className="text-red-400">{v.currentVersion}</span><span className="text-muted-foreground">→</span><span className="text-green-400">{v.fixedVersion}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
