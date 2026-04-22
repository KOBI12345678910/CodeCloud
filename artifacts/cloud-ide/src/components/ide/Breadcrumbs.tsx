import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronRight, Folder, File } from "lucide-react";

interface FileNode {
  id: string;
  projectId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  content?: string | null;
  sizeBytes: number;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BreadcrumbsProps {
  activeFile: FileNode | null;
  files: FileNode[];
  onSelectFile: (file: FileNode) => void;
}

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    ts: "text-blue-400",
    tsx: "text-blue-400",
    py: "text-green-400",
    html: "text-orange-400",
    css: "text-cyan-400",
    json: "text-yellow-300",
    md: "text-gray-400",
    go: "text-cyan-300",
  };
  return colors[ext] || "text-gray-400";
}

function DropdownItem({
  file,
  onSelect,
  onClose,
}: {
  file: FileNode;
  onSelect: (file: FileNode) => void;
  onClose: () => void;
}) {
  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
        file.isDirectory ? "text-muted-foreground cursor-default" : "hover:bg-muted/50"
      }`}
      onClick={() => {
        if (!file.isDirectory) {
          onSelect(file);
          onClose();
        }
      }}
      data-testid={`breadcrumb-dropdown-item-${file.name}`}
    >
      {file.isDirectory ? (
        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      ) : (
        <File className={`w-3.5 h-3.5 ${getFileIconColor(file.name)} shrink-0`} />
      )}
      <span className="truncate">{file.name}</span>
    </button>
  );
}

function BreadcrumbSegment({
  label,
  segmentPath,
  files,
  onSelectFile,
  isLast,
}: {
  label: string;
  segmentPath: string;
  files: FileNode[];
  onSelectFile: (file: FileNode) => void;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const children = useMemo(() => {
    return files
      .filter((f) => {
        if (segmentPath === "") {
          return !f.path.includes("/");
        }
        const prefix = segmentPath + "/";
        if (!f.path.startsWith(prefix)) return false;
        const rest = f.path.slice(prefix.length);
        return !rest.includes("/");
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [files, segmentPath]);

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        className={`px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-muted/50 ${
          isLast ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setOpen(!open)}
        data-testid={`breadcrumb-segment-${label}`}
      >
        {label}
      </button>
      {open && children.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-h-[300px] overflow-y-auto rounded-md border border-border/50 bg-popover shadow-lg py-1"
          data-testid="breadcrumb-dropdown"
        >
          {children.map((file) => (
            <DropdownItem
              key={file.id}
              file={file}
              onSelect={onSelectFile}
              onClose={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Breadcrumbs({ activeFile, files, onSelectFile }: BreadcrumbsProps) {
  if (!activeFile) return null;

  const pathParts = activeFile.path.split("/");

  const segments: { label: string; path: string }[] = [];

  segments.push({ label: "root", path: "" });

  for (let i = 0; i < pathParts.length; i++) {
    const segPath = pathParts.slice(0, i + 1).join("/");
    segments.push({ label: pathParts[i], path: segPath });
  }

  return (
    <div
      className="h-7 flex items-center gap-0.5 px-3 border-b border-border/20 bg-card/20 shrink-0 overflow-x-auto"
      data-testid="breadcrumb-bar"
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const isRoot = i === 0;
        const parentPath = isRoot ? "" : pathParts.slice(0, i).join("/");
        return (
          <div key={i} className="flex items-center shrink-0">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5 shrink-0" />
            )}
            <BreadcrumbSegment
              label={seg.label}
              segmentPath={isRoot ? "" : parentPath}
              files={files}
              onSelectFile={onSelectFile}
              isLast={isLast}
            />
          </div>
        );
      })}
    </div>
  );
}
