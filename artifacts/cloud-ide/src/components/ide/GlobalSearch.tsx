import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Replace,
  ChevronDown,
  ChevronRight,
  File,
  AlertCircle,
  Check,
  CaseSensitive,
  Regex,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileData {
  id: string;
  name: string;
  path: string;
  content?: string | null;
  isDirectory?: boolean;
}

interface SearchMatch {
  fileId: string;
  fileName: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface GroupedResults {
  fileId: string;
  fileName: string;
  filePath: string;
  matches: SearchMatch[];
}

interface GlobalSearchProps {
  files: FileData[];
  onNavigate: (fileId: string, lineNumber: number) => void;
  onReplace: (fileId: string, content: string) => void;
  onClose: () => void;
}

export default function GlobalSearch({
  files,
  onNavigate,
  onReplace,
  onClose,
}: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fileFilter, setFileFilter] = useState("");
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [replacedFiles, setReplacedFiles] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const searchResults = useMemo((): GroupedResults[] => {
    if (!searchQuery.trim()) return [];

    const nonDirFiles = files.filter((f) => !f.isDirectory && f.content);

    let filteredFiles = nonDirFiles;
    if (fileFilter.trim()) {
      const filters = fileFilter
        .split(",")
        .map((f) => f.trim().toLowerCase())
        .filter(Boolean);
      filteredFiles = nonDirFiles.filter((f) =>
        filters.some((filter) => {
          if (filter.startsWith("*."))
            return f.name.toLowerCase().endsWith(filter.slice(1));
          if (filter.startsWith("."))
            return f.name.toLowerCase().endsWith(filter);
          return f.name.toLowerCase().includes(filter);
        })
      );
    }

    const grouped: GroupedResults[] = [];

    for (const file of filteredFiles) {
      const lines = (file.content || "").split("\n");
      const matches: SearchMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let regex: RegExp;

        try {
          if (useRegex) {
            regex = new RegExp(
              searchQuery,
              caseSensitive ? "g" : "gi"
            );
          } else {
            const escaped = searchQuery.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
            regex = new RegExp(escaped, caseSensitive ? "g" : "gi");
          }
        } catch {
          return [];
        }

        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            lineNumber: i + 1,
            lineContent: line,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });
          if (match[0].length === 0) break;
        }
      }

      if (matches.length > 0) {
        grouped.push({
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          matches,
        });
      }
    }

    return grouped;
  }, [searchQuery, files, useRegex, caseSensitive, fileFilter]);

  const totalMatches = useMemo(
    () => searchResults.reduce((sum, g) => sum + g.matches.length, 0),
    [searchResults]
  );

  const toggleCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleReplaceInFile = useCallback(
    (group: GroupedResults) => {
      const file = files.find((f) => f.id === group.fileId);
      if (!file || !file.content) return;

      let regex: RegExp;
      try {
        if (useRegex) {
          regex = new RegExp(searchQuery, caseSensitive ? "g" : "gi");
        } else {
          const escaped = searchQuery.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          regex = new RegExp(escaped, caseSensitive ? "g" : "gi");
        }
      } catch {
        return;
      }

      const newContent = file.content.replace(regex, replaceQuery);
      onReplace(group.fileId, newContent);
      setReplacedFiles((prev) => new Set(prev).add(group.fileId));
    },
    [files, searchQuery, replaceQuery, useRegex, caseSensitive, onReplace]
  );

  const handleReplaceAll = useCallback(() => {
    for (const group of searchResults) {
      handleReplaceInFile(group);
    }
  }, [searchResults, handleReplaceInFile]);

  const highlightMatch = (match: SearchMatch) => {
    const before = match.lineContent.slice(0, match.matchStart);
    const matched = match.lineContent.slice(
      match.matchStart,
      match.matchEnd
    );
    const after = match.lineContent.slice(match.matchEnd);

    return (
      <span className="font-mono text-[11px]">
        <span className="text-muted-foreground">{before}</span>
        <span className="bg-yellow-500/30 text-yellow-200 font-semibold rounded-sm px-0.5">
          {matched}
        </span>
        <span className="text-muted-foreground">{after}</span>
      </span>
    );
  };

  return (
    <div
      className="h-full flex flex-col bg-card border-r border-border/50"
      data-testid="global-search-panel"
    >
      <div className="p-2 border-b border-border/30 space-y-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => setShowReplace(!showReplace)}
          >
            {showReplace ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
          <div className="flex-1 relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setReplacedFiles(new Set());
              }}
              placeholder="Search across files..."
              className="w-full bg-muted/30 border border-border/50 rounded pl-7 pr-14 py-1 text-xs outline-none focus:border-primary/50"
              data-testid="input-global-search"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`p-0.5 rounded ${caseSensitive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Case Sensitive"
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setUseRegex(!useRegex)}
                className={`p-0.5 rounded ${useRegex ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Use Regex"
              >
                <Regex className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1 pl-6">
            <div className="flex-1 relative">
              <Replace className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace..."
                className="w-full bg-muted/30 border border-border/50 rounded pl-7 pr-2 py-1 text-xs outline-none focus:border-primary/50"
                data-testid="input-global-replace"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={handleReplaceAll}
              title="Replace All"
              disabled={!searchQuery.trim() || totalMatches === 0}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="pl-6">
          <input
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            placeholder="File filter (e.g. *.ts, *.css)"
            className="w-full bg-muted/30 border border-border/50 rounded px-2 py-1 text-[10px] outline-none focus:border-primary/50 text-muted-foreground"
            data-testid="input-file-filter"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border/20">
            {totalMatches} result{totalMatches !== 1 ? "s" : ""} in{" "}
            {searchResults.length} file{searchResults.length !== 1 ? "s" : ""}
          </div>
        )}

        {searchResults.map((group) => (
          <div key={group.fileId} className="border-b border-border/10">
            <button
              className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-muted/30 text-left"
              onClick={() => toggleCollapse(group.fileId)}
            >
              {collapsedFiles.has(group.fileId) ? (
                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
              )}
              <File className="w-3 h-3 shrink-0 text-primary/70" />
              <span className="text-xs font-medium truncate flex-1">
                {group.fileName}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-1.5">
                {group.matches.length}
              </span>
              {showReplace && (
                <button
                  className="text-[10px] text-primary hover:underline ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReplaceInFile(group);
                  }}
                >
                  {replacedFiles.has(group.fileId) ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Replace className="w-3 h-3" />
                  )}
                </button>
              )}
            </button>

            {!collapsedFiles.has(group.fileId) && (
              <div className="pl-4">
                {group.matches.slice(0, 100).map((match, i) => (
                  <button
                    key={`${match.lineNumber}-${match.matchStart}-${i}`}
                    className="w-full flex items-start gap-2 px-2 py-0.5 hover:bg-muted/20 text-left cursor-pointer"
                    onClick={() =>
                      onNavigate(match.fileId, match.lineNumber)
                    }
                    data-testid={`search-result-${group.fileName}-${match.lineNumber}`}
                  >
                    <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0 mt-px">
                      {match.lineNumber}
                    </span>
                    <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {highlightMatch(match)}
                    </div>
                  </button>
                ))}
                {group.matches.length > 100 && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground italic">
                    ...and {group.matches.length - 100} more matches
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {searchQuery.trim() && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
