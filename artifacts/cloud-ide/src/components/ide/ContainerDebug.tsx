import { useState } from "react";
import { X, Terminal, Cpu, HardDrive, Wifi, Key, Layers } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

export function ContainerDebug({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"processes" | "fs" | "network" | "env" | "resources">("processes");

  const processes = [
    { pid: 1, name: "node", cpu: "12.5%", memory: "256MB", status: "running", cmd: "node dist/index.js" },
    { pid: 42, name: "npm", cpu: "0.1%", memory: "32MB", status: "running", cmd: "npm run dev" },
    { pid: 78, name: "esbuild", cpu: "5.2%", memory: "128MB", status: "running", cmd: "esbuild --watch" },
  ];
  const files = [
    { path: "/app", type: "dir", size: "124 MB", perms: "drwxr-xr-x" },
    { path: "/app/node_modules", type: "dir", size: "98 MB", perms: "drwxr-xr-x" },
    { path: "/app/dist", type: "dir", size: "12 MB", perms: "drwxr-xr-x" },
    { path: "/tmp", type: "dir", size: "2.3 MB", perms: "drwxrwxrwt" },
  ];
  const connections = [
    { proto: "TCP", local: "0.0.0.0:3000", remote: "*:*", state: "LISTEN", pid: 1 },
    { proto: "TCP", local: "172.17.0.2:5432", remote: "172.17.0.3:5432", state: "ESTABLISHED", pid: 1 },
    { proto: "TCP", local: "172.17.0.2:6379", remote: "172.17.0.4:6379", state: "ESTABLISHED", pid: 1 },
  ];
  const envVars = [
    { key: "NODE_ENV", value: "development" },
    { key: "PORT", value: "3000" },
    { key: "DATABASE_URL", value: "postgres://..." },
    { key: "REDIS_URL", value: "redis://..." },
    { key: "HOME", value: "/root" },
  ];

  return (
    <div className="h-full flex flex-col bg-background" data-testid="container-debug">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Container Inspector</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex border-b border-border/30 shrink-0">
        {([["processes", Cpu], ["fs", HardDrive], ["network", Wifi], ["env", Key], ["resources", Layers]] as const).map(([t, Icon]) => (
          <button key={t} onClick={() => setTab(t as any)} className={`flex items-center gap-1 px-3 py-1 text-[11px] border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-3 h-3" />{t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "processes" && <table className="w-full text-xs"><thead className="bg-card/30"><tr className="border-b border-border/20"><th className="text-left px-3 py-1">PID</th><th className="text-left px-3 py-1">Name</th><th className="text-left px-3 py-1">CPU</th><th className="text-left px-3 py-1">Memory</th><th className="text-left px-3 py-1">Command</th></tr></thead><tbody>{processes.map(p => <tr key={p.pid} className="border-b border-border/10 hover:bg-muted/30"><td className="px-3 py-1 font-mono">{p.pid}</td><td className="px-3 py-1">{p.name}</td><td className="px-3 py-1">{p.cpu}</td><td className="px-3 py-1">{p.memory}</td><td className="px-3 py-1 font-mono text-[10px] truncate max-w-[200px]">{p.cmd}</td></tr>)}</tbody></table>}
        {tab === "fs" && <div className="divide-y divide-border/10">{files.map(f => <div key={f.path} className="flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-muted/30"><span className="font-mono flex-1">{f.path}</span><span className="text-muted-foreground">{f.type}</span><span className="text-muted-foreground">{f.size}</span><span className="font-mono text-[10px] text-muted-foreground">{f.perms}</span></div>)}</div>}
        {tab === "network" && <table className="w-full text-xs"><thead className="bg-card/30"><tr className="border-b border-border/20"><th className="text-left px-3 py-1">Proto</th><th className="text-left px-3 py-1">Local</th><th className="text-left px-3 py-1">Remote</th><th className="text-left px-3 py-1">State</th></tr></thead><tbody>{connections.map((c, i) => <tr key={i} className="border-b border-border/10 hover:bg-muted/30"><td className="px-3 py-1">{c.proto}</td><td className="px-3 py-1 font-mono text-[10px]">{c.local}</td><td className="px-3 py-1 font-mono text-[10px]">{c.remote}</td><td className={`px-3 py-1 ${c.state === "LISTEN" ? "text-blue-400" : "text-green-400"}`}>{c.state}</td></tr>)}</tbody></table>}
        {tab === "env" && <div className="divide-y divide-border/10">{envVars.map(e => <div key={e.key} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/30"><span className="font-mono font-bold w-40">{e.key}</span><span className="font-mono text-muted-foreground">{e.value}</span></div>)}</div>}
        {tab === "resources" && <div className="p-3 space-y-2"><div className="bg-card/50 rounded p-2 border border-border/30"><div className="text-[10px] text-muted-foreground mb-1">CPU Usage</div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{width: "35%"}} /></div><div className="text-[10px] text-muted-foreground mt-0.5">35% of 2 vCPU</div></div><div className="bg-card/50 rounded p-2 border border-border/30"><div className="text-[10px] text-muted-foreground mb-1">Memory</div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-400 rounded-full" style={{width: "62%"}} /></div><div className="text-[10px] text-muted-foreground mt-0.5">1.24 GB / 2 GB</div></div><div className="bg-card/50 rounded p-2 border border-border/30"><div className="text-[10px] text-muted-foreground mb-1">Disk</div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{width: "45%"}} /></div><div className="text-[10px] text-muted-foreground mt-0.5">4.5 GB / 10 GB</div></div></div>}
      </div>
    </div>
  );
}
