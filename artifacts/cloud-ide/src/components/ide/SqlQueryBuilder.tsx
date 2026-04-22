import { useState } from "react";
import { X, Database, Play, Loader2, Lightbulb, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

export function SqlQueryBuilder({ onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/sql/generate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="sql-query-builder">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">SQL Query Builder</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="Ask in plain English: 'Count all active users'" className="flex-1 bg-muted/50 px-2 py-1.5 text-xs rounded outline-none border border-border/30 focus:border-primary/50" />
          <button onClick={generate} disabled={loading} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
        {result && (
          <>
            <div className="bg-card/50 rounded-lg border border-border/30 p-3">
              <div className="text-[10px] text-muted-foreground mb-1">Generated SQL</div>
              <pre className="text-xs font-mono bg-muted/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{result.sql}</pre>
            </div>
            <div className="text-xs text-muted-foreground">{result.explanation}</div>
            {result.plan && (
              <div className="bg-card/50 rounded-lg border border-border/30 p-3">
                <div className="text-[10px] text-muted-foreground mb-1">Query Plan</div>
                <div className="text-[10px] font-mono space-y-0.5">
                  <div className="flex items-center gap-1"><ChevronRight className="w-2.5 h-2.5" /> {result.plan.type} (cost: {result.plan.cost}, rows: {result.plan.rows})</div>
                  {result.plan.children?.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-1 pl-4"><ChevronRight className="w-2.5 h-2.5 text-muted-foreground" /> {c.type} (cost: {c.cost}, rows: {c.rows})</div>
                  ))}
                </div>
              </div>
            )}
            {result.optimizations.length > 0 && (
              <div className="space-y-1">
                {result.optimizations.map((o: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]"><Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" /><span>{o}</span></div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
