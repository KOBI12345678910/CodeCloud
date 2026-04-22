import { useState, useEffect } from "react";
import { X, Clock, Flame, Keyboard, Code2, Loader2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { onClose: () => void; }

export function CodingStats({ onClose }: Props) {
  const [daily, setDaily] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/time-tracking/daily?days=14`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/time-tracking/streak`, { credentials: "include" }).then(r => r.json()),
    ]).then(([d, s]) => { setDaily(d); setStreak(s); }).finally(() => setLoading(false));
  }, []);

  const formatTime = (secs: number) => { const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const totalToday = daily.length > 0 ? daily[daily.length - 1]?.totalSeconds || 0 : 0;
  const totalWeek = daily.reduce((s: number, d: any) => s + (d.totalSeconds || 0), 0);

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="coding-stats">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Coding Stats</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><Clock className="w-4 h-4 mx-auto mb-1 text-blue-400" /><div className="text-sm font-bold">{formatTime(totalToday)}</div><div className="text-[10px] text-muted-foreground">Today</div></div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><Code2 className="w-4 h-4 mx-auto mb-1 text-green-400" /><div className="text-sm font-bold">{formatTime(totalWeek)}</div><div className="text-[10px] text-muted-foreground">This Week</div></div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><Flame className="w-4 h-4 mx-auto mb-1 text-orange-400" /><div className="text-sm font-bold">{streak?.currentStreak || 0}</div><div className="text-[10px] text-muted-foreground">Day Streak</div></div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><Keyboard className="w-4 h-4 mx-auto mb-1 text-purple-400" /><div className="text-sm font-bold">{streak?.longestStreak || 0}</div><div className="text-[10px] text-muted-foreground">Best Streak</div></div>
        </div>
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily Activity (14 days)</div>
          <div className="flex items-end gap-1 h-16">
            {daily.map((d: any, i: number) => {
              const maxSecs = Math.max(...daily.map((x: any) => x.totalSeconds || 0), 1);
              return <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full bg-primary/40 rounded-t-sm" style={{ height: `${Math.max(2, ((d.totalSeconds || 0) / maxSecs) * 100)}%` }} title={`${d.date}: ${formatTime(d.totalSeconds || 0)}`} />
                <span className="text-[8px] text-muted-foreground">{d.date?.slice(5)}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
