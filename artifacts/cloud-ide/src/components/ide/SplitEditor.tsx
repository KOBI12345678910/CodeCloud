import { useState, useCallback, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Columns2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileData {
  id: string;
  name: string;
  content: string | null;
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescriptreact", mts: "typescript", cts: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    html: "html", htm: "html", css: "css", scss: "scss", less: "less",
    json: "json", yaml: "yaml", yml: "yaml", xml: "xml", md: "markdown",
    sql: "sql", sh: "shell", bash: "shell", zsh: "shell",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    toml: "ini", env: "ini", gitignore: "ini", dockerfile: "dockerfile",
    svelte: "html", vue: "html", astro: "html",
  };
  return map[ext] || "plaintext";
}

interface SplitPane {
  id: string;
  fileId: string | null;
}

interface SplitEditorProps {
  activeFile: FileData | null;
  files: FileData[];
  theme: string;
  editorOptions: Record<string, unknown>;
  onChange?: (value: string | undefined) => void;
  onMount?: (editor: any, monaco: any) => void;
  onSplitActiveFileChange?: (fileId: string) => void;
}

export default function SplitEditor({
  activeFile,
  files,
  theme,
  editorOptions,
  onChange,
  onMount,
  onSplitActiveFileChange,
}: SplitEditorProps) {
  const [split, setSplit] = useState(false);
  const [splitFileId, setSplitFileId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        if (!split && activeFile) {
          setSplit(true);
          setSplitFileId(activeFile.id);
        } else {
          setSplit(false);
          setSplitFileId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [split, activeFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(20, pct)));
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  const splitFile = splitFileId ? files.find((f) => f.id === splitFileId) : null;

  const handleSplitFileChange = (fileId: string) => {
    setSplitFileId(fileId);
    onSplitActiveFileChange?.(fileId);
  };

  const closeSplit = () => {
    setSplit(false);
    setSplitFileId(null);
  };

  if (!activeFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Code2 className="w-16 h-16 mb-4 opacity-15" />
        <p className="text-sm font-medium">Select a file to start editing</p>
        <p className="text-xs mt-1 opacity-60">Open a file from the sidebar</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex relative" data-testid="split-editor">
      <div style={{ width: split ? `${splitRatio}%` : "100%" }} className="h-full flex flex-col min-w-0">
        {split && (
          <div className="h-6 flex items-center justify-between px-2 bg-[hsl(222,47%,13%)] border-b border-border/20 shrink-0">
            <span className="text-[10px] text-muted-foreground truncate">{activeFile.name}</span>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={getLanguageFromFilename(activeFile.name)}
            value={activeFile.content || ""}
            onChange={onChange}
            onMount={onMount}
            theme={theme}
            options={editorOptions as any}
          />
        </div>
      </div>

      {split && (
        <>
          <div
            className={`w-[4px] cursor-col-resize relative z-10 shrink-0 ${
              isDragging ? "bg-primary" : "bg-border/30 hover:bg-primary/40"
            } transition-colors`}
            onMouseDown={handleMouseDown}
            data-testid="split-resize-handle"
          />

          <div style={{ width: `${100 - splitRatio}%` }} className="h-full flex flex-col min-w-0">
            <div className="h-6 flex items-center justify-between px-2 bg-[hsl(222,47%,13%)] border-b border-border/20 shrink-0">
              <select
                value={splitFileId || ""}
                onChange={(e) => handleSplitFileChange(e.target.value)}
                className="text-[10px] bg-transparent text-muted-foreground outline-none cursor-pointer truncate max-w-[200px]"
                data-testid="split-file-selector"
              >
                {files.filter((f) => f.content !== null && f.content !== undefined).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={closeSplit} data-testid="button-close-split">
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              {splitFile ? (
                <Editor
                  height="100%"
                  language={getLanguageFromFilename(splitFile.name)}
                  value={splitFile.content || ""}
                  theme={theme}
                  options={{ ...(editorOptions as any), readOnly: false }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                  Select a file for the split pane
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!split && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 z-20 opacity-0 hover:opacity-100 transition-opacity"
          onClick={() => {
            setSplit(true);
            setSplitFileId(activeFile.id);
          }}
          title="Split Editor (Ctrl+\)"
          data-testid="button-split-editor"
        >
          <Columns2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
