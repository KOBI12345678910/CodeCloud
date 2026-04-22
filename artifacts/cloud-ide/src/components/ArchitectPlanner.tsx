import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Database, FileCode, Folder, Key, Layers, Link2, Loader2, Save, Server, Sparkles, Trash2, Wand2, X, Zap } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId?: string; onClose: () => void; onScaffolded?: () => void; }

interface FileNode { path: string; type: "file" | "dir"; description?: string; content?: string; children?: FileNode[]; }
interface SchemaField { name: string; type: string; primary?: boolean; nullable?: boolean; unique?: boolean; foreignKey?: { table: string; field: string }; }
interface SchemaTable { name: string; fields: SchemaField[]; description?: string; }
interface SchemaRelationship { from: string; to: string; type: string; description?: string; }
interface ApiEndpoint { method: string; path: string; description: string; auth?: boolean; }
interface ComponentNode { name: string; type: string; description: string; children?: ComponentNode[]; }
interface Plan {
  id?: string | null;
  title: string;
  description: string;
  techStack: { category: string; choice: string; reason: string }[];
  fileTree: FileNode[];
  schema: { tables: SchemaTable[]; relationships: SchemaRelationship[] };
  endpoints: ApiEndpoint[];
  components: ComponentNode[];
  scaffolded?: { done: boolean; fileCount: number };
}

const METHOD_COLOR: Record<string, string> = {
  GET: "text-green-400 bg-green-400/10",
  POST: "text-blue-400 bg-blue-400/10",
  PATCH: "text-yellow-400 bg-yellow-400/10",
  PUT: "text-yellow-400 bg-yellow-400/10",
  DELETE: "text-red-400 bg-red-400/10",
};

function FileTreeView({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(nodes.filter(n => n.type === "dir").map(n => n.path)));
  return (
    <div>
      {nodes.map(node => {
        const isOpen = open.has(node.path);
        return (
          <div key={node.path}>
            <div
              className="flex items-center gap-1.5 py-0.5 text-[10px] cursor-pointer hover:bg-muted/30 rounded px-1"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
              onClick={() => {
                if (node.type !== "dir") return;
                setOpen(s => { const n = new Set(s); n.has(node.path) ? n.delete(node.path) : n.add(node.path); return n; });
              }}
            >
              {node.type === "dir" ? (
                isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              ) : <span className="w-3" />}
              {node.type === "dir" ? <Folder className="w-3 h-3 text-blue-400" /> : <FileCode className="w-3 h-3 text-muted-foreground" />}
              <span className="font-mono">{node.path.split("/").pop()}</span>
              {node.description && <span className="text-muted-foreground/70 truncate"> — {node.description}</span>}
            </div>
            {node.type === "dir" && isOpen && node.children && <FileTreeView nodes={node.children} depth={depth + 1} />}
          </div>
        );
      })}
    </div>
  );
}

function ComponentTree({ nodes, depth = 0 }: { nodes: ComponentNode[]; depth?: number }) {
  return (
    <div>
      {nodes.map(n => (
        <div key={n.name + depth}>
          <div className="flex items-center gap-1.5 py-0.5 text-[10px]" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
            <Layers className="w-3 h-3 text-purple-400" />
            <span className="font-mono font-medium">{n.name}</span>
            <span className="text-[8px] px-1 rounded bg-muted/40 text-muted-foreground">{n.type}</span>
            <span className="text-muted-foreground/70 truncate">{n.description}</span>
          </div>
          {n.children && <ComponentTree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

export function ArchitectPlanner({ projectId, onClose, onScaffolded }: Props) {
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"stack" | "files" | "schema" | "api" | "components">("stack");
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  const loadSaved = async () => {
    try {
      const url = projectId ? `${API}/ai-architect/plans?projectId=${projectId}` : `${API}/ai-architect/plans`;
      const r = await fetch(url, { credentials: "include" });
      if (r.ok) setSavedPlans(await r.json());
    } catch {}
  };

  useEffect(() => { loadSaved(); }, [projectId]);

  const generate = async (save: boolean) => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/ai-architect/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description, projectId, save }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error || "Failed to generate plan");
      } else {
        const data = await r.json();
        setPlan(data);
        if (save) loadSaved();
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const scaffold = async () => {
    if (!plan?.id || !projectId) return;
    setScaffolding(true);
    setError(null);
    try {
      const r = await fetch(`${API}/ai-architect/plans/${plan.id}/scaffold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      const body = await r.json();
      if (!r.ok) {
        setError(body.error || "Scaffold failed");
      } else {
        setPlan(p => p ? { ...p, scaffolded: { done: true, fileCount: body.created } } : p);
        onScaffolded?.();
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setScaffolding(false);
    }
  };

  const openSaved = async (id: string) => {
    const r = await fetch(`${API}/ai-architect/plans/${id}`, { credentials: "include" });
    if (r.ok) { setPlan(await r.json()); setShowSaved(false); }
  };

  const deleteSaved = async (id: string) => {
    await fetch(`${API}/ai-architect/plans/${id}`, { method: "DELETE", credentials: "include" });
    loadSaved();
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="architect-planner">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">AI Architecture Planner</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaved(s => !s)}
            className="text-[10px] px-2 py-0.5 rounded hover:bg-muted/50 text-muted-foreground"
            data-testid="toggle-saved-plans"
          >Saved ({savedPlans.length})</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded" data-testid="close-architect">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showSaved && (
        <div className="border-b border-border/40 bg-card/30 max-h-40 overflow-y-auto">
          {savedPlans.length === 0 && <div className="p-3 text-[10px] text-muted-foreground">No saved plans yet.</div>}
          {savedPlans.map(p => (
            <div key={p.id ?? ""} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 text-[10px]" data-testid={`saved-plan-${p.id}`}>
              <button onClick={() => p.id && openSaved(p.id)} className="flex-1 text-left truncate">
                <span className="font-medium">{p.title}</span>
                <span className="text-muted-foreground ml-2 truncate">{p.description}</span>
              </button>
              {p.scaffolded?.done && <span className="text-[8px] text-green-400">scaffolded</span>}
              <button onClick={() => p.id && deleteSaved(p.id)} className="text-muted-foreground hover:text-red-400" data-testid={`delete-plan-${p.id}`}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 pt-2 shrink-0 space-y-2">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe your application... e.g. 'A blog with posts, comments, and tags' or 'A SaaS for managing tasks across teams'"
          className="w-full h-16 px-2 py-1.5 text-[10px] bg-muted/30 border border-border/30 rounded resize-none"
          data-testid="architect-input"
        />
        <div className="flex gap-2">
          <button
            onClick={() => generate(false)}
            disabled={loading || !description.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50"
            data-testid="generate-plan"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Generate
          </button>
          <button
            onClick={() => generate(true)}
            disabled={loading || !description.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-muted/40 text-foreground rounded hover:bg-muted/60 disabled:opacity-50"
            data-testid="generate-and-save"
          >
            <Save className="w-3 h-3" /> Generate & Save
          </button>
          {plan?.id && projectId && (
            <button
              onClick={scaffold}
              disabled={scaffolding || plan.scaffolded?.done}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 disabled:opacity-50 ml-auto"
              data-testid="scaffold-project"
            >
              {scaffolding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {plan.scaffolded?.done ? `Scaffolded (${plan.scaffolded.fileCount})` : "Accept & Scaffold"}
            </button>
          )}
        </div>
        {error && <div className="text-[10px] text-red-400" data-testid="architect-error">{error}</div>}
      </div>

      {plan && (
        <>
          <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground shrink-0">
            <span className="font-medium text-foreground">{plan.title}</span> — {plan.description}
          </div>
          <div className="flex gap-1 px-3 pt-1 shrink-0 border-b border-border/30">
            {[
              { key: "stack", label: "Tech Stack", icon: Server, count: plan.techStack.length },
              { key: "files", label: "Files", icon: Folder, count: 0 },
              { key: "schema", label: "Schema", icon: Database, count: plan.schema.tables.length },
              { key: "api", label: "API", icon: Link2, count: plan.endpoints.length },
              { key: "components", label: "Components", icon: Layers, count: plan.components.length },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setSection(t.key as any)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-t ${section === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
                  data-testid={`tab-${t.key}`}
                >
                  <Icon className="w-3 h-3" /> {t.label}{t.count > 0 ? ` (${t.count})` : ""}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {section === "stack" && (
              <div className="space-y-1.5">
                {plan.techStack.map((s, i) => (
                  <div key={i} className="bg-card/50 border border-border/30 rounded p-2 text-[10px]" data-testid={`stack-row-${i}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground w-20 shrink-0">{s.category}</span>
                      <span className="font-mono font-medium">{s.choice}</span>
                    </div>
                    <div className="text-muted-foreground/70 mt-0.5 ml-22">{s.reason}</div>
                  </div>
                ))}
              </div>
            )}
            {section === "files" && (
              <div className="bg-card/40 border border-border/30 rounded p-2">
                <FileTreeView nodes={plan.fileTree} />
              </div>
            )}
            {section === "schema" && (
              <div className="space-y-3">
                {plan.schema.tables.map(t => (
                  <div key={t.name} className="bg-card/50 border border-border/30 rounded" data-testid={`schema-table-${t.name}`}>
                    <div className="flex items-center gap-2 p-2 border-b border-border/20">
                      <Database className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold font-mono">{t.name}</span>
                      {t.description && <span className="text-[9px] text-muted-foreground">— {t.description}</span>}
                    </div>
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left px-2 py-1 font-normal">Field</th>
                          <th className="text-left px-2 py-1 font-normal">Type</th>
                          <th className="text-left px-2 py-1 font-normal">Attrs</th>
                          <th className="text-left px-2 py-1 font-normal">FK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.fields.map(f => (
                          <tr key={f.name} className="border-t border-border/10">
                            <td className="px-2 py-1 font-mono flex items-center gap-1">
                              {f.primary && <Key className="w-2.5 h-2.5 text-yellow-400" />}
                              {f.foreignKey && <Link2 className="w-2.5 h-2.5 text-blue-400" />}
                              {f.name}
                            </td>
                            <td className="px-2 py-1 font-mono text-cyan-400">{f.type}</td>
                            <td className="px-2 py-1">
                              {f.unique && <span className="text-[7px] px-1 rounded bg-purple-400/10 text-purple-400 mr-1">UQ</span>}
                              {f.nullable && <span className="text-[7px] px-1 rounded bg-muted/30 text-muted-foreground">NULL</span>}
                            </td>
                            <td className="px-2 py-1 font-mono text-blue-400">{f.foreignKey ? `${f.foreignKey.table}.${f.foreignKey.field}` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {plan.schema.relationships.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Relationships</div>
                    <div className="space-y-1">
                      {plan.schema.relationships.map((r, i) => (
                        <div key={i} className="text-[10px] font-mono bg-card/40 border border-border/20 rounded px-2 py-1">
                          {r.from} → {r.to} <span className="text-[9px] text-muted-foreground">({r.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {section === "api" && (
              <div className="space-y-1">
                {plan.endpoints.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card/40 border border-border/20 rounded px-2 py-1 text-[10px]" data-testid={`endpoint-${i}`}>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded w-12 text-center shrink-0 ${METHOD_COLOR[e.method] || "bg-muted/40"}`}>{e.method}</span>
                    <span className="font-mono">{e.path}</span>
                    <span className="text-muted-foreground/70 ml-2 truncate">{e.description}</span>
                    {e.auth && <span className="text-[8px] ml-auto text-yellow-400">auth</span>}
                  </div>
                ))}
              </div>
            )}
            {section === "components" && (
              <div className="bg-card/40 border border-border/30 rounded p-2">
                <ComponentTree nodes={plan.components} />
              </div>
            )}
          </div>
        </>
      )}

      {!plan && !loading && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground px-3 text-center">
          Describe your app idea to generate a complete architecture plan: tech stack, files, schema, API, and components.
        </div>
      )}
    </div>
  );
}
