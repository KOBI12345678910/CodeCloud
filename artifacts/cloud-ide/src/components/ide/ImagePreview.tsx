import { useState, useRef, useCallback, useEffect } from "react";
import {
  ZoomIn, ZoomOut, Maximize2, Image as ImageIcon,
  RotateCcw, Download, Loader2, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "avif"]);

export function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.has(ext);
}

interface ImagePreviewProps {
  fileName: string;
  content: string;
  mimeType?: string | null;
}

const ZOOM_STEPS = [10, 25, 33, 50, 67, 75, 100, 125, 150, 200, 300, 400, 500];

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim());
}

function isDataUrl(str: string): boolean {
  return /^data:/i.test(str.trim());
}

function isLikelyBase64(str: string): boolean {
  if (str.length < 16) return false;
  const cleaned = str.replace(/[\n\r\s]/g, "");
  if (cleaned.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(cleaned);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function resolveImageSrc(content: string, fileName: string, mimeType?: string | null): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (isDataUrl(trimmed)) return trimmed;
  if (isUrl(trimmed)) return trimmed;

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType || (ext === "svg" ? "image/svg+xml" : `image/${ext || "png"}`);
  const isSvg = mime === "image/svg+xml";

  const cleanedBase64 = trimmed.replace(/[\n\r\s]/g, "");

  if (isSvg) {
    if (isLikelyBase64(trimmed)) {
      return `data:image/svg+xml;base64,${cleanedBase64}`;
    }
    return `data:image/svg+xml;base64,${utf8ToBase64(trimmed)}`;
  }

  if (isLikelyBase64(trimmed)) {
    return `data:${mime};base64,${cleanedBase64}`;
  }

  return null;
}

export default function ImagePreview({ fileName, content, mimeType }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  const imageSrc = resolveImageSrc(content, fileName, mimeType);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    setLoaded(true);
    setError(false);

    if (containerRef.current) {
      const container = containerRef.current;
      const fitW = (container.clientWidth - 48) / img.naturalWidth * 100;
      const fitH = (container.clientHeight - 48) / img.naturalHeight * 100;
      const fit = Math.min(fitW, fitH, 100);
      setZoom(Math.round(fit));
    }
  }, []);

  const zoomIn = () => {
    const next = ZOOM_STEPS.find((s) => s > zoom);
    setZoom(next || zoom);
  };

  const zoomOut = () => {
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < zoom);
    setZoom(prev || zoom);
  };

  const fitToPanel = useCallback(() => {
    if (!containerRef.current || !naturalWidth || !naturalHeight) return;
    const container = containerRef.current;
    const fitW = (container.clientWidth - 48) / naturalWidth * 100;
    const fitH = (container.clientHeight - 48) / naturalHeight * 100;
    setZoom(Math.round(Math.min(fitW, fitH, 100)));
    setPosition({ x: 0, y: 0 });
  }, [naturalWidth, naturalHeight]);

  const actualSize = () => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (error) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom((prev) => Math.min(500, Math.max(10, prev + delta)));
  }, [error]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || error) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  }, [position, error]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: dragStart.current.posX + (e.clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.clientY - dragStart.current.y),
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (loaded && !error) fitToPanel();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [loaded, error, fitToPanel]);

  const handleDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = fileName;
    a.click();
  };

  const displayWidth = Math.round(naturalWidth * zoom / 100);
  const displayHeight = Math.round(naturalHeight * zoom / 100);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setPosition({ x: 0, y: 0 });
  }, [fileName, content]);

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)]" data-testid="image-preview">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <ImageIcon className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium truncate max-w-[200px]" data-testid="image-filename">{fileName}</span>
          {loaded && (
            <span className="text-muted-foreground/50" data-testid="image-dimensions">
              {naturalWidth} × {naturalHeight} · {ext.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut} disabled={zoom <= 10 || error} data-testid="button-zoom-out">
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-center" data-testid="image-zoom-level">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn} disabled={zoom >= 500 || error} data-testid="button-zoom-in">
            <ZoomIn className="w-3 h-3" />
          </Button>
          <div className="w-px h-4 bg-border/30 mx-1" />
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={fitToPanel} disabled={error} data-testid="button-fit">
            <Maximize2 className="w-3 h-3 mr-1" /> Fit
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={actualSize} disabled={error} data-testid="button-actual">
            <RotateCcw className="w-3 h-3 mr-1" /> 1:1
          </Button>
          <div className="w-px h-4 bg-border/30 mx-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownload} disabled={!imageSrc || error} data-testid="button-download">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden flex items-center justify-center ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{
          backgroundImage: "linear-gradient(45deg, hsl(222,47%,14%) 25%, transparent 25%), linear-gradient(-45deg, hsl(222,47%,14%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(222,47%,14%) 75%), linear-gradient(-45deg, transparent 75%, hsl(222,47%,14%) 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          backgroundColor: "hsl(222,47%,11%)",
        }}
        data-testid="image-canvas"
      >
        {!loaded && !error && imageSrc && (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        )}
        {(error || !imageSrc) && (
          <div className="text-center text-muted-foreground">
            <ImageOff className="w-10 h-10 mb-2 mx-auto opacity-30" />
            <p className="text-xs">Failed to load image</p>
          </div>
        )}
        {imageSrc && (
          <img
            ref={imgRef}
            src={imageSrc}
            alt={fileName}
            onLoad={handleLoad}
            onError={() => setError(true)}
            className="select-none"
            draggable={false}
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              transform: `translate(${position.x}px, ${position.y}px)`,
              display: loaded && !error ? "block" : "none",
              imageRendering: zoom > 200 ? "pixelated" : "auto",
            }}
            data-testid="image-preview-img"
          />
        )}
      </div>

      <div className="px-3 py-1 border-t border-border/30 bg-[hsl(222,47%,13%)] text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span>{loaded ? `${naturalWidth} × ${naturalHeight} px` : (error ? "Error" : "Loading...")}</span>
        <span>{loaded ? `${displayWidth} × ${displayHeight} px (${zoom}%)` : ""}</span>
      </div>
    </div>
  );
}
