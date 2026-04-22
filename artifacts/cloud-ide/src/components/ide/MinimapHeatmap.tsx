import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Flame, X, BarChart3, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditRecord {
  line: number;
  timestamp: number;
}

interface HeatmapLine {
  line: number;
  count: number;
  intensity: number;
  lastEdited: number;
}

interface MinimapHeatmapProps {
  totalLines: number;
  visibleStartLine: number;
  visibleEndLine: number;
  onNavigate: (line: number) => void;
  editorRef?: any;
  onClose: () => void;
}

const HEATMAP_COLORS = [
  "rgba(59, 130, 246, 0.1)",
  "rgba(59, 130, 246, 0.25)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(234, 179, 8, 0.45)",
  "rgba(249, 115, 22, 0.55)",
  "rgba(239, 68, 68, 0.65)",
  "rgba(239, 68, 68, 0.85)",
];

function getHeatColor(intensity: number): string {
  const idx = Math.min(HEATMAP_COLORS.length - 1, Math.floor(intensity * HEATMAP_COLORS.length));
  return HEATMAP_COLORS[idx];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function MinimapHeatmap({ totalLines, visibleStartLine, visibleEndLine, onNavigate, editorRef, onClose }: MinimapHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [edits, setEdits] = useState<EditRecord[]>([]);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!editorRef?.current) return;
    const editor = editorRef.current;
    const disposable = editor.onDidChangeModelContent?.((e: any) => {
      if (!e.changes) return;
      const now = Date.now();
      const newEdits: EditRecord[] = [];
      for (const change of e.changes) {
        const startLine = change.range?.startLineNumber || 1;
        const endLine = change.range?.endLineNumber || startLine;
        for (let line = startLine; line <= endLine; line++) {
          newEdits.push({ line, timestamp: now });
        }
      }
      setEdits(prev => [...prev.slice(-5000), ...newEdits]);
    });
    return () => disposable?.dispose?.();
  }, [editorRef]);

  const heatmapData = useMemo((): HeatmapLine[] => {
    const lineMap = new Map<number, { count: number; lastEdited: number }>();
    for (const edit of edits) {
      const existing = lineMap.get(edit.line);
      if (existing) {
        existing.count++;
        existing.lastEdited = Math.max(existing.lastEdited, edit.timestamp);
      } else {
        lineMap.set(edit.line, { count: 1, lastEdited: edit.timestamp });
      }
    }

    const maxCount = Math.max(1, ...Array.from(lineMap.values()).map(v => v.count));
    const result: HeatmapLine[] = [];
    for (const [line, data] of lineMap) {
      result.push({
        line,
        count: data.count,
        intensity: data.count / maxCount,
        lastEdited: data.lastEdited,
      });
    }
    return result.sort((a, b) => b.count - a.count);
  }, [edits]);

  const hotspots = useMemo(() => heatmapData.slice(0, 10), [heatmapData]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = window.devicePixelRatio;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, width, height);

    if (totalLines <= 0) return;

    const lineHeight = Math.max(1, height / Math.max(totalLines, 1));

    if (showOverlay) {
      for (const item of heatmapData) {
        const y = ((item.line - 1) / totalLines) * height;
        const h = Math.max(lineHeight, 2);
        ctx.fillStyle = getHeatColor(item.intensity);
        ctx.fillRect(0, y, width, h);
      }
    }

    const vpStart = ((visibleStartLine - 1) / totalLines) * height;
    const vpEnd = ((visibleEndLine - 1) / totalLines) * height;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, vpStart, width, vpEnd - vpStart);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, vpStart, width, vpEnd - vpStart);

    if (hoveredLine !== null) {
      const hy = ((hoveredLine - 1) / totalLines) * height;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(0, hy - 1, width, 3);
    }
  }, [totalLines, visibleStartLine, visibleEndLine, heatmapData, hoveredLine, showOverlay]);

  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || totalLines <= 0) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const line = Math.max(1, Math.min(totalLines, Math.round((y / rect.height) * totalLines) + 1));
    onNavigate(line);
  }, [totalLines, onNavigate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || totalLines <= 0) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const line = Math.max(1, Math.min(totalLines, Math.round((y / rect.height) * totalLines) + 1));
    setHoveredLine(line);
  }, [totalLines]);

  const hoveredData = useMemo(() => {
    if (hoveredLine === null) return null;
    return heatmapData.find(h => h.line === hoveredLine) || null;
  }, [hoveredLine, heatmapData]);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="minimap-heatmap">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] font-medium">Edit Heatmap</span>
          <span className="text-[9px] text-muted-foreground">({edits.length} edits)</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setShowOverlay(!showOverlay)}
            title={showOverlay ? "Hide overlay" : "Show overlay"}>
            {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setShowStats(!showStats)}
            title="Toggle hotspot list">
            <BarChart3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative cursor-pointer"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <canvas ref={canvasRef} className="w-full h-full" />

          {hoveredLine !== null && (
            <div className="absolute left-full ml-1 bg-popover border border-border rounded px-2 py-1 shadow-lg z-50 whitespace-nowrap pointer-events-none"
              style={{ top: `${((hoveredLine - 1) / Math.max(totalLines, 1)) * 100}%`, transform: "translateY(-50%)" }}>
              <p className="text-[10px] font-medium">Line {hoveredLine}</p>
              {hoveredData ? (
                <>
                  <p className="text-[9px] text-muted-foreground">{hoveredData.count} edit{hoveredData.count !== 1 ? "s" : ""}</p>
                  <p className="text-[9px] text-muted-foreground">Last: {timeAgo(hoveredData.lastEdited)}</p>
                </>
              ) : (
                <p className="text-[9px] text-muted-foreground">No edits</p>
              )}
            </div>
          )}
        </div>

        {showStats && (
          <div className="w-36 border-l border-border/50 overflow-y-auto shrink-0">
            <div className="px-2 py-1 border-b border-border/30">
              <span className="text-[9px] font-medium text-muted-foreground uppercase">Top Hotspots</span>
            </div>
            {hotspots.length === 0 ? (
              <div className="px-2 py-3 text-center">
                <p className="text-[9px] text-muted-foreground">No edits recorded yet</p>
                <p className="text-[8px] text-muted-foreground mt-1">Start editing to see hotspots</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {hotspots.map((spot, i) => (
                  <button
                    key={spot.line}
                    className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-muted/30 text-left"
                    onClick={() => onNavigate(spot.line)}
                  >
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}.</span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getHeatColor(spot.intensity).replace(/[\d.]+\)$/, "1)") }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono">L{spot.line}</span>
                      <span className="text-[9px] text-muted-foreground ml-1">{spot.count}x</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {edits.length > 0 && (
              <div className="px-2 py-1.5 border-t border-border/30">
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>Total edits</span>
                  <span>{edits.length}</span>
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>Lines touched</span>
                  <span>{heatmapData.length}</span>
                </div>
                <div className="mt-1 flex gap-0.5">
                  {HEATMAP_COLORS.map((c, i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: c.replace(/[\d.]+\)$/, "0.8)") }} />
                  ))}
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground mt-0.5">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
