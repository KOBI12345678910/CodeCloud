import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Loader2, Flag, Calendar, CheckCircle2, Circle,
  ChevronLeft, Trash2, Link2, Unlink, BarChart3, Clock, Target
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Task {
  id: string;
  title: string;
  completed: boolean;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
  description?: string;
  createdAt?: string;
}

interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "open" | "closed";
  progress: number;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  projectId: string;
  onClose: () => void;
}

type View = "list" | "detail" | "timeline";

function ProgressBar({ progress, className = "" }: { progress: number; className?: string }) {
  const color = progress === 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${progress}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: "open" | "closed" }) {
  return status === "open" ? (
    <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-medium">Open</span>
  ) : (
    <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-500/15 text-gray-400 font-medium">Closed</span>
  );
}

function DueDateLabel({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-[10px] text-muted-foreground">No due date</span>;
  const d = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diff < 0;
  const isSoon = diff >= 0 && diff <= 3;
  const color = isOverdue ? "text-red-400" : isSoon ? "text-amber-400" : "text-muted-foreground";
  const label = isOverdue ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Due today" : `${diff}d left`;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] ${color}`}>
      <Calendar className="w-2.5 h-2.5" />
      {d.toLocaleDateString()} ({label})
    </span>
  );
}

function MilestoneList({
  milestones,
  filter,
  setFilter,
  onSelect,
  onViewTimeline,
  onCreateNew,
  loading,
}: {
  milestones: Milestone[];
  filter: "all" | "open" | "closed";
  setFilter: (f: "all" | "open" | "closed") => void;
  onSelect: (m: Milestone) => void;
  onViewTimeline: () => void;
  onCreateNew: () => void;
  loading: boolean;
}) {
  const filtered = milestones.filter(m => filter === "all" ? true : m.status === filter);

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 shrink-0">
        {(["all", "open", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-1.5 py-0.5 text-[10px] rounded capitalize ${filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
        ))}
        <div className="flex-1" />
        <button onClick={onViewTimeline} className="px-1.5 py-0.5 text-[10px] rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1">
          <BarChart3 className="w-2.5 h-2.5" /> Timeline
        </button>
        <button onClick={onCreateNew} className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2">
            <Target className="w-8 h-8 opacity-20" />
            <p>No milestones yet</p>
            <button onClick={onCreateNew} className="text-primary hover:underline text-xs">Create one</button>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors"
                data-testid={`milestone-item-${m.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate flex-1 mr-2">{m.title}</span>
                  <StatusBadge status={m.status} />
                </div>
                {m.description && <p className="text-[10px] text-muted-foreground truncate mb-1.5">{m.description}</p>}
                <ProgressBar progress={m.progress} className="mb-1.5" />
                <div className="flex items-center justify-between">
                  <DueDateLabel dueDate={m.dueDate} />
                  <span className="text-[10px] text-muted-foreground">{m.completedTasks}/{m.totalTasks} tasks ({m.progress}%)</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MilestoneDetail({
  milestone,
  projectId,
  onBack,
  onRefresh,
}: {
  milestone: Milestone;
  projectId: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [ms, setMs] = useState(milestone);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDesc, setEditDesc] = useState(milestone.description || "");
  const [editDue, setEditDue] = useState(milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : "");

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`${API}/milestones/${milestone.id}`, { credentials: "include" });
      if (res.ok) setMs(await res.json());
    } catch {}
  }, [milestone.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const fetchAvailableTasks = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/todos`, { credentials: "include" });
      if (res.ok) {
        const todos: Task[] = await res.json();
        const linkedIds = new Set(ms.tasks.map(t => t.id));
        setAvailableTasks(todos.filter(t => !linkedIds.has(t.id)));
      }
    } catch {}
  };

  const linkTask = async (todoId: string) => {
    try {
      const res = await fetch(`${API}/milestones/${ms.id}/tasks`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId }),
      });
      if (res.ok) { fetchDetail(); onRefresh(); setShowLinkPicker(false); }
    } catch {}
  };

  const unlinkTask = async (todoId: string) => {
    try {
      const res = await fetch(`${API}/milestones/${ms.id}/tasks/${todoId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok || res.status === 204) { fetchDetail(); onRefresh(); }
    } catch {}
  };

  const updateMilestone = async () => {
    try {
      const res = await fetch(`${API}/milestones/${ms.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, description: editDesc || null, dueDate: editDue || null }),
      });
      if (res.ok) { setEditing(false); fetchDetail(); onRefresh(); }
    } catch {}
  };

  const toggleStatus = async () => {
    const newStatus = ms.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`${API}/milestones/${ms.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { fetchDetail(); onRefresh(); }
    } catch {}
  };

  const deleteMilestone = async () => {
    try {
      const res = await fetch(`${API}/milestones/${ms.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok || res.status === 204) { onRefresh(); onBack(); }
    } catch {}
  };

  const priorityColor = (p?: string) => p === "high" ? "text-red-400" : p === "low" ? "text-blue-400" : "text-yellow-400";

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <button onClick={onBack} className="p-0.5 hover:bg-muted rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
        {editing ? (
          <div className="flex-1 flex items-center gap-1">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-xs" />
            <button onClick={updateMilestone} className="px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded">Save</button>
            <button onClick={() => setEditing(false)} className="px-2 py-0.5 text-[10px] text-muted-foreground">Cancel</button>
          </div>
        ) : (
          <>
            <span className="text-xs font-medium truncate flex-1" onDoubleClick={() => setEditing(true)}>{ms.title}</span>
            <StatusBadge status={ms.status} />
          </>
        )}
        <button onClick={toggleStatus} className="text-[10px] text-muted-foreground hover:text-foreground px-1">
          {ms.status === "open" ? "Close" : "Reopen"}
        </button>
        <button onClick={deleteMilestone} className="p-0.5 text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-3 h-3" /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 border-b border-border/20 space-y-2">
          {editing ? (
            <>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs h-16 resize-none" placeholder="Description..." />
              <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} className="bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-xs" />
            </>
          ) : (
            <>
              {ms.description && <p className="text-[11px] text-muted-foreground">{ms.description}</p>}
              <div className="flex items-center gap-3">
                <DueDateLabel dueDate={ms.dueDate} />
                <span className="text-[10px] text-muted-foreground">{ms.completedTasks}/{ms.totalTasks} tasks</span>
              </div>
            </>
          )}
          <ProgressBar progress={ms.progress} />
          <div className="text-[10px] text-right text-muted-foreground">{ms.progress}% complete</div>
        </div>

        <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
          <span className="text-[11px] font-medium">Linked Tasks</span>
          <button
            onClick={() => { setShowLinkPicker(true); fetchAvailableTasks(); }}
            className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80"
          >
            <Link2 className="w-3 h-3" /> Link Task
          </button>
        </div>

        {showLinkPicker && (
          <div className="px-3 py-1.5 border-b border-border/20 bg-muted/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Select a task to link:</span>
              <button onClick={() => setShowLinkPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
            </div>
            {availableTasks.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-1">No available tasks to link</p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {availableTasks.map(t => (
                  <button key={t.id} onClick={() => linkTask(t.id)} className="w-full text-left flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded text-[11px]">
                    {t.completed ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <Circle className="w-3 h-3 text-muted-foreground shrink-0" />}
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="divide-y divide-border/10">
          {ms.tasks.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">No tasks linked yet</div>
          ) : (
            ms.tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20">
                {t.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    {t.priority && <span className={priorityColor(t.priority)}>{t.priority}</span>}
                    {t.assignedTo && <span>{t.assignedTo}</span>}
                    {t.dueDate && <span>{new Date(t.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button onClick={() => unlinkTask(t.id)} className="p-0.5 text-muted-foreground hover:text-red-400 rounded" title="Unlink task">
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function TimelineView({
  milestones,
  onBack,
  onSelect,
}: {
  milestones: Milestone[];
  onBack: () => void;
  onSelect: (m: Milestone) => void;
}) {
  const sorted = [...milestones].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const now = new Date();
  const dates = sorted.filter(m => m.dueDate).map(m => new Date(m.dueDate!).getTime());
  const minDate = dates.length > 0 ? Math.min(...dates, now.getTime()) : now.getTime();
  const maxDate = dates.length > 0 ? Math.max(...dates, now.getTime()) : now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const range = maxDate - minDate || 1;

  const getPosition = (dateStr: string | null) => {
    if (!dateStr) return 50;
    return ((new Date(dateStr).getTime() - minDate) / range) * 100;
  };

  const nowPos = ((now.getTime() - minDate) / range) * 100;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <button onClick={onBack} className="p-0.5 hover:bg-muted rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium">Milestone Timeline</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{sorted.length} milestones</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto px-3 py-4">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No milestones to display</div>
        ) : (
          <div className="relative min-h-[200px]" style={{ minWidth: "500px" }}>
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/50" style={{ left: `${Math.min(Math.max(nowPos, 0), 100)}%` }}>
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-400 rounded-full border-2 border-background" />
              <div className="absolute -top-5 -left-3 text-[9px] text-red-400 whitespace-nowrap">Today</div>
            </div>

            <div className="absolute left-0 right-0 top-8 h-0.5 bg-border/50" />

            <div className="absolute left-0 top-10 text-[9px] text-muted-foreground">
              {new Date(minDate).toLocaleDateString()}
            </div>
            <div className="absolute right-0 top-10 text-[9px] text-muted-foreground">
              {new Date(maxDate).toLocaleDateString()}
            </div>

            <div className="pt-20 space-y-3">
              {sorted.map((m, i) => {
                const pos = getPosition(m.dueDate);
                const progressColor = m.progress === 100 ? "bg-green-500" : m.progress >= 50 ? "bg-blue-500" : "bg-amber-500";
                const isOverdue = m.dueDate && new Date(m.dueDate) < now && m.status === "open";

                return (
                  <div key={m.id} className="relative" style={{ paddingLeft: `${Math.min(Math.max(pos, 2), 85)}%` }}>
                    <button
                      onClick={() => onSelect(m)}
                      className={`group relative bg-card border rounded-lg p-2 hover:border-primary/50 transition-colors text-left w-[160px] ${
                        isOverdue ? "border-red-400/40" : "border-border/50"
                      }`}
                      data-testid={`timeline-milestone-${m.id}`}
                    >
                      <div className="absolute -left-2 top-3 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center" style={{ backgroundColor: m.progress === 100 ? "#22c55e" : m.status === "closed" ? "#6b7280" : isOverdue ? "#ef4444" : "#3b82f6" }}>
                        {m.progress === 100 ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <Flag className="w-2 h-2 text-white" />}
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium truncate">{m.title}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                        <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${m.progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>{m.completedTasks}/{m.totalTasks}</span>
                        {m.dueDate && <span>{new Date(m.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CreateMilestoneForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/milestones`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, dueDate: dueDate || null }),
      });
      if (res.ok) onCreated();
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <button onClick={onCancel} className="p-0.5 hover:bg-muted rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="text-xs font-medium">New Milestone</span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1.5 text-xs" placeholder="v1.0 Release" autoFocus />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1.5 text-xs h-20 resize-none" placeholder="What does this milestone achieve?" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1.5 text-xs" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim() || submitting} className="flex-1 bg-primary text-primary-foreground rounded py-1.5 text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create Milestone
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </div>
    </>
  );
}

export function MilestonePanel({ projectId, onClose }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [creating, setCreating] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/milestones`, { credentials: "include" });
      if (res.ok) setMilestones(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  const handleSelect = (m: Milestone) => {
    setSelectedMilestone(m);
    setView("detail");
  };

  const handleBack = () => {
    setView("list");
    setSelectedMilestone(null);
    setCreating(false);
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="milestone-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Milestones</span>
          <span className="text-[10px] text-muted-foreground">{milestones.filter(m => m.status === "open").length} open</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>

      {creating ? (
        <CreateMilestoneForm
          projectId={projectId}
          onCreated={() => { setCreating(false); fetchMilestones(); }}
          onCancel={() => setCreating(false)}
        />
      ) : view === "detail" && selectedMilestone ? (
        <MilestoneDetail
          milestone={selectedMilestone}
          projectId={projectId}
          onBack={handleBack}
          onRefresh={fetchMilestones}
        />
      ) : view === "timeline" ? (
        <TimelineView
          milestones={milestones}
          onBack={handleBack}
          onSelect={handleSelect}
        />
      ) : (
        <MilestoneList
          milestones={milestones}
          filter={filter}
          setFilter={setFilter}
          onSelect={handleSelect}
          onViewTimeline={() => setView("timeline")}
          onCreateNew={() => setCreating(true)}
          loading={loading}
        />
      )}
    </div>
  );
}
