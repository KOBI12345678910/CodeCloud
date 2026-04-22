import { useState } from "react";
import { X, Plus, Save, Pencil, Check } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  openFiles: string[];
  layout: string;
}

interface Props {
  onWorkspaceChange?: (workspace: Workspace) => void;
}

export function WorkspaceTabs({ onWorkspaceChange }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: "1", name: "Default", openFiles: ["src/index.ts"], layout: "standard" },
    { id: "2", name: "Debug", openFiles: ["src/app.ts", "tests/app.test.ts"], layout: "debug" },
  ]);
  const [activeId, setActiveId] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const addWorkspace = () => {
    const ws: Workspace = { id: crypto.randomUUID(), name: `Workspace ${workspaces.length + 1}`, openFiles: [], layout: "standard" };
    setWorkspaces([...workspaces, ws]);
    setActiveId(ws.id);
    onWorkspaceChange?.(ws);
  };

  const removeWorkspace = (id: string) => {
    if (workspaces.length <= 1) return;
    setWorkspaces(workspaces.filter(w => w.id !== id));
    if (activeId === id) { const remaining = workspaces.filter(w => w.id !== id); setActiveId(remaining[0].id); onWorkspaceChange?.(remaining[0]); }
  };

  const startRename = (ws: Workspace) => { setEditingId(ws.id); setEditName(ws.name); };
  const finishRename = () => {
    if (editingId && editName.trim()) setWorkspaces(workspaces.map(w => w.id === editingId ? { ...w, name: editName.trim() } : w));
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-0.5 px-1 py-0.5 bg-card/30 border-b border-border/30 overflow-x-auto" data-testid="workspace-tabs">
      {workspaces.map(ws => (
        <div key={ws.id} onClick={() => { setActiveId(ws.id); onWorkspaceChange?.(ws); }} className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded cursor-pointer group ${activeId === ws.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
          {editingId === ws.id ? (
            <form onSubmit={e => { e.preventDefault(); finishRename(); }} className="flex items-center gap-0.5">
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-20 bg-muted/50 px-1 text-[10px] rounded outline-none" autoFocus onBlur={finishRename} />
              <button type="submit" className="p-0.5"><Check className="w-2.5 h-2.5" /></button>
            </form>
          ) : (
            <>
              <span onDoubleClick={() => startRename(ws)}>{ws.name}</span>
              {workspaces.length > 1 && (
                <button onClick={e => { e.stopPropagation(); removeWorkspace(ws.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <button onClick={addWorkspace} className="p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
    </div>
  );
}
