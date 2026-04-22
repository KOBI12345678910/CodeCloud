import { useState, useMemo } from "react";
import { X, Flame, Download } from "lucide-react";

interface Props { onClose: () => void; }

export function ActivityHeatmap({ onClose }: Props) {
  const [year] = useState(new Date().getFullYear());

  const data = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseChance = isWeekend ? 0.4 : 0.8;
      const count = Math.random() < baseChance ? Math.floor(Math.random() * 15) : 0;
      days.push({ date: new Date(d).toISOString().split("T")[0], count });
    }
    return days;
  }, [year]);

  const totalDays = data.filter(d => d.count > 0).length;
  const totalContributions = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  let currentStreak = 0;
  for (let i = data.length - 1; i >= 0; i--) { if (data[i].count > 0) currentStreak++; else break; }

  let longestStreak = 0;
  let streak = 0;
  for (const d of data) { if (d.count > 0) { streak++; longestStreak = Math.max(longestStreak, streak); } else streak = 0; }

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-green-500";
    if (ratio > 0.5) return "bg-green-400";
    if (ratio > 0.25) return "bg-green-300/60";
    return "bg-green-200/40";
  };

  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];
  const firstDay = new Date(data[0]?.date || "").getDay();
  for (let i = 0; i < firstDay; i++) currentWeek.push({ date: "", count: -1 });
  for (const day of data) {
    currentWeek.push(day);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="h-full flex flex-col bg-background" data-testid="activity-heatmap">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Activity Heatmap</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><strong className="text-foreground">{totalContributions}</strong> contributions</span>
          <span><strong className="text-foreground">{totalDays}</strong> active days</span>
          <span>🔥 <strong className="text-foreground">{currentStreak}</strong> day streak</span>
          <span>Best: <strong className="text-foreground">{longestStreak}</strong> days</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-[2px] min-w-fit">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => (
                  <div key={di} className={`w-[10px] h-[10px] rounded-sm ${day.count < 0 ? "bg-transparent" : getColor(day.count)}`} title={day.count >= 0 ? `${day.date}: ${day.count} contributions` : ""} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {["bg-muted/30", "bg-green-200/40", "bg-green-300/60", "bg-green-400", "bg-green-500"].map((c, i) => (
            <div key={i} className={`w-[10px] h-[10px] rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
