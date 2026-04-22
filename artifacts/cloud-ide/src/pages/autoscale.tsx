import { useState, useEffect } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface Policy {
  id: string;
  deploymentId: string;
  minReplicas: number;
  maxReplicas: number;
  targetCpuPercent: number;
  targetMemoryPercent: number;
  targetRps: number;
  scaleUpCooldownSec: number;
  scaleDownCooldownSec: number;
  strategy: string;
  enabled: boolean;
  currentReplicas: number;
  lastScaleEvent: string | null;
}

interface Metric {
  policyId: string;
  deploymentId: string;
  currentReplicas: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  rps: number;
  scaleEvents24h: number;
}

function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AutoscalePage() {
  const [projectId] = useState("demo-project");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    deploymentId: "",
    minReplicas: 1,
    maxReplicas: 10,
    targetCpuPercent: 70,
    targetMemoryPercent: 80,
    targetRps: 1000,
    scaleUpCooldownSec: 60,
    scaleDownCooldownSec: 300,
    strategy: "cpu",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(api(`/autoscale/${projectId}/policies`)),
        fetch(api(`/autoscale/${projectId}/metrics`)),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setPolicies(d.policies || []);
      }
      if (mRes.ok) {
        const d = await mRes.json();
        setMetrics(d.metrics || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.deploymentId) return;
    await fetch(api(`/autoscale/${projectId}/policies`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ ...form, deploymentId: "" });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(api(`/autoscale/${projectId}/policies/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Delete this scaling policy?")) return;
    await fetch(api(`/autoscale/${projectId}/policies/${id}`), { method: "DELETE" });
    load();
  };

  const totalReplicas = policies.reduce((s, p) => s + p.currentReplicas, 0);
  const scaleEvents = metrics.reduce((s, m) => s + (m.scaleEvents24h || 0), 0);

  return (
    <FeaturePageLayout title="Autoscale" subtitle="Configure automatic scaling policies for your deployments" badge="Infrastructure" testId="autoscale-page">
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Policies", value: policies.filter(p => p.enabled).length, color: "text-green-400" },
            { label: "Total Replicas", value: totalReplicas, color: "text-blue-400" },
            { label: "Scale Events (24h)", value: scaleEvents, color: "text-yellow-400" },
            { label: "Strategies", value: [...new Set(policies.map(p => p.strategy))].length, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium hover:opacity-90">
            {showForm ? "Cancel" : "New Policy"}
          </button>
          <button onClick={load} className="border border-border rounded px-4 py-2 text-sm hover:bg-accent">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Create Scaling Policy</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Deployment ID</label>
                <input className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" placeholder="deploy-abc123" value={form.deploymentId} onChange={e => setForm({ ...form, deploymentId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Strategy</label>
                <select className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })}>
                  <option value="cpu">CPU Based</option>
                  <option value="memory">Memory Based</option>
                  <option value="rps">Request Rate (RPS)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Min Replicas</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.minReplicas} onChange={e => setForm({ ...form, minReplicas: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Max Replicas</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.maxReplicas} onChange={e => setForm({ ...form, maxReplicas: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">CPU Threshold %</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.targetCpuPercent} onChange={e => setForm({ ...form, targetCpuPercent: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Memory Threshold %</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.targetMemoryPercent} onChange={e => setForm({ ...form, targetMemoryPercent: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Scale Up Cooldown (sec)</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.scaleUpCooldownSec} onChange={e => setForm({ ...form, scaleUpCooldownSec: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Scale Down Cooldown (sec)</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.scaleDownCooldownSec} onChange={e => setForm({ ...form, scaleDownCooldownSec: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Target RPS</label>
                <input type="number" className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm" value={form.targetRps} onChange={e => setForm({ ...form, targetRps: +e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="border border-border rounded px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button onClick={create} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium hover:opacity-90">Create Policy</button>
            </div>
          </div>
        )}

        {policies.length === 0 && !loading ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">No scaling policies configured. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map(p => {
              const m = metrics.find(m => m.policyId === p.id);
              return (
                <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${p.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                        <span className="font-medium">{p.deploymentId}</span>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{p.strategy.toUpperCase()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Replicas: {p.currentReplicas} ({p.minReplicas}-{p.maxReplicas})
                        {" | "}CPU: {p.targetCpuPercent}% | Memory: {p.targetMemoryPercent}%
                        {" | "}Cooldown: {p.scaleUpCooldownSec}s up / {p.scaleDownCooldownSec}s down
                        {p.lastScaleEvent && ` | Last: ${new Date(p.lastScaleEvent).toLocaleTimeString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggle(p.id, p.enabled)} className={`text-sm px-3 py-1 rounded ${p.enabled ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                        {p.enabled ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => deletePolicy(p.id)} className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                        Delete
                      </button>
                    </div>
                  </div>

                  {m && (
                    <div className="px-4 py-3 border-t border-border bg-muted/20">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>CPU</span>
                            <span className={m.cpuUsagePercent > p.targetCpuPercent ? "text-red-400" : "text-green-400"}>{m.cpuUsagePercent}%</span>
                          </div>
                          <MiniBar value={m.cpuUsagePercent} max={100} color={m.cpuUsagePercent > p.targetCpuPercent ? "bg-red-500" : "bg-blue-500"} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Memory</span>
                            <span className={m.memoryUsagePercent > p.targetMemoryPercent ? "text-red-400" : "text-green-400"}>{m.memoryUsagePercent}%</span>
                          </div>
                          <MiniBar value={m.memoryUsagePercent} max={100} color={m.memoryUsagePercent > p.targetMemoryPercent ? "bg-red-500" : "bg-purple-500"} />
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">RPS: </span>
                          <span className="font-medium">{m.rps}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Events (24h): </span>
                          <span className="font-medium">{m.scaleEvents24h}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
}
