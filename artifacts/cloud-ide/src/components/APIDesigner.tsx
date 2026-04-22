import { useState } from "react";
import { X, Wand2, Loader2, Copy, Check, Code, FileJson, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const METHOD_COLOR: Record<string, string> = { GET: "bg-green-400/10 text-green-400", POST: "bg-blue-400/10 text-blue-400", PUT: "bg-yellow-400/10 text-yellow-400", PATCH: "bg-orange-400/10 text-orange-400", DELETE: "bg-red-400/10 text-red-400" };

export function APIDesigner({ onClose }: Props) {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);
  const [sdk, setSdk] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"endpoints" | "spec" | "sdk">("endpoints");
  const [copied, setCopied] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const generate = async () => {
    if (!description.trim()) return;
    setLoading(true); setSdk(""); setExpanded(new Set());
    try { const r = await fetch(`${API}/ai/api-design`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) }); if (r.ok) { const d = await r.json(); setResult(d); setTab("endpoints"); } } catch {} finally { setLoading(false); }
  };

  const genSDK = async () => {
    if (!result?.endpoints) return;
    try { const r = await fetch(`${API}/ai/api-design/sdk`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoints: result.endpoints }) }); if (r.ok) { const d = await r.json(); setSdk(d.code); setTab("sdk"); } } catch {}
  };

  const copy = (key: string, text: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); };
  const toggle = (i: number) => setExpanded(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className="h-full flex flex-col bg-background" data-testid="api-designer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">API Design Assistant</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your API... e.g. 'User authentication with JWT' or 'E-commerce product catalog with shopping cart'" rows={2} className="w-full bg-muted/30 text-[11px] p-2 rounded border border-border/30 outline-none focus:border-primary/50 resize-none" />
          <button onClick={generate} disabled={loading || !description.trim()} className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Generate API Design
          </button>
        </div>
        {result && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button onClick={() => setTab("endpoints")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "endpoints" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Endpoints ({result.endpoints.length})</button>
                <button onClick={() => setTab("spec")} className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-1 ${tab === "spec" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}><FileJson className="w-3 h-3" />OpenAPI</button>
                <button onClick={() => { if (!sdk) genSDK(); else setTab("sdk"); }} className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-1 ${tab === "sdk" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}><Code className="w-3 h-3" />SDK</button>
              </div>
              <span className="text-[9px] text-muted-foreground">{result.title} v{result.version}</span>
            </div>

            {tab === "endpoints" && (
              <div className="space-y-1.5">
                {result.endpoints.map((e: any, i: number) => {
                  const isOpen = expanded.has(i);
                  return (
                    <div key={i} className="bg-card/50 rounded-lg border border-border/30">
                      <button onClick={() => toggle(i)} className="w-full text-left px-2.5 py-2 flex items-center gap-2">
                        {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${METHOD_COLOR[e.method] || ""}`}>{e.method}</span>
                        <span className="text-[10px] font-mono flex-1">{e.path}</span>
                        <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{e.summary}</span>
                      </button>
                      {isOpen && (
                        <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/20 pt-2">
                          {e.requestBody && (
                            <div>
                              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Request Body</div>
                              {Object.entries(e.requestBody.properties).map(([key, val]: any) => (
                                <div key={key} className="flex items-center gap-2 text-[10px] ml-2">
                                  <span className="font-mono font-medium">{key}</span>
                                  <span className="text-muted-foreground">{val.type}</span>
                                  {val.required && <span className="text-[8px] text-red-400">required</span>}
                                  {val.description && <span className="text-[9px] text-muted-foreground">— {val.description}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Responses</div>
                            {Object.entries(e.responses).map(([code, resp]: any) => (
                              <div key={code} className="flex items-center gap-2 text-[10px] ml-2">
                                <span className={`font-mono font-bold ${code.startsWith("2") ? "text-green-400" : code.startsWith("4") ? "text-yellow-400" : "text-red-400"}`}>{code}</span>
                                <span className="text-muted-foreground">{resp.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {result.suggestions.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Best Practice Suggestions</div>
                    {result.suggestions.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]"><Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" /><span>{s}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "spec" && (
              <div className="relative">
                <button onClick={() => copy("spec", result.openApiSpec)} className="absolute top-2 right-2 p-1 bg-muted/50 rounded hover:bg-muted">
                  {copied === "spec" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <pre className="text-[9px] font-mono bg-muted/30 rounded border border-border/30 p-3 overflow-auto max-h-60 whitespace-pre-wrap">{result.openApiSpec}</pre>
              </div>
            )}

            {tab === "sdk" && sdk && (
              <div className="relative">
                <button onClick={() => copy("sdk", sdk)} className="absolute top-2 right-2 p-1 bg-muted/50 rounded hover:bg-muted">
                  {copied === "sdk" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <pre className="text-[9px] font-mono bg-muted/30 rounded border border-border/30 p-3 overflow-auto max-h-60 whitespace-pre-wrap">{sdk}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
