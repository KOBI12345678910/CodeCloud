import { useState, useEffect } from "react";
import { X, Shield, Loader2, ToggleLeft, ToggleRight, Trash2, ArrowDown, ArrowUp, ArrowLeftRight, Ban, Check, Layout } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const DIR_ICON: Record<string, any> = { ingress: ArrowDown, egress: ArrowUp, both: ArrowLeftRight };
const DIR_COLOR: Record<string, string> = { ingress: "text-blue-400 bg-blue-400/10", egress: "text-orange-400 bg-orange-400/10", both: "text-purple-400 bg-purple-400/10" };
const ACT_STYLE: Record<string, { icon: any; color: string }> = { allow: { icon: Check, color: "text-green-400" }, deny: { icon: Ban, color: "text-red-400" } };

export function NetworkPolicies({ projectId, onClose }: Props) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"policies" | "templates">("policies");

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetch(`${API}/network-policies/${projectId}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/network-policies-templates`, { credentials: "include" }).then(r => r.json()),
      ]);
      setPolicies(p); setTemplates(t);
    } catch {} finally { setLoading(false); }
  };

  const toggle = async (id: string) => {
    try { const r = await fetch(`${API}/network-policies/${id}/toggle`, { method: "PATCH", credentials: "include" }); if (r.ok) { const u = await r.json(); setPolicies(p => p.map(x => x.id === id ? u : x)); } } catch {}
  };

  const remove = async (id: string) => {
    try { const r = await fetch(`${API}/network-policies/${id}`, { method: "DELETE", credentials: "include" }); if (r.ok) setPolicies(p => p.filter(x => x.id !== id)); } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="network-policies">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Network Policies</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("policies")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "policies" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Policies ({policies.length})</button>
        <button onClick={() => setTab("templates")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "templates" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}><Layout className="w-3 h-3 inline mr-1" />Templates</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : <>
          {tab === "policies" && policies.sort((a, b) => a.priority - b.priority).map(p => {
            const DirIcon = DIR_ICON[p.direction] || ArrowLeftRight;
            const ActCfg = ACT_STYLE[p.action];
            const ActIcon = ActCfg.icon;
            return (
              <div key={p.id} className={`bg-card/50 rounded-lg border p-2.5 transition-opacity ${p.enabled ? "border-border/30" : "border-border/20 opacity-50"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <ActIcon className={`w-3.5 h-3.5 ${ActCfg.color}`} />
                    <span className="text-xs font-medium">{p.name}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${DIR_COLOR[p.direction]}`}><DirIcon className="w-2.5 h-2.5" />{p.direction}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-muted-foreground">P{p.priority}</span>
                    <button onClick={() => toggle(p.id)} className="p-0.5 hover:bg-muted rounded">
                      {p.enabled ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => remove(p.id)} className="p-0.5 hover:bg-muted rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div><span className="text-muted-foreground">Source:</span> <span className="font-mono">{p.source}</span></div>
                  <div><span className="text-muted-foreground">Dest:</span> <span className="font-mono">{p.destination}</span></div>
                  <div><span className="text-muted-foreground">Ports:</span> <span className="font-mono">{p.ports.length > 0 ? p.ports.join(", ") : "all"}</span></div>
                  <div><span className="text-muted-foreground">Proto:</span> <span className="font-mono">{p.protocol}</span></div>
                </div>
              </div>
            );
          })}
          {tab === "templates" && templates.map((t: any) => (
            <div key={t.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{t.name}</span>
                <span className="text-[9px] text-muted-foreground">{t.policies.length} rules</span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2">{t.description}</div>
              <div className="space-y-1">
                {t.policies.map((p: any, i: number) => {
                  const ActCfg = ACT_STYLE[p.action];
                  const ActIcon = ActCfg.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-[9px] bg-muted/20 rounded px-2 py-1">
                      <ActIcon className={`w-2.5 h-2.5 ${ActCfg.color}`} />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.source} → {p.destination}</span>
                      {p.ports.length > 0 && <span className="font-mono text-muted-foreground">:{p.ports.join(",")}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}
