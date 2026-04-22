import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUp, ArrowDown, RotateCcw, Columns2, Rows2,
  X, Copy, Check, FileCode, Clock, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileVersion {
  id: string;
  label: string;
  content: string;
  timestamp: Date;
  author?: string;
}

interface DiffHunk {
  startLine: number;
  endLine: number;
  type: "added" | "removed" | "modified";
}

interface DiffLine {
  lineNumber: { original: number | null; modified: number | null };
  type: "unchanged" | "added" | "removed";
  content: string;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const result: DiffLine[] = [];

  const m = origLines.length;
  const n = modLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === modLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: Array<{ origIdx: number; modIdx: number }> = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (origLines[i - 1] === modLines[j - 1]) {
      lcs.unshift({ origIdx: i - 1, modIdx: j - 1 });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  let oi = 0, mi = 0;
  for (const match of lcs) {
    while (oi < match.origIdx) {
      result.push({ lineNumber: { original: oi + 1, modified: null }, type: "removed", content: origLines[oi] });
      oi++;
    }
    while (mi < match.modIdx) {
      result.push({ lineNumber: { original: null, modified: mi + 1 }, type: "added", content: modLines[mi] });
      mi++;
    }
    result.push({ lineNumber: { original: oi + 1, modified: mi + 1 }, type: "unchanged", content: origLines[oi] });
    oi++; mi++;
  }
  while (oi < m) {
    result.push({ lineNumber: { original: oi + 1, modified: null }, type: "removed", content: origLines[oi] });
    oi++;
  }
  while (mi < n) {
    result.push({ lineNumber: { original: null, modified: mi + 1 }, type: "added", content: modLines[mi] });
    mi++;
  }

  return result;
}

function findHunks(lines: DiffLine[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let hunkStart = -1;
  let hunkType: DiffHunk["type"] | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== "unchanged") {
      if (hunkStart === -1) {
        hunkStart = i;
        hunkType = lines[i].type === "added" ? "added" : "removed";
      } else if (lines[i].type !== hunkType && hunkType !== "modified") {
        hunkType = "modified";
      }
    } else if (hunkStart !== -1) {
      hunks.push({ startLine: hunkStart, endLine: i - 1, type: hunkType! });
      hunkStart = -1;
      hunkType = null;
    }
  }
  if (hunkStart !== -1) {
    hunks.push({ startLine: hunkStart, endLine: lines.length - 1, type: hunkType! });
  }
  return hunks;
}

interface DiffViewerProps {
  fileName: string;
  originalVersion: FileVersion;
  modifiedVersion: FileVersion;
  versions?: FileVersion[];
  onRevertHunk?: (hunkIndex: number, originalContent: string[]) => void;
  onClose?: () => void;
  onSelectVersion?: (versionId: string, side: "original" | "modified") => void;
}

export default function DiffViewer({
  fileName,
  originalVersion,
  modifiedVersion,
  versions = [],
  onRevertHunk,
  onClose,
  onSelectVersion,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "inline">("side-by-side");
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);
  const [copiedHunk, setCopiedHunk] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hunkRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const diffLines = useMemo(
    () => computeDiff(originalVersion.content, modifiedVersion.content),
    [originalVersion.content, modifiedVersion.content]
  );

  const hunks = useMemo(() => findHunks(diffLines), [diffLines]);

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    for (const line of diffLines) {
      if (line.type === "added") added++;
      if (line.type === "removed") removed++;
    }
    return { added, removed, total: diffLines.length };
  }, [diffLines]);

  const navigateHunk = useCallback((direction: "prev" | "next") => {
    if (hunks.length === 0) return;
    const newIndex = direction === "next"
      ? Math.min(currentHunkIndex + 1, hunks.length - 1)
      : Math.max(currentHunkIndex - 1, 0);
    setCurrentHunkIndex(newIndex);
    const el = hunkRefs.current.get(newIndex);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentHunkIndex, hunks.length]);

  const handleRevertHunk = useCallback((hunkIdx: number) => {
    if (!onRevertHunk) return;
    const hunk = hunks[hunkIdx];
    const originalLines = diffLines
      .slice(hunk.startLine, hunk.endLine + 1)
      .filter((l) => l.type === "removed")
      .map((l) => l.content);
    onRevertHunk(hunkIdx, originalLines);
  }, [hunks, diffLines, onRevertHunk]);

  const copyHunk = useCallback((hunkIdx: number) => {
    const hunk = hunks[hunkIdx];
    const content = diffLines
      .slice(hunk.startLine, hunk.endLine + 1)
      .map((l) => `${l.type === "added" ? "+" : l.type === "removed" ? "-" : " "} ${l.content}`)
      .join("\n");
    navigator.clipboard.writeText(content);
    setCopiedHunk(hunkIdx);
    setTimeout(() => setCopiedHunk(null), 2000);
  }, [hunks, diffLines]);

  const renderLineContent = (line: DiffLine, hunkIdx: number | null) => {
    const bgClass = line.type === "added"
      ? "bg-emerald-500/10"
      : line.type === "removed"
        ? "bg-red-500/10"
        : "";
    const textClass = line.type === "added"
      ? "text-emerald-300"
      : line.type === "removed"
        ? "text-red-300"
        : "text-foreground/80";
    const gutterClass = line.type === "added"
      ? "text-emerald-500/50 bg-emerald-500/5"
      : line.type === "removed"
        ? "text-red-500/50 bg-red-500/5"
        : "text-muted-foreground/30";
    const symbol = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";

    return (
      <div className={`flex items-stretch text-xs font-mono leading-5 ${bgClass} hover:brightness-110`}>
        <span className={`w-12 text-right px-2 select-none shrink-0 ${gutterClass}`}>
          {line.lineNumber.original || ""}
        </span>
        {viewMode === "side-by-side" ? null : (
          <span className={`w-12 text-right px-2 select-none shrink-0 ${gutterClass}`}>
            {line.lineNumber.modified || ""}
          </span>
        )}
        <span className={`w-4 text-center select-none shrink-0 ${textClass}`}>{symbol}</span>
        <span className={`flex-1 px-2 whitespace-pre overflow-x-auto ${textClass}`}>{line.content || " "}</span>
      </div>
    );
  };

  const renderSideBySide = () => {
    const leftLines: (DiffLine | null)[] = [];
    const rightLines: (DiffLine | null)[] = [];

    let i = 0;
    while (i < diffLines.length) {
      if (diffLines[i].type === "unchanged") {
        leftLines.push(diffLines[i]);
        rightLines.push(diffLines[i]);
        i++;
      } else {
        const removedStart = i;
        while (i < diffLines.length && diffLines[i].type === "removed") i++;
        const addedStart = i;
        while (i < diffLines.length && diffLines[i].type === "added") i++;

        const removedCount = addedStart - removedStart;
        const addedCount = i - addedStart;
        const maxCount = Math.max(removedCount, addedCount);

        for (let j = 0; j < maxCount; j++) {
          leftLines.push(j < removedCount ? diffLines[removedStart + j] : null);
          rightLines.push(j < addedCount ? diffLines[addedStart + j] : null);
        }
      }
    }

    return (
      <div className="flex divide-x divide-border/30">
        <div className="flex-1 min-w-0">
          <div className="px-3 py-1 text-[10px] text-muted-foreground bg-red-500/5 border-b border-border/30 font-medium">
            {originalVersion.label}
          </div>
          {leftLines.map((line, idx) => (
            <div key={`l-${idx}`}>
              {line ? (
                <div className={`flex items-stretch text-xs font-mono leading-5 ${
                  line.type === "removed" ? "bg-red-500/10" : ""
                } hover:brightness-110`}>
                  <span className={`w-12 text-right px-2 select-none shrink-0 ${
                    line.type === "removed" ? "text-red-500/50 bg-red-500/5" : "text-muted-foreground/30"
                  }`}>
                    {line.lineNumber.original || ""}
                  </span>
                  <span className={`w-4 text-center select-none shrink-0 ${
                    line.type === "removed" ? "text-red-300" : ""
                  }`}>
                    {line.type === "removed" ? "-" : " "}
                  </span>
                  <span className={`flex-1 px-2 whitespace-pre overflow-x-auto ${
                    line.type === "removed" ? "text-red-300" : "text-foreground/80"
                  }`}>{line.content || " "}</span>
                </div>
              ) : (
                <div className="h-5 bg-muted/10" />
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="px-3 py-1 text-[10px] text-muted-foreground bg-emerald-500/5 border-b border-border/30 font-medium">
            {modifiedVersion.label}
          </div>
          {rightLines.map((line, idx) => (
            <div key={`r-${idx}`}>
              {line ? (
                <div className={`flex items-stretch text-xs font-mono leading-5 ${
                  line.type === "added" ? "bg-emerald-500/10" : ""
                } hover:brightness-110`}>
                  <span className={`w-12 text-right px-2 select-none shrink-0 ${
                    line.type === "added" ? "text-emerald-500/50 bg-emerald-500/5" : "text-muted-foreground/30"
                  }`}>
                    {line.lineNumber.modified || ""}
                  </span>
                  <span className={`w-4 text-center select-none shrink-0 ${
                    line.type === "added" ? "text-emerald-300" : ""
                  }`}>
                    {line.type === "added" ? "+" : " "}
                  </span>
                  <span className={`flex-1 px-2 whitespace-pre overflow-x-auto ${
                    line.type === "added" ? "text-emerald-300" : "text-foreground/80"
                  }`}>{line.content || " "}</span>
                </div>
              ) : (
                <div className="h-5 bg-muted/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderInline = () => {
    let currentHunk = 0;
    return diffLines.map((line, idx) => {
      const isHunkStart = hunks[currentHunk]?.startLine === idx;
      if (isHunkStart) {
        const hIdx = currentHunk;
        currentHunk++;
        return (
          <div key={idx}>
            <div
              ref={(el) => { if (el) hunkRefs.current.set(hIdx, el); }}
              className={`flex items-center gap-2 px-3 py-1 border-y border-border/30 bg-muted/20 ${
                hIdx === currentHunkIndex ? "ring-1 ring-primary/30" : ""
              }`}
            >
              <span className="text-[10px] text-muted-foreground">
                Change {hIdx + 1} of {hunks.length}
              </span>
              <div className="flex items-center gap-0.5 ml-auto">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyHunk(hIdx)}>
                  {copiedHunk === hIdx ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                </Button>
                {onRevertHunk && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-orange-400 hover:text-orange-300"
                    onClick={() => handleRevertHunk(hIdx)}
                    title="Revert this change"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </div>
            {renderLineContent(line, hIdx)}
          </div>
        );
      }
      return <div key={idx}>{renderLineContent(line, null)}</div>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{fileName}</span>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
            +{stats.added}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/30">
            -{stats.removed}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5">
          {versions.length > 0 && onSelectVersion && (
            <>
              <VersionSelector
                versions={versions}
                currentId={originalVersion.id}
                side="original"
                onSelect={onSelectVersion}
              />
              <span className="text-[10px] text-muted-foreground mx-1">vs</span>
              <VersionSelector
                versions={versions}
                currentId={modifiedVersion.id}
                side="modified"
                onSelect={onSelectVersion}
              />
            </>
          )}
          <div className="w-px h-4 bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${viewMode === "side-by-side" ? "text-primary" : ""}`}
            onClick={() => setViewMode("side-by-side")}
            title="Side by side"
          >
            <Columns2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${viewMode === "inline" ? "text-primary" : ""}`}
            onClick={() => setViewMode("inline")}
            title="Inline"
          >
            <Rows2 className="w-3 h-3" />
          </Button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => navigateHunk("prev")}
            disabled={hunks.length === 0 || currentHunkIndex === 0}
            title="Previous change"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground min-w-[40px] text-center">
            {hunks.length > 0 ? `${currentHunkIndex + 1}/${hunks.length}` : "0/0"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => navigateHunk("next")}
            disabled={hunks.length === 0 || currentHunkIndex === hunks.length - 1}
            title="Next change"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
          {onClose && (
            <>
              <div className="w-px h-4 bg-border/50 mx-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        {diffLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Files are identical
          </div>
        ) : viewMode === "side-by-side" ? (
          renderSideBySide()
        ) : (
          renderInline()
        )}
      </div>
    </div>
  );
}

function VersionSelector({
  versions,
  currentId,
  side,
  onSelect,
}: {
  versions: FileVersion[];
  currentId: string;
  side: "original" | "modified";
  onSelect: (versionId: string, side: "original" | "modified") => void;
}) {
  const current = versions.find((v) => v.id === currentId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
          <Clock className="w-2.5 h-2.5" />
          {current?.label || "Select version"}
          <ChevronDown className="w-2.5 h-2.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-48 overflow-y-auto">
        {versions.map((v) => (
          <DropdownMenuItem
            key={v.id}
            onClick={() => onSelect(v.id, side)}
            className={v.id === currentId ? "bg-primary/10" : ""}
          >
            <div className="flex flex-col">
              <span className="text-xs">{v.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {v.timestamp.toLocaleString()}
                {v.author ? ` · ${v.author}` : ""}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
