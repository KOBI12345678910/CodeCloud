import { useState } from "react";
import { X, Paintbrush, Loader2, AlertCircle, AlertTriangle, Info, Lightbulb, Zap, BookOpen, CheckCircle2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const SEV_CFG = { error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" }, warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" }, info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" } };

const SAMPLE = `var name = "hello";\nconst x = 5;\nif (x == 5) {\n  console.log(name);\n}\nfunction getData(url) {\n  var result = fetch(url);\n  return result;\n}`;

export function StyleEnforcer({ onClose }: Props) {
  const [code, setCode] = useState(SAMPLE);
  const [analysis, setAnalysis] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"analyze" | "guide">("analyze");

  const analyze = async () => {
    setLoading(true);
    try { const res = await fetch(`${API}/ai/style/analyze`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); if (res.ok) setAnalysis(await res.json()); } catch {} finally { setLoading(false); }
  };

  const autoFormat = async () => {
    try { const res = await fetch(`${API}/ai/style/format`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); if (res.ok) { const r = await res.json(); setCode(r.formatted); analyze(); } } catch {}
  };

  const loadGuide = async () => {
    setLoading(true);
    try { const res = await fetch(`${API}/ai/style/guide`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: "CodeCloud" }) }); if (res.ok) setGuide(await res.json()); } catch {} finally { setLoading(false); }
  };

  const scoreColor = (s: number) => s >= 80 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="style-enforcer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Paintbrush className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Code Style Enforcer</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("analyze")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "analyze" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Analyze</button>
        <button onClick={() => { setTab("guide"); if (!guide) loadGuide(); }} className={`px-2.5 py-1 text-[10px] rounded ${tab === "guide" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Style Guide</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === "analyze" && (
          <>
            <textarea value={code} onChange={e => setCode(e.target.value)} rows={5} className="w-full bg-muted/30 font-mono text-[10px] p-2 rounded border border-border/30 outline-none focus:border-primary/50 resize-none" spellCheck={false} />
            <div className="flex gap-2">
              <button onClick={analyze} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paintbrush className="w-3 h-3" />} Analyze Style
              </button>
              <button onClick={autoFormat} className="flex items-center gap-1.5 px-3 py-1.5 border border-border/30 rounded text-xs hover:bg-muted/50"><Zap className="w-3 h-3" /> Auto-Fix</button>
            </div>
            {analysis && (
              <>
                <div className="flex items-center gap-3">
                  <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center flex-1"><div className={`text-lg font-bold ${scoreColor(analysis.score)}`}>{analysis.score}</div><div className="text-[9px] text-muted-foreground">Style Score</div></div>
                  <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center flex-1"><div className="text-lg font-bold">{analysis.violations.length}</div><div className="text-[9px] text-muted-foreground">Violations</div></div>
                </div>
                {analysis.consistencyMetrics && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Consistency</div>
                    {analysis.consistencyMetrics.map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className="w-28 truncate">{m.metric}</span>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.score >= 90 ? "bg-green-400" : m.score >= 70 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${m.score}%` }} /></div>
                        <span className={`w-8 text-right ${m.score >= 90 ? "text-green-400" : m.score >= 70 ? "text-yellow-400" : "text-red-400"}`}>{m.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {analysis.violations.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Violations</div>
                    {analysis.violations.map((v: any) => {
                      const cfg = SEV_CFG[v.severity as keyof typeof SEV_CFG];
                      const Icon = cfg.icon;
                      return (
                        <div key={v.id} className={`flex items-start gap-1.5 rounded border border-border/30 p-1.5 text-[10px] ${cfg.bg}`}>
                          <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0"><span className="font-medium">{v.message}</span><div className="text-[9px] opacity-70">Line {v.line} · {v.rule}</div></div>
                          {v.fix && <span className="text-[8px] px-1 rounded bg-green-400/10 text-green-400 shrink-0">fixable</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {analysis.suggestions.length > 0 && (
                  <div className="space-y-1">
                    {analysis.suggestions.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]"><Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" /><span>{s}</span></div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {tab === "guide" && (loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : guide && (
          <div className="space-y-3">
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /><span className="text-xs font-medium">{guide.projectName} Style Guide</span></div>
            {guide.sections.map((sec: any, i: number) => (
              <div key={i} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="text-[10px] font-medium mb-1.5">{sec.title}</div>
                <div className="space-y-1">
                  {sec.rules.map((r: string, j: number) => (
                    <div key={j} className="flex items-start gap-1.5 text-[10px]"><CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" /><span>{r}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
