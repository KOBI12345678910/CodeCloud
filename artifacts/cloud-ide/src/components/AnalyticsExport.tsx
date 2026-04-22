import { useState } from "react";
import { X, Download, FileText, Calendar, Loader2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function AnalyticsExport({ projectId, onClose }: Props) {
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [dateRange, setDateRange] = useState("30d");
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const from = new Date(Date.now() - (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90) * 86400000).toISOString();
      const to = new Date().toISOString();
      const res = await fetch(`${API}/projects/${projectId}/analytics/export?format=${format}&from=${from}&to=${to}`, { credentials: "include" });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {} finally { setExporting(false); }
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="analytics-export">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Download className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Analytics Export</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</div>
          <div className="flex gap-2">
            {(["csv", "json"] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${format === f ? "bg-primary/10 text-primary border border-primary/30" : "border border-border/30 text-muted-foreground hover:bg-muted/50"}`}>
                <FileText className="w-3 h-3" />{f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Date Range</div>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map(r => (
              <button key={r} onClick={() => setDateRange(r)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${dateRange === r ? "bg-primary/10 text-primary border border-primary/30" : "border border-border/30 text-muted-foreground hover:bg-muted/50"}`}>
                <Calendar className="w-3 h-3" />{r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={exportData} disabled={exporting} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? "Exporting..." : `Export as ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
