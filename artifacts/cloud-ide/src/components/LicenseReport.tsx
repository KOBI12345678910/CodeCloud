import { useState, useEffect } from "react";
import { X, Shield, AlertTriangle, CheckCircle2, Download, Loader2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId: string; onClose: () => void; }

export function LicenseReport({ projectId, onClose }: Props) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/projects/${projectId}/licenses`, { credentials: "include" }).then(r => r.json()).then(setReport).finally(() => setLoading(false));
  }, [projectId]);

  const downloadSBOM = async () => {
    const res = await fetch(`${API}/projects/${projectId}/licenses/sbom`, { credentials: "include" });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sbom.json"; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="license-report">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">License Checker</span>
          {report?.incompatible?.length > 0 && <span className="px-1.5 py-0.5 text-[10px] bg-red-400/10 text-red-400 rounded font-bold">{report.incompatible.length} issues</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={downloadSBOM} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border border-border rounded hover:bg-muted"><Download className="w-3 h-3" /> SBOM</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {report && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-card/50 rounded p-2 border border-border/30 text-center"><div className="text-lg font-bold">{report.totalDependencies}</div><div className="text-[10px] text-muted-foreground">Total Deps</div></div>
              {Object.entries(report.licenses as Record<string, number>).slice(0, 3).map(([lic, count]) => (
                <div key={lic} className="bg-card/50 rounded p-2 border border-border/30 text-center"><div className="text-lg font-bold">{count as number}</div><div className="text-[10px] text-muted-foreground">{lic}</div></div>
              ))}
            </div>
            <div className="divide-y divide-border/20">
              {report.dependencies?.map((d: any) => (
                <div key={d.name} className="flex items-center gap-2 py-1.5 px-1 text-xs">
                  {d.compatible ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="flex-1 font-mono">{d.name}</span>
                  <span className="text-muted-foreground">{d.version}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${d.risk === "low" ? "bg-green-400/10 text-green-400" : d.risk === "medium" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>{d.license}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
