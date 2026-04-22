import { useState, useMemo } from "react";
import { X, History, Search, Play, Undo2, Save, Rocket, FilePlus, Trash2, Terminal, Settings, GitBranch, Download, RefreshCw, Clock } from "lucide-react";

interface Props { onClose: () => void; }

interface Command {
  id: string;
  action: string;
  category: "file" | "run" | "deploy" | "git" | "settings" | "terminal";
  detail: string;
  timestamp: string;
  undoable: boolean;
}

const CAT_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  file: { icon: Save, color: "text-blue-400", bg: "bg-blue-400/10" },
  run: { icon: Play, color: "text-green-400", bg: "bg-green-400/10" },
  deploy: { icon: Rocket, color: "text-purple-400", bg: "bg-purple-400/10" },
  git: { icon: GitBranch, color: "text-orange-400", bg: "bg-orange-400/10" },
  settings: { icon: Settings, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  terminal: { icon: Terminal, color: "text-cyan-400", bg: "bg-cyan-400/10" },
};

const COMMANDS: Command[] = [
  { id: "cmd1", action: "Save File", category: "file", detail: "src/components/App.tsx", timestamp: new Date(Date.now() - 60000).toISOString(), undoable: true },
  { id: "cmd2", action: "Run Dev Server", category: "run", detail: "pnpm run dev", timestamp: new Date(Date.now() - 180000).toISOString(), undoable: false },
  { id: "cmd3", action: "Create File", category: "file", detail: "src/utils/helpers.ts", timestamp: new Date(Date.now() - 300000).toISOString(), undoable: true },
  { id: "cmd4", action: "Deploy", category: "deploy", detail: "Production v2.4.3", timestamp: new Date(Date.now() - 600000).toISOString(), undoable: true },
  { id: "cmd5", action: "Git Commit", category: "git", detail: "fix: resolve auth redirect bug", timestamp: new Date(Date.now() - 900000).toISOString(), undoable: true },
  { id: "cmd6", action: "Terminal Command", category: "terminal", detail: "npm install axios", timestamp: new Date(Date.now() - 1200000).toISOString(), undoable: false },
  { id: "cmd7", action: "Delete File", category: "file", detail: "src/old-config.json", timestamp: new Date(Date.now() - 1500000).toISOString(), undoable: true },
  { id: "cmd8", action: "Update Settings", category: "settings", detail: "Theme changed to dark", timestamp: new Date(Date.now() - 1800000).toISOString(), undoable: true },
  { id: "cmd9", action: "Run Tests", category: "run", detail: "vitest --run (24/24 passed)", timestamp: new Date(Date.now() - 2400000).toISOString(), undoable: false },
  { id: "cmd10", action: "Git Push", category: "git", detail: "origin/main (3 commits)", timestamp: new Date(Date.now() - 3000000).toISOString(), undoable: false },
  { id: "cmd11", action: "Save File", category: "file", detail: "src/pages/Dashboard.tsx", timestamp: new Date(Date.now() - 3600000).toISOString(), undoable: true },
  { id: "cmd12", action: "Deploy Preview", category: "deploy", detail: "Staging preview-abc123", timestamp: new Date(Date.now() - 4200000).toISOString(), undoable: true },
  { id: "cmd13", action: "Terminal Command", category: "terminal", detail: "curl -s localhost:3000/health", timestamp: new Date(Date.now() - 5400000).toISOString(), undoable: false },
  { id: "cmd14", action: "Git Branch", category: "git", detail: "Created feature/auth-flow", timestamp: new Date(Date.now() - 7200000).toISOString(), undoable: true },
  { id: "cmd15", action: "Install Package", category: "terminal", detail: "pnpm add react-query", timestamp: new Date(Date.now() - 9000000).toISOString(), undoable: true },
];

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommandLog({ onClose }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [replayed, setReplayed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return COMMANDS.filter(c => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (search && !c.action.toLowerCase().includes(search.toLowerCase()) && !c.detail.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, catFilter]);

  const categories = ["all", "file", "run", "deploy", "git", "settings", "terminal"];

  return (
    <div className="h-full flex flex-col bg-background" data-testid="command-log">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><History className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Command History</span><span className="text-[9px] text-muted-foreground">{COMMANDS.length} commands</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="px-3 pt-2 space-y-1.5 shrink-0">
        <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search commands..." className="w-full pl-7 pr-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" /></div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`px-2 py-0.5 text-[9px] rounded capitalize ${catFilter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.map(cmd => {
          const cfg = CAT_CFG[cmd.category];
          const Icon = cfg.icon;
          const isUndone = undone.has(cmd.id);
          const isReplayed = replayed.has(cmd.id);
          return (
            <div key={cmd.id} className={`bg-card/50 rounded-lg border border-border/30 p-2 ${isUndone ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${cfg.bg}`}><Icon className={`w-3 h-3 ${cfg.color}`} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium">{cmd.action}</span>
                    {isUndone && <span className="text-[8px] px-1 py-0.5 rounded bg-red-400/10 text-red-400">undone</span>}
                    {isReplayed && <span className="text-[8px] px-1 py-0.5 rounded bg-green-400/10 text-green-400">replayed</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono truncate">{cmd.detail}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(cmd.timestamp)}</span>
                  <button onClick={() => setReplayed(s => { const n = new Set(s); n.add(cmd.id); return n; })} className="p-0.5 hover:bg-muted rounded" title="Replay"><RefreshCw className="w-3 h-3 text-muted-foreground hover:text-green-400" /></button>
                  {cmd.undoable && !isUndone && (
                    <button onClick={() => setUndone(s => { const n = new Set(s); n.add(cmd.id); return n; })} className="p-0.5 hover:bg-muted rounded" title="Undo"><Undo2 className="w-3 h-3 text-muted-foreground hover:text-yellow-400" /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-[10px] text-muted-foreground py-4">No commands match your search</div>}
      </div>
    </div>
  );
}
