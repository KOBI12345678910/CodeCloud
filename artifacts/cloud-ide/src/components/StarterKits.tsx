import { useState, useEffect } from "react";
import { X, Rocket, PenTool, ShoppingCart, MessageCircle, Search, Check, Clock, Star, ChevronRight, Loader2, Package } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; onSelect?: (kitId: string) => void; }

interface StarterKit {
  id: string; name: string; category: string; description: string; icon: string;
  tags: string[]; features: { name: string; description: string; included: boolean }[];
  stack: { name: string; category: string; version?: string }[];
  files: { path: string; description: string }[];
  estimatedSetupTime: number; difficulty: string;
}

const ICONS: Record<string, any> = { rocket: Rocket, "pen-tool": PenTool, "shopping-cart": ShoppingCart, "message-circle": MessageCircle };
const DIFFICULTY_COLOR: Record<string, string> = { beginner: "text-green-400 bg-green-400/10", intermediate: "text-yellow-400 bg-yellow-400/10", advanced: "text-red-400 bg-red-400/10" };
const STACK_COLOR: Record<string, string> = { frontend: "bg-blue-400/10 text-blue-400", backend: "bg-green-400/10 text-green-400", database: "bg-purple-400/10 text-purple-400", auth: "bg-yellow-400/10 text-yellow-400", payments: "bg-orange-400/10 text-orange-400", realtime: "bg-cyan-400/10 text-cyan-400" };

export function StarterKits({ onClose, onSelect }: Props) {
  const [kits, setKits] = useState<StarterKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StarterKit | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/starter-kits`, { credentials: "include" });
        if (res.ok) setKits(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const filtered = kits.filter(k => !search || k.name.toLowerCase().includes(search.toLowerCase()) || k.tags.some(t => t.includes(search.toLowerCase())));

  return (
    <div className="h-full flex flex-col bg-background" data-testid="starter-kits">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Starter Kits</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>

      {!selected ? (
        <>
          <div className="px-3 py-1.5 border-b border-border/30 shrink-0">
            <div className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
              <Search className="w-3 h-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none" placeholder="Search starter kits..." />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : filtered.map(kit => {
              const Icon = ICONS[kit.icon] || Rocket;
              return (
                <button key={kit.id} onClick={() => setSelected(kit)} className="w-full text-left bg-card/50 rounded-lg border border-border/30 p-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0"><Icon className="w-4.5 h-4.5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{kit.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${DIFFICULTY_COLOR[kit.difficulty] || ""}`}>{kit.difficulty}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{kit.description}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {kit.estimatedSetupTime}min</span>
                        <span className="text-[9px] text-muted-foreground">{kit.features.filter(f => f.included).length} features</span>
                        <span className="text-[9px] text-muted-foreground">{kit.stack.length} tools</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kit.tags.slice(0, 4).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <button onClick={() => setSelected(null)} className="text-[10px] text-primary hover:underline">← Back to kits</button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {(() => { const Icon = ICONS[selected.icon] || Rocket; return <Icon className="w-5 h-5 text-primary" />; })()}
            </div>
            <div>
              <h2 className="text-sm font-bold">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${DIFFICULTY_COLOR[selected.difficulty] || ""}`}>{selected.difficulty}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {selected.estimatedSetupTime} min setup</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{selected.description}</p>

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Tech Stack</div>
            <div className="flex flex-wrap gap-1">
              {selected.stack.map(s => (
                <span key={s.name} className={`text-[9px] px-1.5 py-0.5 rounded ${STACK_COLOR[s.category] || "bg-muted text-muted-foreground"}`}>
                  {s.name}{s.version ? ` v${s.version}` : ""}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Features</div>
            <div className="grid grid-cols-2 gap-1">
              {selected.features.map(f => (
                <div key={f.name} className="flex items-start gap-1.5 text-[10px]">
                  <Check className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                  <div><div className="font-medium">{f.name}</div><div className="text-[9px] text-muted-foreground">{f.description}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Project Structure</div>
            <div className="space-y-1">
              {selected.files.map(f => (
                <div key={f.path} className="flex items-center gap-2 bg-muted/30 rounded p-1.5">
                  <span className="font-mono text-[10px] text-primary">{f.path}</span>
                  <span className="text-[9px] text-muted-foreground truncate">{f.description}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { onSelect?.(selected.id); onClose(); }} className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">
            <Rocket className="w-3.5 h-3.5" /> Use This Starter Kit
          </button>
        </div>
      )}
    </div>
  );
}
