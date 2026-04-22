import React, { useState, useMemo } from "react";
import { Search, X, File, Folder, Filter, ChevronRight } from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileTreeSearchProps {
  files?: FileItem[];
  onSelectFile?: (file: FileItem) => void;
  onClose?: () => void;
}

export default function FileTreeSearch({ files = [], onSelectFile, onClose }: FileTreeSearchProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState<"name" | "extension" | "path">("name");
  const [showDirs, setShowDirs] = useState(true);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return files.filter(f => {
      if (!showDirs && f.isDirectory) return false;
      if (searchBy === "name") return f.name.toLowerCase().includes(q);
      if (searchBy === "extension") {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return ext.includes(q);
      }
      return f.path.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [query, files, searchBy, showDirs]);

  const getIcon = (file: FileItem) => {
    if (file.isDirectory) return <Folder size={12} className="text-blue-400" />;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const colors: Record<string, string> = { ts: "text-blue-400", tsx: "text-blue-400", js: "text-yellow-400", jsx: "text-yellow-400", py: "text-green-400", css: "text-cyan-400", html: "text-orange-400" };
    return <File size={12} className={colors[ext] || "text-gray-400"} />;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#333]">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
          className="flex-1 bg-transparent text-xs outline-none placeholder-gray-600" placeholder="Search files..." />
        <div className="flex items-center gap-1">
          {(["name", "extension", "path"] as const).map(s => (
            <button key={s} onClick={() => setSearchBy(s)}
              className={`px-1.5 py-0.5 rounded text-[9px] ${searchBy === s ? "bg-primary/20 text-primary" : "text-gray-600 hover:text-gray-400"}`}>
              {s}
            </button>
          ))}
        </div>
        {onClose && <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X size={12} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.trim() === "" ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-600">
            Type to search files...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-600">
            No matches found
          </div>
        ) : (
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-gray-600">{filtered.length} results</div>
            {filtered.map(file => (
              <button key={file.id} onClick={() => onSelectFile?.(file)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2d2e] text-left">
                {getIcon(file)}
                <span className="text-xs text-gray-300 truncate">{file.name}</span>
                <span className="text-[10px] text-gray-600 truncate ml-auto">{file.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
