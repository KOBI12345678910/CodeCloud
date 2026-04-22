import { useState } from "react";
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
  strategy: string;
  enabled: boolean;
  currentReplicas: number;
  lastScaleEvent: string | null;
}

export default function AutoscalePage() {
  const [projectId] = useState("demo-project");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState({ deploymentId: "", minReplicas: 1, maxReplicas: 10, targetCpuPercent: 70, strategy: "cpu" });
  const [metrics, setMetrics] = useState<any>(null);

  const load = async () => {
    const r = await fetch(api(`/autoscale/${projectId}/policies`));
    const d = await r.json();
    setPolicies(d.policies || []);
  };

  const loadMetrics = async () => {
    const r = await fetch(api(`/autoscale/${projectId}/metrics`));
    setMetrics(await r.json());
  };

  const create = async () => {
    await fetch(api(`/autoscale/${projectId}/policies`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(api(`/autoscale/${projectId}/policies/${id}`), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  return (
    <FeaturePageLayout title="Autoscale" subtitle="Configure automatic scaling policies for your deployments" badge="Infrastructure" testId="autoscale-page">
      <div className="space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Policies", value: policies.filter(p => p.enabled).length, color: "text-green-400" },
            { label: "Total Replicas", value: policies.reduce((s, p) => s + p.currentReplicas, 0), color: "text-blue-400" },
            { label: "Scale Events (24h)", value: metrics?.metrics?.reduce((s: number, m: any) => s + (m.scaleEvents24h || 0), 0) || 0, color: "text-yellow-400" },
            { label: "Strategies", value: [...new Set(policies.map(p => p.strategy))].length, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">New Scaling Policy</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input className="bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Deployment ID" value={form.deploymentId} onChange={e => setForm({ ...form, deploymentId: e.target.value })} />
            <input className="bg-background border border-border rounded px-3 py-2 text-sm" type="number" placeholder="Min" value={form.minReplicas} onChange={e => setForm({ ...form, minReplicas: +e.target.value })} />
            <input className="bg-background border border-border rounded px-3 py-2 text-sm" type="number" placeholder="Max" value={form.maxReplicas} onChange={e => setForm({ ...form, maxReplicas: +e.target.value })} />
            <select className="bg-background border border-border rounded px-3 py-2 text-sm" value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })}>
              <option value="cpu">CPU</option><option value="memory">Memory</option><option value="rps">RPS</option><option value="custom">Custom</option>
            </select>
            <button onClick={create} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium hover:opacity-90">Create Policy</button>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={load} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Load Policies</button>
          <button onClick={loadMetrics} className="border border-border rounded px-4 py-2 text-sm hover:bg-accent">Load Metrics</button>
        </div>

        {policies.length > 0 && (
          <div className="space-y-3">
            {policies.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                    <span className="font-medium">{p.deploymentId}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{p.strategy.toUpperCase()}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Replicas: {p.currentReplicas} ({p.minReplicas}-{p.maxReplicas}) | CPU Target: {p.targetCpuPercent}%
                  </div>
                </div>
                <button onClick={() => toggle(p.id, p.enabled)} className={`text-sm px-3 py-1 rounded ${p.enabled ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                  {p.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        )}

        {metrics?.metrics && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Live Metrics</h2>
            <div className="space-y-3">
              {metrics.metrics.map((m: any, i: number) => (
                <div key={i} className="grid grid-cols-5 gap-4 text-sm">
                  <div>Policy: {m.policyId.slice(0, 12)}</div>
                  <div>CPU: <span className={m.cpuUsagePercent > 80 ? "text-red-400" : "text-green-400"}>{m.cpuUsagePercent}%</span></div>
                  <div>MEM: <span className={m.memoryUsagePercent > 80 ? "text-red-400" : "text-green-400"}>{m.memoryUsagePercent}%</span></div>
                  <div>RPS: {m.rps}</div>
                  <div>Replicas: {m.currentReplicas}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
}
