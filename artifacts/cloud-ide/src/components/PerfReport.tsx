import { useState } from "react";
import { X, Play, Loader2, Gauge, Accessibility, Shield, Search } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface LighthouseResult { id: string; url: string; scores: Record<string, number>; metrics: Record<string, number>; suggestions: { title: string; description: string; impact: string }[]; timestamp: string; }

interface Props { projectId: string; onClose: () => void; }

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{score}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function PerfReport({ projectId, onClose }: Props) {
  const [url, setUrl] = useState("https://example.com");
  const [result, setResult] = useState<LighthouseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/perf/audit`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="perf-report">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Gauge className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Performance Audit</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <input value={url} onChange={e => setUrl(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="URL to audit..." />
        <button onClick={runAudit} disabled={loading} className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Audit
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!result && !loading && <div className="flex items-center justify-center h-full text-muted-foreground text-xs"><div className="text-center"><Gauge className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>Enter a URL and run a Lighthouse audit</p></div></div>}
        {loading && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {result && (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-4 gap-3 bg-card/50 rounded-lg p-3 border border-border/30">
              <ScoreCircle score={result.scores.performance} label="Performance" />
              <ScoreCircle score={result.scores.accessibility} label="Accessibility" />
              <ScoreCircle score={result.scores.bestPractices} label="Best Practices" />
              <ScoreCircle score={result.scores.seo} label="SEO" />
            </div>
            <div className="bg-card/50 rounded-lg p-2.5 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Core Web Vitals</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">FCP</span> <span className="font-mono font-bold">{result.metrics.fcp.toFixed(1)}s</span></div>
                <div><span className="text-muted-foreground">LCP</span> <span className="font-mono font-bold">{result.metrics.lcp.toFixed(1)}s</span></div>
                <div><span className="text-muted-foreground">TBT</span> <span className="font-mono font-bold">{result.metrics.tbt.toFixed(0)}ms</span></div>
                <div><span className="text-muted-foreground">CLS</span> <span className="font-mono font-bold">{result.metrics.cls.toFixed(3)}</span></div>
                <div><span className="text-muted-foreground">SI</span> <span className="font-mono font-bold">{result.metrics.si.toFixed(1)}s</span></div>
                <div><span className="text-muted-foreground">TTI</span> <span className="font-mono font-bold">{result.metrics.tti.toFixed(1)}s</span></div>
              </div>
            </div>
            {result.suggestions.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggestions</div>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="bg-card/50 rounded p-2 border border-border/30">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.impact === "high" ? "bg-red-400" : s.impact === "medium" ? "bg-yellow-400" : "bg-blue-400"}`} />{s.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
