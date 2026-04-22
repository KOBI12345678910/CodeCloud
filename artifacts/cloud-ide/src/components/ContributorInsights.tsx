import { useState, useMemo } from "react";
import { X, Users, TrendingUp, GitCommit, FileCode, Clock, Rocket, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface Contributor {
  id: string;
  name: string;
  avatar: string;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  commits: number;
  reviews: number;
  deploys: number;
  codingHours: number;
  streak: number;
  lastActive: string;
  weeklyActivity: number[];
}

const CONTRIBUTORS: Contributor[] = [
  { id: "c1", name: "Alice Chen", avatar: "AC", linesAdded: 12450, linesRemoved: 3200, filesChanged: 187, commits: 156, reviews: 42, deploys: 18, codingHours: 320, streak: 14, lastActive: new Date(Date.now() - 1800000).toISOString(), weeklyActivity: [8, 12, 15, 10, 14, 6, 3] },
  { id: "c2", name: "Bob Martinez", avatar: "BM", linesAdded: 8900, linesRemoved: 2100, filesChanged: 134, commits: 112, reviews: 67, deploys: 12, codingHours: 245, streak: 8, lastActive: new Date(Date.now() - 3600000).toISOString(), weeklyActivity: [6, 9, 11, 8, 10, 4, 2] },
  { id: "c3", name: "Carol Davis", avatar: "CD", linesAdded: 6700, linesRemoved: 4500, filesChanged: 98, commits: 89, reviews: 91, deploys: 8, codingHours: 198, streak: 21, lastActive: new Date(Date.now() - 7200000).toISOString(), weeklyActivity: [5, 7, 8, 12, 9, 7, 4] },
  { id: "c4", name: "Dan Kim", avatar: "DK", linesAdded: 5200, linesRemoved: 1800, filesChanged: 76, commits: 67, reviews: 23, deploys: 22, codingHours: 156, streak: 5, lastActive: new Date(Date.now() - 14400000).toISOString(), weeklyActivity: [4, 6, 5, 7, 8, 3, 1] },
  { id: "c5", name: "Eve Park", avatar: "EP", linesAdded: 3800, linesRemoved: 900, filesChanged: 52, commits: 45, reviews: 34, deploys: 6, codingHours: 112, streak: 3, lastActive: new Date(Date.now() - 28800000).toISOString(), weeklyActivity: [3, 4, 6, 5, 4, 2, 1] },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${30 - (v / max) * 25}`).join(" ");
  return <svg viewBox="0 0 60 30" className="w-16 h-6"><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ContributorInsights({ projectId, onClose }: Props) {
  const [sortBy, setSortBy] = useState<"commits" | "linesAdded" | "reviews" | "deploys">("commits");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [tab, setTab] = useState<"overview" | "details">("overview");

  const sorted = useMemo(() => {
    return [...CONTRIBUTORS].sort((a, b) => sortDir === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
  }, [sortBy, sortDir]);

  const totals = useMemo(() => ({
    commits: CONTRIBUTORS.reduce((s, c) => s + c.commits, 0),
    linesAdded: CONTRIBUTORS.reduce((s, c) => s + c.linesAdded, 0),
    linesRemoved: CONTRIBUTORS.reduce((s, c) => s + c.linesRemoved, 0),
    reviews: CONTRIBUTORS.reduce((s, c) => s + c.reviews, 0),
    deploys: CONTRIBUTORS.reduce((s, c) => s + c.deploys, 0),
  }), []);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const SortIcon = sortDir === "desc" ? ChevronDown : ChevronUp;

  function timeAgo(ts: string): string {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="h-full flex flex-col bg-background" data-testid="contributor-insights">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Contributor Insights</span><span className="text-[9px] text-muted-foreground">{CONTRIBUTORS.length} contributors</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("overview")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "overview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Overview</button>
        <button onClick={() => setTab("details")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "details" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Details</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Commits", value: totals.commits, icon: GitCommit },
                { label: "Lines Added", value: `+${(totals.linesAdded / 1000).toFixed(1)}k`, icon: TrendingUp },
                { label: "Lines Removed", value: `-${(totals.linesRemoved / 1000).toFixed(1)}k`, icon: TrendingUp },
                { label: "Reviews", value: totals.reviews, icon: MessageSquare },
                { label: "Deploys", value: totals.deploys, icon: Rocket },
              ].map((s, i) => (
                <div key={i} className="bg-card/50 rounded-lg border border-border/30 p-2 text-center">
                  <div className="text-sm font-bold">{s.value}</div>
                  <div className="text-[8px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {sorted.map((c, i) => {
                const pct = totals.commits > 0 ? (c.commits / totals.commits) * 100 : 0;
                return (
                  <div key={c.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{c.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-xs font-medium">{c.name}</span><span className="text-[8px] text-muted-foreground">{timeAgo(c.lastActive)}</span></div>
                        <div className="flex items-center gap-1 mt-0.5"><span className="text-[9px] text-muted-foreground">{c.streak}d streak</span></div>
                      </div>
                      <Sparkline data={c.weeklyActivity} color={COLORS[i % COLORS.length]} />
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-[9px]">
                      <div className="text-center"><span className="font-medium">{c.commits}</span><div className="text-muted-foreground">commits</div></div>
                      <div className="text-center"><span className="font-medium text-green-400">+{(c.linesAdded / 1000).toFixed(1)}k</span><div className="text-muted-foreground">added</div></div>
                      <div className="text-center"><span className="font-medium text-red-400">-{(c.linesRemoved / 1000).toFixed(1)}k</span><div className="text-muted-foreground">removed</div></div>
                      <div className="text-center"><span className="font-medium">{c.reviews}</span><div className="text-muted-foreground">reviews</div></div>
                      <div className="text-center"><span className="font-medium">{c.deploys}</span><div className="text-muted-foreground">deploys</div></div>
                    </div>
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} /></div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === "details" && (
          <div className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-border/30">
                <th className="text-left p-2 font-normal text-muted-foreground">Contributor</th>
                {(["commits", "linesAdded", "reviews", "deploys"] as const).map(f => (
                  <th key={f} className="text-left p-2 font-normal cursor-pointer hover:text-foreground text-muted-foreground" onClick={() => toggleSort(f)}>
                    <span className="inline-flex items-center gap-0.5">{f === "linesAdded" ? "Lines" : f.charAt(0).toUpperCase() + f.slice(1)}{sortBy === f && <SortIcon className="w-2.5 h-2.5" />}</span>
                  </th>
                ))}
                <th className="text-left p-2 font-normal text-muted-foreground">Files</th>
                <th className="text-left p-2 font-normal text-muted-foreground">Hours</th>
                <th className="text-left p-2 font-normal text-muted-foreground">Activity</th>
              </tr></thead>
              <tbody>
                {sorted.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="p-2"><div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>{c.avatar}</div><span className="font-medium">{c.name}</span></div></td>
                    <td className="p-2 font-medium">{c.commits}</td>
                    <td className="p-2"><span className="text-green-400">+{c.linesAdded.toLocaleString()}</span> <span className="text-red-400">-{c.linesRemoved.toLocaleString()}</span></td>
                    <td className="p-2">{c.reviews}</td>
                    <td className="p-2">{c.deploys}</td>
                    <td className="p-2">{c.filesChanged}</td>
                    <td className="p-2">{c.codingHours}h</td>
                    <td className="p-2"><Sparkline data={c.weeklyActivity} color={COLORS[i % COLORS.length]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
