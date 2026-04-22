import { useState, useEffect } from "react";
import { X, Copy, Loader2, AlertCircle, AlertTriangle, Info, FileCode, ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const SEV = { high: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" }, medium: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" }, low: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" } };

export function DuplicationReport({ projectId, onClose }: Props) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"blocks" | "files">("blocks");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/duplication/report`, { credentials: "include" }); if (r.ok) setReport(await r.json()); } catch {} finally { setLoading(false); }
  };

  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pctColor = (p: number) => p >= 15 ? "text-red-400" : p >= 8 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="duplication-report">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Copy className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Code Duplication Report</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : report && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className={`text-lg font-bold ${pctColor(report.duplicationPercentage)}`}>{report.duplicationPercentage}%</div><div className="text-[9px] text-muted-foreground">Duplication</div></div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className="text-lg font-bold">{report.blocks.length}</div><div className="text-[9px] text-muted-foreground">Blocks</div></div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className="text-lg font-bold">{report.duplicatedLines}</div><div className="text-[9px] text-muted-foreground">Dup Lines</div></div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className="text-lg font-bold">{report.totalLines.toLocaleString()}</div><div className="text-[9px] text-muted-foreground">Total Lines</div></div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setTab("blocks")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "blocks" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Duplicate Blocks</button>
              <button onClick={() => setTab("files")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "files" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>By File</button>
            </div>
            {tab === "blocks" && report.blocks.map((b: any) => {
              const cfg = SEV[b.severity as keyof typeof SEV];
              const Icon = cfg.icon;
              const isOpen = expanded.has(b.id);
              return (
                <div key={b.id} className="bg-card/50 rounded-lg border border-border/30">
                  <button onClick={() => toggle(b.id)} className="w-full text-left p-2.5 flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                    <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                    <span className="text-[10px] font-medium flex-1">{b.lines} lines duplicated in {b.occurrences.length} files</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{b.severity}</span>
                  </button>
                  {isOpen && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                      <pre className="text-[9px] font-mono bg-muted/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{b.code}</pre>
                      <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Found in:</div>
                        {b.occurrences.map((o: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <FileCode className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-mono">{o.file}</span>
                            <span className="text-muted-foreground">lines {o.startLine}-{o.endLine}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-1.5 text-[10px] bg-green-400/5 border border-green-400/20 rounded p-2">
                        <Lightbulb className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                        <span>{b.suggestion}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {tab === "files" && (
              <div className="space-y-1.5">
                {report.byFile.map((f: any) => (
                  <div key={f.file} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-medium truncate">{f.file}</span>
                      <span className={`text-[10px] font-medium ${pctColor(f.percentage)}`}>{f.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full ${f.percentage >= 15 ? "bg-red-400" : f.percentage >= 8 ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${Math.min(100, f.percentage)}%` }} />
                    </div>
                    <div className="flex gap-3 text-[9px] text-muted-foreground">
                      <span>{f.duplicatedLines} dup lines</span>
                      <span>{f.totalLines} total</span>
                      <span>{f.blockCount} block{f.blockCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
