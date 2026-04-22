import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Pencil, Square, Circle, Type, Eraser, Download, Share2,
  Undo2, Redo2, Palette, X, MousePointer, Minus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tool = "pointer" | "pen" | "rectangle" | "circle" | "text" | "line" | "eraser";

interface Annotation {
  id: string;
  tool: Tool;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  text?: string;
  author: string;
  timestamp: Date;
}

interface PreviewAnnotatorProps {
  previewUrl?: string;
  onClose?: () => void;
  onShare?: (annotations: Annotation[]) => void;
}

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#000000"];

export default function PreviewAnnotator({ previewUrl, onClose, onShare }: PreviewAnnotatorProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const ann of annotations) {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.tool === "pen" && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
        ctx.stroke();
      } else if (ann.tool === "rectangle" && ann.points.length === 2) {
        ctx.strokeRect(ann.points[0].x, ann.points[0].y, ann.points[1].x - ann.points[0].x, ann.points[1].y - ann.points[0].y);
      } else if (ann.tool === "circle" && ann.points.length === 2) {
        const rx = Math.abs(ann.points[1].x - ann.points[0].x) / 2;
        const ry = Math.abs(ann.points[1].y - ann.points[0].y) / 2;
        ctx.beginPath();
        ctx.ellipse(ann.points[0].x + rx, ann.points[0].y + ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.tool === "line" && ann.points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ctx.lineTo(ann.points[1].x, ann.points[1].y);
        ctx.stroke();
      } else if (ann.tool === "text" && ann.text && ann.points.length > 0) {
        ctx.font = `${ann.strokeWidth * 5}px sans-serif`;
        ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
      }
    }

    if (isDrawing && currentPoints.length > 1 && (tool === "pen" || tool === "eraser")) {
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? strokeWidth * 3 : strokeWidth;
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      ctx.stroke();
    }
  }, [annotations, isDrawing, currentPoints, tool, color, strokeWidth]);

  useEffect(() => { drawAnnotations(); }, [drawAnnotations]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "pointer") return;
    if (tool === "text") {
      setTextPosition(getPos(e));
      return;
    }
    setIsDrawing(true);
    setCurrentPoints([getPos(e)]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    if (tool === "pen" || tool === "eraser") {
      setCurrentPoints(prev => [...prev, pos]);
    } else {
      setCurrentPoints(prev => [prev[0], pos]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length < 2) return;

    const annotation: Annotation = {
      id: `ann-${Date.now()}`, tool, points: currentPoints,
      color: tool === "eraser" ? "#ffffff" : color,
      strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
      author: "You", timestamp: new Date(),
    };
    setUndoStack(prev => [...prev, annotations]);
    setAnnotations(prev => [...prev, annotation]);
    setCurrentPoints([]);
  };

  const addTextAnnotation = () => {
    if (!textPosition || !textInput.trim()) return;
    const annotation: Annotation = {
      id: `ann-${Date.now()}`, tool: "text", points: [textPosition],
      color, strokeWidth, text: textInput, author: "You", timestamp: new Date(),
    };
    setUndoStack(prev => [...prev, annotations]);
    setAnnotations(prev => [...prev, annotation]);
    setTextInput("");
    setTextPosition(null);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    setAnnotations(undoStack[undoStack.length - 1]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    setUndoStack(prev => [...prev, annotations]);
    setAnnotations([]);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "annotated-preview.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: "pointer", icon: MousePointer, label: "Select" },
    { id: "pen", icon: Pencil, label: "Draw" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Preview Annotator</span>
          <span className="text-[10px] text-muted-foreground">{annotations.length} annotations</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={undoStack.length === 0} title="Undo">
            <Undo2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearAll} title="Clear All">
            <Trash2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportImage} title="Export">
            <Download size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onShare?.(annotations)} title="Share">
            <Share2 size={14} />
          </Button>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={14} /></Button>}
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 shrink-0">
        {tools.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className={`p-1.5 rounded transition-colors ${tool === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
            <t.icon size={14} />
          </button>
        ))}
        <div className="w-px h-5 bg-border/30 mx-1" />
        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-6 h-6 rounded border border-border/50" style={{ backgroundColor: color }} />
          {showColorPicker && (
            <div className="absolute top-8 left-0 z-10 p-2 rounded-lg border border-border bg-popover shadow-lg flex gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                  className={`w-5 h-5 rounded border ${color === c ? "border-primary ring-1 ring-primary" : "border-border/50"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-1">
          <span className="text-[10px] text-muted-foreground">Size:</span>
          <input type="range" min="1" max="10" value={strokeWidth} onChange={e => setStrokeWidth(+e.target.value)}
            className="w-16 h-1 accent-primary" />
          <span className="text-[10px] text-muted-foreground w-4">{strokeWidth}</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {previewUrl && (
          <iframe src={previewUrl} className="absolute inset-0 w-full h-full border-0 pointer-events-none" title="Preview" />
        )}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === "pointer" ? "default" : tool === "text" ? "text" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {textPosition && (
          <div className="absolute z-10" style={{ left: textPosition.x, top: textPosition.y + 40 }}>
            <div className="flex items-center gap-1 bg-popover border border-border rounded shadow-lg p-1">
              <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTextAnnotation()}
                placeholder="Type text..." autoFocus
                className="px-2 py-1 text-xs bg-transparent outline-none w-40" />
              <Button size="sm" className="h-6 text-[10px]" onClick={addTextAnnotation}>Add</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setTextPosition(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
