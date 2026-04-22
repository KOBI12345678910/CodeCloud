import { useState } from "react";
import { X, HardDrive, FileText, Folder, AlertTriangle } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface FileEntry { path: string; size: number; type: "file" | "directory"; percentage: number; }

const SAMPLE_FILES: FileEntry[] = [
  { path: "node_modules/", size: 245000000, type: "directory" as const, percentage: 72 },
  { path: "dist/", size: 35000000, type: "directory" as const, percentage: 10 },
  { path: ".git/", size: 28000000, type: "directory" as const, percentage: 8 },
  { path: "src/", size: 15000000, type: "directory" as const, percentage: 4 },
  { path: "public/images/hero.png", size: 4500000, type: "file" as const, percentage: 1.3 },
  { path: "public/images/background.jpg", size: 3200000, type: "file" as const, percentage: 0.9 },
  { path: "package-lock.json", size: 2800000, type: "file" as const, percentage: 0.8 },
  { path: "src/assets/video.mp4", size: 2100000, type: "file" as const, percentage: 0.6 },
  { path: "src/data/dataset.json", size: 1500000, type: "file" as const, percentage: 0.4 },
  { path: "README.md", size: 45000, type: "file" as const, percentage: 0.01 },
].sort((a, b) => b.size - a.size);

const formatSize = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const TIPS = [
  "Add node_modules to .gitignore and use lockfiles instead",
  "Compress large images with WebP or AVIF format",
  "Remove unused dependencies with 'npx depcheck'",
  "Use dynamic imports to reduce bundle size",
  "Enable gzip compression for served assets",
];

export function FileSizeAnalyzer({ projectId, onClose }: Props) {
  const totalSize = SAMPLE_FILES.reduce((s, f) => s + f.size, 0);
  const largeFiles = SAMPLE_FILES.filter(f => f.type === "file" && f.size > 1000000);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="file-size-analyzer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">File Size Analyzer</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="text-center"><div className="text-lg font-bold">{formatSize(totalSize)}</div><div className="text-[10px] text-muted-foreground">Total project size</div></div>
        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
          {SAMPLE_FILES.slice(0, 5).map((f, i) => {
            const colors = ["bg-blue-400", "bg-green-400", "bg-purple-400", "bg-orange-400", "bg-cyan-400"];
            return <div key={i} className={`${colors[i]} transition-all`} style={{ width: `${f.percentage}%` }} title={`${f.path}: ${formatSize(f.size)}`} />;
          })}
        </div>
        <div className="space-y-1">
          {SAMPLE_FILES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs hover:bg-muted/30 rounded px-1.5 py-1">
              {f.type === "directory" ? <Folder className="w-3 h-3 text-muted-foreground shrink-0" /> : <FileText className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span className="flex-1 font-mono text-[10px] truncate">{f.path}</span>
              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden shrink-0"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(f.percentage * 1.3, 100)}%` }} /></div>
              <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">{formatSize(f.size)}</span>
              <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">{f.percentage}%</span>
            </div>
          ))}
        </div>
        {largeFiles.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-yellow-400" /> Optimization Tips</div>
            {TIPS.slice(0, 3).map((tip, i) => (
              <div key={i} className="text-[10px] text-muted-foreground bg-card/50 rounded p-1.5 border border-border/30">• {tip}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
