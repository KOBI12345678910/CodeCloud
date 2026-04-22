import { useState } from "react";
import { X, Wand2, Loader2, Database, Key, Link, Copy, Check, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const TYPE_COLOR: Record<string, string> = {
  serial: "text-purple-400", integer: "text-blue-400", varchar: "text-green-400", text: "text-cyan-400",
  boolean: "text-yellow-400", timestamp: "text-orange-400", jsonb: "text-pink-400", uuid: "text-indigo-400",
  float: "text-teal-400", decimal: "text-amber-400",
};

const REL_LABEL: Record<string, string> = { "one-to-one": "1:1", "one-to-many": "1:N", "many-to-many": "N:N" };

export function DataModelDesigner({ onClose }: Props) {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"diagram" | "migration">("diagram");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/ai/data-model`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }), credentials: "include" });
      if (r.ok) { const data = await r.json(); setResult(data); setExpanded(new Set(data.model.entities.map((e: any) => e.id))); }
    } catch {} finally { setLoading(false); }
  };

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const copySql = () => { navigator.clipboard.writeText(result.migration.sql); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="data-model-designer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Data Model Designer</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="px-3 pt-2 shrink-0">
        <div className="flex gap-2">
          <input value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="Describe your data model (e.g., 'blog with posts, comments, tags' or 'ecommerce store')..." className="flex-1 px-2 py-1.5 text-[10px] bg-muted/30 border border-border/30 rounded" />
          <button onClick={generate} disabled={loading || !description.trim()} className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Generate
          </button>
        </div>
      </div>
      {result && (
        <>
          <div className="flex gap-1 px-3 pt-2 shrink-0">
            <button onClick={() => setTab("diagram")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "diagram" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Entities ({result.model.entities.length})</button>
            <button onClick={() => setTab("migration")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "migration" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Migration SQL</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tab === "diagram" && (
              <>
                {result.model.entities.map((entity: any) => {
                  const isOpen = expanded.has(entity.id);
                  return (
                    <div key={entity.id} className="bg-card/50 rounded-lg border border-border/30">
                      <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => toggle(entity.id)}>
                        {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <Database className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold font-mono">{entity.name}</span>
                        <span className="text-[8px] text-muted-foreground">{entity.fields.length} fields</span>
                      </div>
                      {isOpen && (
                        <div className="px-2.5 pb-2 border-t border-border/20">
                          <table className="w-full text-[9px] mt-1.5">
                            <thead><tr className="text-muted-foreground">
                              <th className="text-left py-0.5 font-normal">Field</th>
                              <th className="text-left py-0.5 font-normal">Type</th>
                              <th className="text-left py-0.5 font-normal">Attrs</th>
                              <th className="text-left py-0.5 font-normal">FK</th>
                            </tr></thead>
                            <tbody>
                              {entity.fields.map((f: any, i: number) => (
                                <tr key={i} className="border-t border-border/10">
                                  <td className="py-1 font-mono flex items-center gap-1">
                                    {f.primary && <Key className="w-2.5 h-2.5 text-yellow-400" />}
                                    {f.foreignKey && <Link className="w-2.5 h-2.5 text-blue-400" />}
                                    {f.name}
                                  </td>
                                  <td className={`py-1 font-mono ${TYPE_COLOR[f.type] || ""}`}>{f.type}</td>
                                  <td className="py-1">
                                    <div className="flex gap-0.5">
                                      {f.unique && <span className="text-[7px] px-1 py-0.5 rounded bg-purple-400/10 text-purple-400">UQ</span>}
                                      {f.nullable && <span className="text-[7px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground">NULL</span>}
                                      {f.default && <span className="text-[7px] px-1 py-0.5 rounded bg-cyan-400/10 text-cyan-400">{f.default}</span>}
                                    </div>
                                  </td>
                                  <td className="py-1">{f.foreignKey && <span className="text-[8px] text-blue-400 font-mono">{f.foreignKey.entity}.{f.foreignKey.field}</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {result.model.relationships.length > 0 && (
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Relationships</div>
                    <div className="space-y-1">
                      {result.model.relationships.map((r: any) => (
                        <div key={r.id} className="bg-card/50 rounded-lg border border-border/30 p-2 flex items-center gap-2 text-[9px]">
                          <span className="font-mono font-medium">{r.from}</span>
                          <span className="text-muted-foreground">.{r.fromField}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono font-medium">{r.to}</span>
                          <span className="text-muted-foreground">.{r.toField}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 ml-auto">{REL_LABEL[r.type]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {tab === "migration" && (
              <div className="bg-card/50 rounded-lg border border-border/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-muted-foreground">{result.migration.description}</span>
                  <button onClick={copySql} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? "Copied" : "Copy SQL"}
                  </button>
                </div>
                <pre className="text-[9px] font-mono whitespace-pre-wrap text-green-400 bg-black/20 rounded p-2 max-h-[400px] overflow-y-auto">{result.migration.sql}</pre>
              </div>
            )}
          </div>
        </>
      )}
      {!result && !loading && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground">Describe your data model to generate entities and migrations</div>
      )}
    </div>
  );
}
