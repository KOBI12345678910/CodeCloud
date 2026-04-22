import React, { useState, useCallback } from "react";
import {
  Search, X, ChevronDown, ChevronRight, FileText, Replace,
  ToggleLeft, ToggleRight, History, Filter, ArrowDown, ArrowUp
} from "lucide-react";

interface SearchResult {
  file: string;
  line: number;
  column: number;
  preview: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchHistoryEntry {
  query: string;
  timestamp: Date;
  resultCount: number;
}

interface WorkspaceSearchProps {
  onClose?: () => void;
  onNavigate?: (file: string, line: number) => void;
}

const SAMPLE_RESULTS: SearchResult[] = [
  { file: "src/index.ts", line: 1, column: 8, preview: 'import express from "express";', matchStart: 7, matchEnd: 14 },
  { file: "src/index.ts", line: 12, column: 11, preview: "const app = express();", matchStart: 12, matchEnd: 19 },
  { file: "src/routes/auth.ts", line: 3, column: 22, preview: 'import { Router } from "express";', matchStart: 23, matchEnd: 30 },
  { file: "src/middleware/cors.ts", line: 5, column: 8, preview: 'import cors from "cors";', matchStart: 7, matchEnd: 11 },
  { file: "src/services/db.ts", line: 8, column: 15, preview: "  const pool = new Pool(config);", matchStart: 14, matchEnd: 18 },
  { file: "README.md", line: 22, column: 5, preview: "    npm run dev", matchStart: 4, matchEnd: 7 },
];

export default function WorkspaceSearch({ onClose, onNavigate }: WorkspaceSearchProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [searchInFileNames, setSearchInFileNames] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<SearchHistoryEntry[]>([
    { query: "express", timestamp: new Date(Date.now() - 3600000), resultCount: 12 },
    { query: "TODO", timestamp: new Date(Date.now() - 7200000), resultCount: 5 },
    { query: "async function", timestamp: new Date(Date.now() - 86400000), resultCount: 28 },
  ]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [includePattern, setIncludePattern] = useState("");
  const [excludePattern, setExcludePattern] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const doSearch = useCallback(() => {
    if (!query.trim()) { setResults([]); return; }
    const filtered = SAMPLE_RESULTS.filter(r => {
      const target = searchInFileNames ? r.file : r.preview;
      if (caseSensitive) return target.includes(query);
      return target.toLowerCase().includes(query.toLowerCase());
    });
    setResults(filtered);
    setCurrentMatch(0);
    setExpandedFiles(new Set(filtered.map(r => r.file)));
    setHistory(prev => [{ query, timestamp: new Date(), resultCount: filtered.length }, ...prev.slice(0, 19)]);
  }, [query, caseSensitive, searchInFileNames]);

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.file] = acc[r.file] || []).push(r);
    return acc;
  }, {});

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file); else next.add(file);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Search</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowHistory(!showHistory)} className={`p-1 rounded ${showHistory ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`} title="History">
            <History size={12} />
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-1 rounded ${showFilters ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`} title="Filters">
            <Filter size={12} />
          </button>
          {onClose && <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      <div className="px-3 py-2 space-y-2 border-b border-[#333]">
        <div className="flex items-center gap-1">
          <button onClick={() => setShowReplace(!showReplace)} className="p-0.5 text-gray-500 hover:text-gray-300">
            {showReplace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <div className="flex-1 flex items-center bg-[#3c3c3c] rounded border border-[#555] focus-within:border-blue-500">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder={searchInFileNames ? "Search file names..." : "Search in files..."}
              className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
            />
            <button onClick={() => setCaseSensitive(!caseSensitive)} className={`px-1 text-[10px] font-bold ${caseSensitive ? "text-blue-400" : "text-gray-500"}`} title="Case sensitive">Aa</button>
            <button onClick={() => setWholeWord(!wholeWord)} className={`px-1 text-[10px] font-bold ${wholeWord ? "text-blue-400" : "text-gray-500"}`} title="Whole word">Ab</button>
            <button onClick={() => setUseRegex(!useRegex)} className={`px-1 text-[10px] font-mono ${useRegex ? "text-blue-400" : "text-gray-500"}`} title="Regex">.*</button>
          </div>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1 pl-5">
            <div className="flex-1 flex items-center bg-[#3c3c3c] rounded border border-[#555] focus-within:border-blue-500">
              <input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                placeholder="Replace..."
                className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
              />
            </div>
            <button className="px-1.5 py-1 rounded text-[10px] bg-[#333] text-gray-400 hover:bg-[#444]" title="Replace">
              <Replace size={10} />
            </button>
            <button className="px-1.5 py-1 rounded text-[10px] bg-[#333] text-gray-400 hover:bg-[#444]" title="Replace All">All</button>
          </div>
        )}

        <div className="flex items-center gap-2 pl-5">
          <button onClick={() => setSearchInFileNames(!searchInFileNames)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${searchInFileNames ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
            <FileText size={10} /> File names
          </button>
          {results.length > 0 && (
            <span className="text-[10px] text-gray-500 ml-auto">{results.length} results in {Object.keys(groupedResults).length} files</span>
          )}
        </div>

        {showFilters && (
          <div className="space-y-1 pl-5">
            <input type="text" value={includePattern} onChange={e => setIncludePattern(e.target.value)} placeholder="Files to include (e.g. *.ts)" className="w-full bg-[#3c3c3c] rounded border border-[#555] px-2 py-1 text-xs outline-none" />
            <input type="text" value={excludePattern} onChange={e => setExcludePattern(e.target.value)} placeholder="Files to exclude (e.g. node_modules)" className="w-full bg-[#3c3c3c] rounded border border-[#555] px-2 py-1 text-xs outline-none" />
          </div>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className="border-b border-[#333] max-h-32 overflow-y-auto">
          {history.map((h, i) => (
            <button key={i} onClick={() => { setQuery(h.query); setShowHistory(false); }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#2a2d2e]">
              <span className="text-gray-300">{h.query}</span>
              <span className="text-gray-600">{h.resultCount} results</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query && (
          <div className="px-3 py-4 text-center text-xs text-gray-500">No results found</div>
        )}
        {Object.entries(groupedResults).map(([file, fileResults]) => (
          <div key={file}>
            <button onClick={() => toggleFile(file)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-[#2a2d2e] group">
              {expandedFiles.has(file) ? <ChevronDown size={10} className="text-gray-500" /> : <ChevronRight size={10} className="text-gray-500" />}
              <FileText size={12} className="text-gray-400" />
              <span className="text-gray-300 truncate">{file}</span>
              <span className="ml-auto text-[10px] text-gray-600 bg-[#333] px-1.5 rounded">{fileResults.length}</span>
            </button>
            {expandedFiles.has(file) && fileResults.map((r, i) => (
              <button key={i} onClick={() => onNavigate?.(r.file, r.line)}
                className="w-full flex items-center gap-2 px-6 py-1 text-xs hover:bg-[#2a2d2e] font-mono">
                <span className="text-gray-600 w-8 text-right shrink-0">{r.line}</span>
                <span className="truncate">
                  {r.preview.slice(0, r.matchStart)}
                  <span className="bg-yellow-500/30 text-yellow-300">{r.preview.slice(r.matchStart, r.matchEnd)}</span>
                  {r.preview.slice(r.matchEnd)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-[#333] text-[10px] text-gray-500">
          <span>{currentMatch + 1} of {results.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMatch(Math.max(0, currentMatch - 1))} className="p-0.5 hover:text-gray-300"><ArrowUp size={10} /></button>
            <button onClick={() => setCurrentMatch(Math.min(results.length - 1, currentMatch + 1))} className="p-0.5 hover:text-gray-300"><ArrowDown size={10} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
