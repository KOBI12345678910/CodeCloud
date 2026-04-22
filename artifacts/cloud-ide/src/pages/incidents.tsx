import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, AlertTriangle, AlertOctagon, CheckCircle2, Loader2, Clock, MessageSquare } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Incident { id: string; title: string; description: string; severity: string; status: string; affectedServices?: string[]; createdAt: string; resolvedAt?: string; updates?: any[]; }

export default function IncidentsPage() {
  const [, navigate] = useLocation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "minor" });
  const [updateMsg, setUpdateMsg] = useState("");
  const [updateStatus, setUpdateStatus] = useState("investigating");

  const fetchIncidents = async () => { try { const res = await fetch(`${API}/incidents`, { credentials: "include" }); if (res.ok) setIncidents(await res.json()); } catch {} finally { setLoading(false); } };
  useEffect(() => { fetchIncidents(); }, []);

  const selectIncident = async (inc: Incident) => {
    try { const res = await fetch(`${API}/incidents/${inc.id}`, { credentials: "include" }); if (res.ok) setSelected(await res.json()); } catch {}
  };

  const createIncident = async () => {
    if (!form.title || !form.description) return;
    try { const res = await fetch(`${API}/incidents`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { setCreating(false); setForm({ title: "", description: "", severity: "minor" }); fetchIncidents(); } } catch {}
  };

  const addUpdate = async () => {
    if (!selected || !updateMsg) return;
    try { await fetch(`${API}/incidents/${selected.id}/updates`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: updateMsg, status: updateStatus }) }); setUpdateMsg(""); selectIncident(selected); fetchIncidents(); } catch {}
  };

  const sevIcon = (s: string) => s === "critical" ? <AlertOctagon className="w-4 h-4 text-red-400" /> : s === "major" ? <AlertTriangle className="w-4 h-4 text-orange-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  const statusColor = (s: string) => s === "resolved" ? "bg-green-400/10 text-green-400" : s === "monitoring" ? "bg-blue-400/10 text-blue-400" : s === "identified" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400";

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" data-testid="incidents-page">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-card/50 shrink-0">
        <button onClick={() => navigate("/")} className="p-1 hover:bg-muted rounded"><ArrowLeft className="w-4 h-4" /></button>
        <AlertTriangle className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Platform Status & Incidents</span>
        <button onClick={() => setCreating(true)} className="ml-auto flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded"><Plus className="w-3 h-3" /> Report Incident</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-border/30 overflow-y-auto">
          {creating && (
            <div className="p-3 border-b border-border/30 space-y-2">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs" placeholder="Incident title" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs h-16" placeholder="Description" />
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs"><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select>
              <div className="flex gap-1"><button onClick={createIncident} className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded">Create</button><button onClick={() => setCreating(false)} className="px-2 py-1 text-xs text-muted-foreground">Cancel</button></div>
            </div>
          )}
          {loading ? <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
            incidents.map(inc => (
              <button key={inc.id} onClick={() => selectIncident(inc)} className={`w-full flex items-start gap-2 px-3 py-2 border-b border-border/20 hover:bg-muted/30 text-left ${selected?.id === inc.id ? "bg-muted/50" : ""}`}>
                {sevIcon(inc.severity)}
                <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{inc.title}</div><div className="flex items-center gap-2 mt-0.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor(inc.status)}`}>{inc.status}</span><span className="text-[10px] text-muted-foreground">{new Date(inc.createdAt).toLocaleDateString()}</span></div></div>
              </button>
            ))
          }
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? <div className="flex items-center justify-center h-full text-muted-foreground text-sm"><div className="text-center"><AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Select an incident to view details</p></div></div> : (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2">{sevIcon(selected.severity)}<h2 className="text-sm font-bold">{selected.title}</h2><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor(selected.status)}`}>{selected.status}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.updates?.map((u: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center"><div className={`w-2 h-2 rounded-full mt-1.5 ${u.status === "resolved" ? "bg-green-400" : u.status === "monitoring" ? "bg-blue-400" : "bg-yellow-400"}`} />{i < (selected.updates?.length || 0) - 1 && <div className="w-px flex-1 bg-border/30" />}</div>
                    <div className="pb-3"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Clock className="w-2.5 h-2.5" />{new Date(u.createdAt).toLocaleString()}<span className={`px-1 py-0.5 rounded font-bold ${statusColor(u.status)}`}>{u.status}</span></div><p className="text-xs mt-0.5">{u.message}</p></div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/30 p-3 space-y-1 shrink-0">
                <div className="flex items-center gap-2">
                  <input value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs" placeholder="Add update..." />
                  <select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)} className="bg-muted/50 border border-border/50 rounded px-1 py-1 text-xs"><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select>
                  <button onClick={addUpdate} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">Post</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
