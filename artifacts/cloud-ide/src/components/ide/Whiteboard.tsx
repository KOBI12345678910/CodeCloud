import { useState, useRef, useCallback, useEffect } from "react";
import {
  Square, Circle, ArrowRight, Type, Pencil, MousePointer, Trash2,
  Download, Undo2, Redo2, Palette, X, Minus, Plus, Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ShapeType = "rect" | "circle" | "arrow" | "text" | "freehand";
type Tool = "select" | ShapeType;

interface Point {
  x: number;
  y: number;
}

interface WhiteboardShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
  rotation?: number;
}

const COLORS = ["#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function Whiteboard({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [color, setColor] = useState("#3b82f6");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showColors, setShowColors] = useState(false);
  const [undoStack, setUndoStack] = useState<WhiteboardShape[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardShape[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentFreehand, setCurrentFreehand] = useState<Point[]>([]);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), shapes.map(s => ({ ...s }))]);
    setRedoStack([]);
  }, [shapes]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, shapes.map(s => ({ ...s }))]);
    setShapes(prev);
    setUndoStack(u => u.slice(0, -1));
  }, [undoStack, shapes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, shapes.map(s => ({ ...s }))]);
    setShapes(next);
    setRedoStack(r => r.slice(0, -1));
  }, [redoStack, shapes]);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: WhiteboardShape, isSelected: boolean) => {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.fillStyle = shape.fill || "transparent";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (shape.type) {
      case "rect":
        if (shape.fill && shape.fill !== "transparent") {
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "circle": {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const rx = Math.abs(shape.width) / 2;
        const ry = Math.abs(shape.height) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (shape.fill && shape.fill !== "transparent") ctx.fill();
        ctx.stroke();
        break;
      }
      case "arrow": {
        const sx = shape.x;
        const sy = shape.y;
        const ex = shape.x + shape.width;
        const ey = shape.y + shape.height;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      }
      case "text":
        ctx.font = `${Math.max(14, shape.height)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = shape.color;
        ctx.textBaseline = "top";
        ctx.fillText(shape.text || "", shape.x, shape.y);
        break;
      case "freehand":
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.stroke();
        }
        break;
    }

    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const pad = 6;
      if (shape.type === "freehand" && shape.points) {
        const xs = shape.points.map(p => p.x);
        const ys = shape.points.map(p => p.y);
        const minX = Math.min(...xs) - pad;
        const minY = Math.min(...ys) - pad;
        const maxX = Math.max(...xs) + pad;
        const maxY = Math.max(...ys) + pad;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      } else {
        ctx.strokeRect(shape.x - pad, shape.y - pad, (shape.width || 100) + pad * 2, (shape.height || 20) + pad * 2);
      }
    }

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const gridSize = 20 * zoom;
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    const offX = panOffset.x % gridSize;
    const offY = panOffset.y % gridSize;
    for (let x = offX; x < rect.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
    }
    for (let y = offY; y < rect.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    for (const shape of shapes) {
      drawShape(ctx, shape, shape.id === selectedId);
    }

    if (isDrawing && drawStart && tool !== "freehand" && tool !== "select" && tool !== "text") {
      const ghost: WhiteboardShape = {
        id: "ghost",
        type: tool as ShapeType,
        x: drawStart.x,
        y: drawStart.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
      };
      drawShape(ctx, ghost, false);
    }

    if (currentFreehand.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentFreehand[0].x, currentFreehand[0].y);
      for (let i = 1; i < currentFreehand.length; i++) {
        ctx.lineTo(currentFreehand[i].x, currentFreehand[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [shapes, selectedId, isDrawing, drawStart, tool, color, strokeWidth, currentFreehand, panOffset, zoom, drawShape]);

  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  const hitTest = useCallback((point: Point): WhiteboardShape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const pad = 8;
      if (s.type === "freehand" && s.points) {
        for (const p of s.points) {
          if (Math.abs(p.x - point.x) < pad && Math.abs(p.y - point.y) < pad) return s;
        }
      } else {
        const minX = Math.min(s.x, s.x + (s.width || 0)) - pad;
        const maxX = Math.max(s.x, s.x + (s.width || 0)) + pad;
        const minY = Math.min(s.y, s.y + (s.height || 0)) - pad;
        const maxY = Math.max(s.y, s.y + (s.height || 0)) + pad;
        if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) return s;
      }
    }
    return null;
  }, [shapes]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    if (e.button === 1 || (e.button === 0 && e.altKey && tool === "select")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (tool === "select") {
      const hit = hitTest(point);
      if (hit) {
        setSelectedId(hit.id);
        setDragOffset({ x: point.x - hit.x, y: point.y - hit.y });
      } else {
        setSelectedId(null);
      }
      setIsDrawing(true);
      return;
    }

    if (tool === "text") {
      setEditingText("new");
      setTextInput("");
      setDrawStart(point);
      return;
    }

    if (tool === "freehand") {
      pushUndo();
      setCurrentFreehand([point]);
      setIsDrawing(true);
      return;
    }

    pushUndo();
    setDrawStart(point);
    setIsDrawing(true);
  }, [tool, getCanvasPoint, hitTest, pushUndo, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!isDrawing) return;
    const point = getCanvasPoint(e);

    if (tool === "select" && selectedId && dragOffset) {
      setShapes(prev => prev.map(s =>
        s.id === selectedId ? { ...s, x: point.x - dragOffset.x, y: point.y - dragOffset.y } : s
      ));
      return;
    }

    if (tool === "freehand") {
      setCurrentFreehand(prev => [...prev, point]);
      return;
    }

    if (drawStart && tool !== "select" && tool !== "text") {
      setShapes(prev => {
        const existing = prev.find(s => s.id === "drawing");
        const shape: WhiteboardShape = {
          id: "drawing",
          type: tool as ShapeType,
          x: drawStart.x,
          y: drawStart.y,
          width: point.x - drawStart.x,
          height: point.y - drawStart.y,
          color,
          strokeWidth,
        };
        if (existing) return prev.map(s => s.id === "drawing" ? shape : s);
        return [...prev, shape];
      });
    }
  }, [isPanning, panStart, isDrawing, tool, selectedId, dragOffset, getCanvasPoint, drawStart, color, strokeWidth]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (tool === "freehand" && currentFreehand.length > 1) {
      const xs = currentFreehand.map(p => p.x);
      const ys = currentFreehand.map(p => p.y);
      setShapes(prev => [...prev, {
        id: generateId(),
        type: "freehand",
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: currentFreehand,
        color,
        strokeWidth,
      }]);
      setCurrentFreehand([]);
    }

    if (tool !== "select" && tool !== "freehand" && tool !== "text") {
      setShapes(prev => prev.map(s => s.id === "drawing" ? { ...s, id: generateId() } : s));
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDragOffset(null);
  }, [isPanning, tool, currentFreehand, color, strokeWidth]);

  const addText = useCallback(() => {
    if (!textInput.trim() || !drawStart) return;
    pushUndo();
    setShapes(prev => [...prev, {
      id: generateId(),
      type: "text",
      x: drawStart.x,
      y: drawStart.y,
      width: textInput.length * 10,
      height: 20,
      text: textInput,
      color,
      strokeWidth,
    }]);
    setEditingText(null);
    setTextInput("");
    setDrawStart(null);
  }, [textInput, drawStart, color, strokeWidth, pushUndo]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setShapes(prev => prev.filter(s => s.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, pushUndo]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, exportCanvas.width / dpr, exportCanvas.height / dpr);
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);
    for (const shape of shapes) {
      drawShape(ctx, shape, false);
    }

    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [shapes, panOffset, zoom, drawShape]);

  const clearAll = useCallback(() => {
    pushUndo();
    setShapes([]);
    setSelectedId(null);
  }, [pushUndo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingText) return;
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); e.preventDefault(); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { undo(); e.preventDefault(); }
      if ((e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === "y" && (e.ctrlKey || e.metaKey))) { redo(); e.preventDefault(); }
      if (e.key === "v" || e.key === "1") setTool("select");
      if (e.key === "r" || e.key === "2") setTool("rect");
      if (e.key === "o" || e.key === "3") setTool("circle");
      if (e.key === "a" || e.key === "4") setTool("arrow");
      if (e.key === "t" || e.key === "5") setTool("text");
      if (e.key === "p" || e.key === "6") setTool("freehand");
      if (e.key === "Escape") { setSelectedId(null); setEditingText(null); setTool("select"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, undo, redo, editingText]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  const tools: { tool: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { tool: "select", icon: <MousePointer className="w-4 h-4" />, label: "Select", shortcut: "V" },
    { tool: "rect", icon: <Square className="w-4 h-4" />, label: "Rectangle", shortcut: "R" },
    { tool: "circle", icon: <Circle className="w-4 h-4" />, label: "Circle", shortcut: "O" },
    { tool: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow", shortcut: "A" },
    { tool: "text", icon: <Type className="w-4 h-4" />, label: "Text", shortcut: "T" },
    { tool: "freehand", icon: <Pencil className="w-4 h-4" />, label: "Draw", shortcut: "P" },
  ];

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-[#1a1a2e] relative" data-testid="whiteboard-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-[#16162a] shrink-0">
        <div className="flex items-center gap-1">
          {tools.map(t => (
            <Button
              key={t.tool}
              size="sm"
              variant={tool === t.tool ? "secondary" : "ghost"}
              className={`h-7 w-7 p-0 ${tool === t.tool ? "bg-blue-500/20 text-blue-400" : "text-white/60 hover:text-white"}`}
              onClick={() => setTool(t.tool)}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
            </Button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />

          <div className="relative">
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
              onClick={() => setShowColors(!showColors)}
            >
              <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: color }} />
            </Button>
            {showColors && (
              <div className="absolute top-8 left-0 z-50 bg-[#16162a] border border-white/10 rounded-lg p-2 flex gap-1 shadow-xl">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded border-2 ${color === c ? "border-blue-400" : "border-transparent"} hover:scale-110 transition-transform`}
                    style={{ backgroundColor: c }}
                    onClick={() => { setColor(c); setShowColors(false); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
              onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}>
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-[10px] text-white/40 w-4 text-center">{strokeWidth}</span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
              onClick={() => setStrokeWidth(Math.min(10, strokeWidth + 1))}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
            onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
            onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <span className="text-[10px] text-white/30">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
            onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} title="Reset view">
            <Move className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white/60 hover:text-white gap-1"
            onClick={exportPng} title="Export as PNG">
            <Download className="w-3 h-3" /> PNG
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400"
            onClick={deleteSelected} disabled={!selectedId} title="Delete selected">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/60 hover:text-white"
            onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ cursor: tool === "select" ? (selectedId ? "move" : "default") : tool === "freehand" ? "crosshair" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {editingText && drawStart && (
          <div
            className="absolute"
            style={{
              left: drawStart.x * zoom + panOffset.x,
              top: drawStart.y * zoom + panOffset.y,
            }}
          >
            <input
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addText(); if (e.key === "Escape") { setEditingText(null); setDrawStart(null); } }}
              onBlur={addText}
              className="bg-transparent border border-blue-400 text-white px-1 py-0.5 text-sm outline-none min-w-[100px]"
              placeholder="Type here..."
            />
          </div>
        )}

        <div className="absolute bottom-3 left-3 text-[10px] text-white/20 select-none">
          {shapes.length} objects | Scroll to zoom | Alt+drag to pan | Shortcuts: V R O A T P
        </div>

        {selectedId && (
          <div className="absolute top-2 right-2 bg-[#16162a] border border-white/10 rounded px-2 py-1 text-[10px] text-white/50">
            Selected: {shapes.find(s => s.id === selectedId)?.type} | Press Delete to remove
          </div>
        )}
      </div>
    </div>
  );
}
