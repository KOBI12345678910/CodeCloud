import { useState, useEffect, useCallback } from "react";
import { X, Plus, Check, Trash2, Loader2, ListTodo, Clock, User } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Todo { id: string; title: string; description?: string; priority: string; status: string; completed: boolean; assignedTo?: string; dueDate?: string; sourceFile?: string; createdAt: string; }

interface Props { projectId: string; onClose: () => void; }

export function TodoPanel({ projectId, onClose }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const fetchTodos = useCallback(async () => {
    try { const res = await fetch(`${API}/projects/${projectId}/todos`, { credentials: "include" }); if (res.ok) setTodos(await res.json()); } catch {} finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API}/projects/${projectId}/todos`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), priority: newPriority }) });
      if (res.ok) { setNewTitle(""); fetchTodos(); }
    } catch {}
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await fetch(`${API}/todos/${todo.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !todo.completed }) });
      fetchTodos();
    } catch {}
  };

  const deleteTodo = async (id: string) => {
    try { await fetch(`${API}/todos/${id}`, { method: "DELETE", credentials: "include" }); fetchTodos(); } catch {}
  };

  const filtered = todos.filter(t => filter === "all" ? true : filter === "active" ? !t.completed : t.completed);
  const priorityColor = (p: string) => p === "high" ? "text-red-400 bg-red-400/10" : p === "low" ? "text-blue-400 bg-blue-400/10" : "text-yellow-400 bg-yellow-400/10";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="todo-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">TODOs</span>
          <span className="text-[10px] text-muted-foreground">{todos.filter(t => !t.completed).length} active</span>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "active", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-1.5 py-0.5 text-[10px] rounded ${filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
          <button onClick={onClose} className="ml-1 p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 shrink-0">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs" placeholder="New TODO..." />
        <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="bg-muted/50 border border-border/50 rounded px-1 py-1 text-xs">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <button onClick={addTodo} className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"><Plus className="w-3 h-3" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
          filtered.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No TODOs</div> :
          <div className="divide-y divide-border/20">
            {filtered.map(t => (
              <div key={t.id} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 ${t.completed ? "opacity-50" : ""}`}>
                <button onClick={() => toggleTodo(t)} className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.completed ? "bg-primary border-primary" : "border-border"}`}>
                  {t.completed && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${t.completed ? "line-through" : ""}`}>{t.title}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {t.dueDate && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{new Date(t.dueDate).toLocaleDateString()}</span>}
                    {t.assignedTo && <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{t.assignedTo}</span>}
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityColor(t.priority)}`}>{t.priority}</span>
                <button onClick={() => deleteTodo(t.id)} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
