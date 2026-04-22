import React, { useState } from "react";
import {
  ArrowUpDown, FolderOpen, FileText, Eye, EyeOff, ChevronDown,
  ChevronRight, SortAsc, SortDesc, X, Grip
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SortMode = "name" | "type" | "size" | "modified" | "custom";
type SortDirection = "asc" | "desc";

interface FileTreeSortingProps {
  onClose?: () => void;
  onSortChange?: (mode: SortMode, direction: SortDirection) => void;
}

interface SortPreset {
  id: string;
  label: string;
  mode: SortMode;
  direction: SortDirection;
  description: string;
}

const PRESETS: SortPreset[] = [
  { id: "name-asc", label: "Name (A-Z)", mode: "name", direction: "asc", description: "Alphabetical order" },
  { id: "name-desc", label: "Name (Z-A)", mode: "name", direction: "desc", description: "Reverse alphabetical" },
  { id: "type-asc", label: "Type", mode: "type", direction: "asc", description: "Group by file extension" },
  { id: "size-desc", label: "Size (largest)", mode: "size", direction: "desc", description: "Largest files first" },
  { id: "size-asc", label: "Size (smallest)", mode: "size", direction: "asc", description: "Smallest files first" },
  { id: "modified-desc", label: "Recently modified", mode: "modified", direction: "desc", description: "Most recent first" },
  { id: "modified-asc", label: "Oldest first", mode: "modified", direction: "asc", description: "Oldest modifications first" },
  { id: "custom", label: "Custom order", mode: "custom", direction: "asc", description: "Drag to reorder" },
];

export default function FileTreeSorting({ onClose, onSortChange }: FileTreeSortingProps): React.ReactElement {
  const [activeSort, setActiveSort] = useState<string>("name-asc");
  const [foldersFirst, setFoldersFirst] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "type" | "folder">("none");

  const handleSort = (preset: SortPreset) => {
    setActiveSort(preset.id);
    onSortChange?.(preset.mode, preset.direction);
  };

  return (
    <div className="w-64 rounded-lg border border-border bg-popover shadow-lg text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold">Sort & Filter</span>
        </div>
        {onClose && <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
      </div>

      <div className="p-2 space-y-0.5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Sort By</div>
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handleSort(preset)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
              activeSort === preset.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            }`}
          >
            {preset.direction === "asc" ? <SortAsc size={12} /> : preset.mode === "custom" ? <Grip size={12} /> : <SortDesc size={12} />}
            <span className="flex-1 text-left">{preset.label}</span>
            {activeSort === preset.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      <div className="border-t border-border/30 p-2 space-y-1">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Options</div>
        <button onClick={() => setFoldersFirst(!foldersFirst)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50">
          <FolderOpen size={12} className={foldersFirst ? "text-primary" : "text-muted-foreground"} />
          <span className="flex-1 text-left">Folders first</span>
          <span className={`w-3 h-3 rounded border ${foldersFirst ? "bg-primary border-primary" : "border-muted-foreground"}`} />
        </button>
        <button onClick={() => setShowHidden(!showHidden)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/50">
          {showHidden ? <Eye size={12} className="text-primary" /> : <EyeOff size={12} className="text-muted-foreground" />}
          <span className="flex-1 text-left">Show hidden files</span>
          <span className={`w-3 h-3 rounded border ${showHidden ? "bg-primary border-primary" : "border-muted-foreground"}`} />
        </button>
      </div>

      <div className="border-t border-border/30 p-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Group By</div>
        <div className="flex gap-1 px-2">
          {(["none", "type", "folder"] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${groupBy === g ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
              {g === "none" ? "None" : g === "type" ? "Type" : "Folder"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
