import { useState, useMemo } from "react";
import { X, FileCode, Loader2 } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface FileTypeData { ext: string; count: number; lines: number; color: string; }

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#6366f1","#14b8a6","#e11d48"];

const SAMPLE_DATA: FileTypeData[] = [
  { ext: ".tsx", count: 87, lines: 14200, color: COLORS[0] },
  { ext: ".ts", count: 64, lines: 9800, color: COLORS[1] },
  { ext: ".css", count: 12, lines: 2100, color: COLORS[2] },
  { ext: ".json", count: 8, lines: 450, color: COLORS[3] },
  { ext: ".md", count: 5, lines: 320, color: COLORS[4] },
  { ext: ".html", count: 3, lines: 180, color: COLORS[5] },
  { ext: ".js", count: 2, lines: 95, color: COLORS[6] },
  { ext: ".yaml", count: 4, lines: 210, color: COLORS[7] },
  { ext: ".sql", count: 3, lines: 150, color: COLORS[8] },
  { ext: ".sh", count: 2, lines: 60, color: COLORS[9] },
];

const TRENDS = [
  { week: "W1", tsx: 72, ts: 55, css: 10, other: 15 },
  { week: "W2", tsx: 76, ts: 58, css: 11, other: 16 },
  { week: "W3", tsx: 80, ts: 60, css: 11, other: 17 },
  { week: "W4", tsx: 84, ts: 62, css: 12, other: 18 },
  { week: "W5", tsx: 87, ts: 64, css: 12, other: 19 },
];

function PieChart({ data }: { data: FileTypeData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let cum = 0;
  const slices = data.map(d => {
    const start = cum / total;
    cum += d.count;
    const end = cum / total;
    return { ...d, start, end };
  });

  const paths = slices.map((s, i) => {
    const startAngle = s.start * 2 * Math.PI - Math.PI / 2;
    const endAngle = s.end * 2 * Math.PI - Math.PI / 2;
    const largeArc = s.end - s.start > 0.5 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos(startAngle);
    const y1 = 50 + 40 * Math.sin(startAngle);
    const x2 = 50 + 40 * Math.cos(endAngle);
    const y2 = 50 + 40 * Math.sin(endAngle);
    return <path key={i} d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`} fill={s.color} stroke="hsl(var(--background))" strokeWidth="0.5" />;
  });

  return <svg viewBox="0 0 100 100" className="w-full h-full">{paths}<circle cx="50" cy="50" r="22" fill="hsl(var(--background))" /><text x="50" y="48" textAnchor="middle" className="fill-foreground text-[7px] font-bold">{total}</text><text x="50" y="56" textAnchor="middle" className="fill-muted-foreground text-[4px]">files</text></svg>;
}

function MiniBarChart({ data }: { data: typeof TRENDS }) {
  const maxVal = Math.max(...data.map(d => d.tsx + d.ts + d.css + d.other));
  const barW = 100 / data.length;
  return (
    <svg viewBox="0 0 100 60" className="w-full h-full">
      {data.map((d, i) => {
        const total = d.tsx + d.ts + d.css + d.other;
        const h = (total / maxVal) * 45;
        const x = i * barW + barW * 0.15;
        const w = barW * 0.7;
        const y = 50 - h;
        const tsxH = (d.tsx / total) * h;
        const tsH = (d.ts / total) * h;
        const cssH = (d.css / total) * h;
        const otherH = (d.other / total) * h;
        let cy = y;
        return (
          <g key={i}>
            <rect x={x} y={cy} width={w} height={tsxH} fill={COLORS[0]} rx="1" />{(cy += tsxH, null)}
            <rect x={x} y={cy} width={w} height={tsH} fill={COLORS[1]} rx="0" />{(cy += tsH, null)}
            <rect x={x} y={cy} width={w} height={cssH} fill={COLORS[2]} rx="0" />{ (cy += cssH, null)}
            <rect x={x} y={cy} width={w} height={otherH} fill={COLORS[3]} rx="0" />
            <text x={x + w / 2} y={55} textAnchor="middle" className="fill-muted-foreground text-[3.5px]">{d.week}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function FileTypeStats({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"overview" | "details" | "trends">("overview");
  const [sortBy, setSortBy] = useState<"count" | "lines">("lines");

  const totalFiles = useMemo(() => SAMPLE_DATA.reduce((s, d) => s + d.count, 0), []);
  const totalLines = useMemo(() => SAMPLE_DATA.reduce((s, d) => s + d.lines, 0), []);
  const sorted = useMemo(() => [...SAMPLE_DATA].sort((a, b) => b[sortBy] - a[sortBy]), [sortBy]);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="file-type-stats">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">File Type Statistics</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["overview", "details", "trends"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === "overview" && (
          <div className="flex gap-4">
            <div className="w-32 h-32 shrink-0"><PieChart data={SAMPLE_DATA} /></div>
            <div className="flex-1 space-y-1.5">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className="text-lg font-bold">{totalFiles}</div><div className="text-[9px] text-muted-foreground">Total Files</div></div>
                <div className="bg-card/50 rounded-lg border border-border/30 p-2 text-center"><div className="text-lg font-bold">{(totalLines / 1000).toFixed(1)}k</div><div className="text-[9px] text-muted-foreground">Lines of Code</div></div>
              </div>
              {SAMPLE_DATA.slice(0, 6).map(d => (
                <div key={d.ext} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="w-10 font-mono">{d.ext}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(d.lines / totalLines) * 100}%`, background: d.color }} /></div>
                  <span className="w-14 text-right text-muted-foreground">{d.lines.toLocaleString()} loc</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "details" && (
          <>
            <div className="flex gap-1 mb-2">
              <button onClick={() => setSortBy("lines")} className={`px-2 py-0.5 text-[9px] rounded ${sortBy === "lines" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>By Lines</button>
              <button onClick={() => setSortBy("count")} className={`px-2 py-0.5 text-[9px] rounded ${sortBy === "count" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>By Count</button>
            </div>
            {sorted.map(d => (
              <div key={d.ext} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded" style={{ background: d.color }} /><span className="text-xs font-mono font-medium">{d.ext}</span></div>
                  <span className="text-[10px] text-muted-foreground">{((d.lines / totalLines) * 100).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-muted-foreground">Files:</span> <span className="font-medium">{d.count}</span></div>
                  <div><span className="text-muted-foreground">Lines:</span> <span className="font-medium">{d.lines.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Avg/File:</span> <span className="font-medium">{Math.round(d.lines / d.count)}</span></div>
                </div>
                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(d[sortBy] / sorted[0][sortBy]) * 100}%`, background: d.color }} /></div>
              </div>
            ))}
          </>
        )}
        {tab === "trends" && (
          <>
            <div className="bg-card/50 rounded-lg border border-border/30 p-3">
              <div className="text-[10px] text-muted-foreground mb-2">File Count Trend (Last 5 Weeks)</div>
              <div className="h-24"><MiniBarChart data={TRENDS} /></div>
              <div className="flex gap-3 mt-2 justify-center">
                {[{ label: ".tsx", c: COLORS[0] }, { label: ".ts", c: COLORS[1] }, { label: ".css", c: COLORS[2] }, { label: "Other", c: COLORS[3] }].map(l => (
                  <div key={l.label} className="flex items-center gap-1 text-[9px]"><div className="w-2 h-2 rounded" style={{ background: l.c }} />{l.label}</div>
                ))}
              </div>
            </div>
            <div className="bg-card/50 rounded-lg border border-border/30 p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1.5">Weekly Growth</div>
              <div className="space-y-1">
                {[{ ext: ".tsx", growth: "+3/wk", pct: "+4.2%" }, { ext: ".ts", growth: "+2/wk", pct: "+3.6%" }, { ext: ".css", growth: "+0.5/wk", pct: "+5.0%" }].map(g => (
                  <div key={g.ext} className="flex items-center justify-between text-[10px]"><span className="font-mono">{g.ext}</span><span className="text-muted-foreground">{g.growth}</span><span className="text-green-400">{g.pct}</span></div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
