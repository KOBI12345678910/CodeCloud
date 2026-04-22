import { useState } from "react";
import { X, Package, Loader2, AlertTriangle, AlertCircle, Info, ArrowRight, Layers, Zap } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const SEVERITY_STYLES = { critical: "text-red-400 bg-red-400/10", warning: "text-yellow-400 bg-yellow-400/10", info: "text-blue-400 bg-blue-400/10" };
const SEVERITY_ICONS = { critical: AlertCircle, warning: AlertTriangle, info: Info };
const IMPACT_STYLES = { high: "bg-red-400/10 text-red-400", medium: "bg-yellow-400/10 text-yellow-400", low: "bg-blue-400/10 text-blue-400" };

const SAMPLE_DOCKERFILE = `FROM node:20
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y python3
RUN npm install
RUN npm run build
RUN npm prune --production
EXPOSE 3000
CMD ["node", "dist/index.js"]`;

export function ImageOptimizer({ projectId, onClose }: Props) {
  const [dockerfile, setDockerfile] = useState(SAMPLE_DOCKERFILE);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const analyze = async () => {
    if (!dockerfile.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/docker/analyze`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dockerfile }) });
      if (res.ok) setAnalysis(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const scoreColor = (s: number) => s >= 80 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="image-optimizer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Docker Image Optimizer</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dockerfile</div>
          <textarea value={dockerfile} onChange={e => setDockerfile(e.target.value)} rows={6} className="w-full bg-muted/30 font-mono text-[10px] p-2 rounded border border-border/30 outline-none focus:border-primary/50 resize-none" spellCheck={false} />
          <button onClick={analyze} disabled={loading} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Analyze & Optimize
          </button>
        </div>

        {analysis && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center">
                <div className={`text-lg font-bold ${scoreColor(analysis.score)}`}>{analysis.score}</div>
                <div className="text-[9px] text-muted-foreground">Score / 100</div>
              </div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center">
                <div className="text-xs font-bold">{analysis.currentSize}</div>
                <div className="text-[9px] text-muted-foreground">Current Size</div>
                <div className="text-[9px] text-green-400">{analysis.estimatedOptimizedSize} optimized</div>
              </div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center">
                <div className="text-lg font-bold text-green-400">-{analysis.savingsPercent}%</div>
                <div className="text-[9px] text-muted-foreground">Size Savings</div>
              </div>
            </div>

            {analysis.issues.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Issues ({analysis.issues.length})</div>
                {analysis.issues.map((issue: any) => {
                  const Icon = SEVERITY_ICONS[issue.severity as keyof typeof SEVERITY_ICONS];
                  return (
                    <div key={issue.id} className={`flex items-start gap-2 rounded border border-border/30 p-2 text-[10px] ${SEVERITY_STYLES[issue.severity as keyof typeof SEVERITY_STYLES]}`}>
                      <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{issue.message}</div>
                        <div className="font-mono text-[9px] opacity-70 truncate mt-0.5">Line {issue.line}: {issue.instruction}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggestions ({analysis.suggestions.length})</div>
                {analysis.suggestions.map((s: any) => (
                  <div key={s.id} className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
                    <button onClick={() => setExpandedSuggestion(expandedSuggestion === s.id ? null : s.id)} className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/30">
                      <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold ${IMPACT_STYLES[s.impact as keyof typeof IMPACT_STYLES]}`}>{s.impact}</span>
                      <span className="text-[10px] font-medium flex-1">{s.title}</span>
                      <ArrowRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedSuggestion === s.id ? "rotate-90" : ""}`} />
                    </button>
                    {expandedSuggestion === s.id && (
                      <div className="px-2 pb-2 space-y-1.5 border-t border-border/20 pt-1.5">
                        <div className="text-[10px] text-muted-foreground">{s.description}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><div className="text-[8px] text-red-400 uppercase mb-0.5">Before</div><pre className="text-[9px] font-mono bg-red-400/5 rounded p-1.5 whitespace-pre-wrap">{s.before}</pre></div>
                          <div><div className="text-[8px] text-green-400 uppercase mb-0.5">After</div><pre className="text-[9px] font-mono bg-green-400/5 rounded p-1.5 whitespace-pre-wrap">{s.after}</pre></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {analysis.layers.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Layers ({analysis.layers.length})</div>
                {analysis.layers.map((l: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] bg-card/50 rounded border border-border/30 p-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-mono flex-1 truncate">{l.instruction}</span>
                    <span className="text-muted-foreground">{l.size}</span>
                    <span className={`text-[8px] px-1 rounded ${l.cacheable ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>{l.cacheable ? "cached" : "rebuilt"}</span>
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
