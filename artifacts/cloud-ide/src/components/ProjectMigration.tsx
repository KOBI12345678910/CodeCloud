import { useState } from "react";
import { X, ArrowRight, Loader2, CheckCircle2, Download, Zap } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function ProjectMigration({ projectId, onClose }: Props) {
  const [toPlan, setToPlan] = useState("pro");
  const [toOrg, setToOrg] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const createPlan = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/migrate/plan`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toPlan, toOrg: toOrg || undefined }) });
      if (res.ok) setPlan(await res.json());
    } catch {}
  };

  const executeMigration = async () => {
    setExecuting(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/migrate/execute`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toPlan, toOrg: toOrg || undefined }) });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setExecuting(false); }
  };

  const exportConfig = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/migrate/export`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "project-config.json"; a.click(); URL.revokeObjectURL(url);
      }
    } catch {} finally { setExporting(false); }
  };

  const stepIcon = (status: string) => status === "completed" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : status === "running" ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <div className="w-3 h-3 rounded-full border border-border" />;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="project-migration">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Project Migration</span></div>
        <div className="flex items-center gap-1">
          <button onClick={exportConfig} disabled={exporting} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border border-border rounded hover:bg-muted disabled:opacity-50"><Download className="w-2.5 h-2.5" /> Export Config</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!result ? (
          <>
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Migration Target</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Plan</label>
                  <select value={toPlan} onChange={e => setToPlan(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs mt-0.5">
                    <option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Organization (optional)</label>
                  <input value={toOrg} onChange={e => setToOrg(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs mt-0.5" placeholder="Org ID..." />
                </div>
              </div>
              <button onClick={createPlan} className="flex items-center gap-1 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"><Zap className="w-3 h-3" /> Create Migration Plan</button>
            </div>
            {plan && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Migration Steps</div>
                  <span className="text-[10px] text-muted-foreground">~{plan.estimatedTime}s estimated</span>
                </div>
                {plan.steps?.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-card/50 rounded p-2 border border-border/30 text-xs">
                    {stepIcon(step.status)}
                    <div><div className="font-medium">{step.name}</div><div className="text-[10px] text-muted-foreground">{step.description}</div></div>
                  </div>
                ))}
                <button onClick={executeMigration} disabled={executing} className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
                  {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />} Execute Migration
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-green-400/5 border border-green-400/20 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div><div className="text-xs font-bold text-green-400">Migration Complete</div><div className="text-[10px] text-muted-foreground">All steps completed successfully</div></div>
            </div>
            {result.steps?.map((step: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="flex-1">{step.name}</span>
                {step.duration && <span className="text-[10px] text-muted-foreground">{step.duration}s</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
