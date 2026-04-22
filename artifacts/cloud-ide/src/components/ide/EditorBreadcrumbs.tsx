import { ChevronRight, File, Folder } from "lucide-react";

interface Props {
  filePath: string;
  onNavigate?: (path: string) => void;
}

export function EditorBreadcrumbs({ filePath, onNavigate }: Props) {
  if (!filePath) return null;

  const segments = filePath.split("/").filter(Boolean);
  const fileName = segments.pop() || "";

  return (
    <div className="flex items-center gap-0.5 px-2 py-0.5 bg-card/30 border-b border-border/30 overflow-x-auto text-[10px]" data-testid="editor-breadcrumbs">
      {segments.map((seg, i) => {
        const pathToHere = segments.slice(0, i + 1).join("/");
        return (
          <div key={i} className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => onNavigate?.(pathToHere)} className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted/50">
              <Folder className="w-2.5 h-2.5" />{seg}
            </button>
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />
          </div>
        );
      })}
      <span className="flex items-center gap-0.5 text-foreground font-medium px-1 py-0.5 shrink-0">
        <File className="w-2.5 h-2.5" />{fileName}
      </span>
    </div>
  );
}
