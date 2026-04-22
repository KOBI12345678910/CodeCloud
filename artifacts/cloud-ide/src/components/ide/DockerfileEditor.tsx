import { useState } from "react";
import { X, Play, Loader2, AlertTriangle, CheckCircle2, Package, Layers } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface ImageAnalysis {
  totalSize: number;
  layerCount: number;
  layers: { instruction: string; size: number; percentage: number }[];
  suggestions: string[];
  baseImage: string;
  multistage: boolean;
}

interface Props { projectId: string; onClose: () => void; }

export function DockerfileEditor({ projectId, onClose }: Props) {
  const [content, setContent] = useState(`FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [building, setBuilding] = useState(false);
  const [imageName, setImageName] = useState("my-app");
  const [tag, setTag] = useState("latest");
  const [buildResult, setBuildResult] = useState<any>(null);

  const analyze = async () => {
    try {
      const res = await fetch(`${API}/docker/analyze`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      if (res.ok) setAnalysis(await res.json());
    } catch {}
  };

  const build = async () => {
    setBuilding(true);
    try {
      const res = await fetch(`${API}/docker/build`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dockerfile: content, imageName, tag }) });
      if (res.ok) setBuildResult(await res.json());
    } catch {} finally { setBuilding(false); }
  };

  const formatSize = (bytes: number) => bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} KB`;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="dockerfile-editor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Container Image Builder</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-border/30">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
            <input value={imageName} onChange={e => setImageName(e.target.value)} className="bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-xs w-32" placeholder="Image name" />
            <span className="text-xs text-muted-foreground">:</span>
            <input value={tag} onChange={e => setTag(e.target.value)} className="bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-xs w-20" placeholder="Tag" />
            <button onClick={analyze} className="px-2 py-0.5 text-xs bg-muted hover:bg-muted/80 rounded">Analyze</button>
            <button onClick={build} disabled={building} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
              {building ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Build
            </button>
          </div>
          <textarea value={content} onChange={e => { setContent(e.target.value); setAnalysis(null); setBuildResult(null); }} className="flex-1 bg-background p-3 text-xs font-mono resize-none outline-none" spellCheck={false} data-testid="dockerfile-textarea" />
        </div>
        <div className="w-72 flex flex-col overflow-y-auto">
          {analysis && (
            <div className="p-2 space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Analysis</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-card/50 rounded p-1.5 border border-border/30"><div className="text-[10px] text-muted-foreground">Size</div><div className="font-bold">{formatSize(analysis.totalSize)}</div></div>
                <div className="bg-card/50 rounded p-1.5 border border-border/30"><div className="text-[10px] text-muted-foreground">Layers</div><div className="font-bold">{analysis.layerCount}</div></div>
                <div className="bg-card/50 rounded p-1.5 border border-border/30"><div className="text-[10px] text-muted-foreground">Base</div><div className="font-bold truncate">{analysis.baseImage}</div></div>
                <div className="bg-card/50 rounded p-1.5 border border-border/30"><div className="text-[10px] text-muted-foreground">Multi-stage</div><div className="font-bold">{analysis.multistage ? "Yes" : "No"}</div></div>
              </div>
              {analysis.suggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggestions</div>
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex gap-1.5 text-[11px] text-yellow-400 bg-yellow-400/5 rounded p-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{s}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Layers</div>
                {analysis.layers.map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <Layers className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-mono">{l.instruction}</span>
                    <span className="text-muted-foreground">{formatSize(l.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {buildResult && (
            <div className="p-2 space-y-1 border-t border-border/30">
              <div className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3 h-3" /> Build completed</div>
              <div className="text-[10px] text-muted-foreground">Image: {buildResult.imageName}:{buildResult.imageTag}</div>
              <div className="text-[10px] text-muted-foreground">Size: {formatSize(buildResult.size)}</div>
              <div className="text-[10px] text-muted-foreground">Time: {(buildResult.buildTime / 1000).toFixed(1)}s</div>
            </div>
          )}
          {!analysis && !buildResult && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4 text-center">
              <div><Package className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>Edit your Dockerfile and click Analyze to see size breakdown and optimization suggestions</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
