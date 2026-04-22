import { useState } from "react";
import { X, Search, Replace, FileText, ChevronDown, ChevronRight } from "lucide-react";

interface SearchResult { filePath: string; line: number; content: string; matchStart: number; matchEnd: number; }
interface Props { projectId: string; files: any[]; onClose: () => void; onNavigate?: (filePath: string, line: number) => void; }

export function RegexSearch({ projectId, files, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fileFilter, setFileFilter] = useState("");
  const [excludePattern, setExcludePattern] = useState("node_modules,dist,.git");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const search = () => {
    if (!query) { setResults([]); return; }
    const matches: SearchResult[] = [];
    const excludes = excludePattern.split(",").map(e => e.trim());
    const filterExts = fileFilter ? fileFilter.split(",").map(e => e.trim()) : [];

    for (const file of files || []) {
      if (file.isDirectory || !file.content) continue;
      if (excludes.some(e => file.path.includes(e))) continue;
      if (filterExts.length > 0 && !filterExts.some(ext => file.name.endsWith(ext))) continue;

      const lines = file.content.split("\n");
      try {
        const flags = caseSensitive ? "g" : "gi";
        const pattern = useRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
        lines.forEach((line: string, i: number) => {
          const match = pattern.exec(line);
          if (match) matches.push({ filePath: file.path, line: i + 1, content: line.trim(), matchStart: match.index, matchEnd: match.index + match[0].length });
          pattern.lastIndex = 0;
        });
      } catch {}
    }
    setResults(matches);
    setExpandedFiles(new Set(matches.map(m => m.filePath)));
  };

  const groupedResults: Record<string, SearchResult[]> = {};
  results.forEach(r => { (groupedResults[r.filePath] ??= []).push(r); });

  const toggleFile = (path: string) => { setExpandedFiles(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; }); };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="regex-search">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Search className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Search</span><span className="text-[10px] text-muted-foreground">{results.length} results</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="px-3 py-1.5 border-b border-border/30 space-y-1 shrink-0">
        <div className="flex items-center gap-1">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="Search..." />
          <button onClick={() => setUseRegex(!useRegex)} className={`px-1.5 py-1 text-[10px] rounded border ${useRegex ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>.*</button>
          <button onClick={() => setCaseSensitive(!caseSensitive)} className={`px-1.5 py-1 text-[10px] rounded border ${caseSensitive ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>Aa</button>
          <button onClick={() => setShowReplace(!showReplace)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Replace className="w-3 h-3" /></button>
        </div>
        {showReplace && <input value={replacement} onChange={e => setReplacement(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="Replace with..." />}
        <div className="flex items-center gap-1">
          <input value={fileFilter} onChange={e => setFileFilter(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-[10px]" placeholder="File types: .ts,.tsx" />
          <input value={excludePattern} onChange={e => setExcludePattern(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-[10px]" placeholder="Exclude: node_modules" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedResults).map(([path, matches]) => (
          <div key={path}>
            <button onClick={() => toggleFile(path)} className="flex items-center gap-1 w-full px-3 py-1 hover:bg-muted/30 text-xs text-muted-foreground">
              {expandedFiles.has(path) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <FileText className="w-3 h-3" /><span className="font-mono">{path}</span><span className="text-[10px]">({matches.length})</span>
            </button>
            {expandedFiles.has(path) && matches.map((m, i) => (
              <button key={i} onClick={() => onNavigate?.(m.filePath, m.line)} className="flex items-start gap-2 w-full pl-8 pr-3 py-0.5 hover:bg-muted/30 text-[11px] text-left">
                <span className="text-muted-foreground w-8 text-right shrink-0 font-mono">{m.line}</span>
                <span className="font-mono truncate">{m.content}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
