import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, Download, Trash2, Pause, Play, ArrowDownToLine,
  Filter, ChevronDown, AlertCircle, AlertTriangle, Info, Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type LogLevel = "info" | "warn" | "error" | "debug" | "stdout" | "stderr";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  source?: string;
}

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: "text-blue-400", bg: "", label: "Info" },
  warn: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/5", label: "Warning" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/5", label: "Error" },
  debug: { icon: Terminal, color: "text-gray-500", bg: "", label: "Debug" },
  stdout: { icon: Terminal, color: "text-emerald-400", bg: "", label: "Stdout" },
  stderr: { icon: AlertCircle, color: "text-red-300", bg: "bg-red-500/3", label: "Stderr" },
};

function parseLogLevel(line: string): LogLevel {
  const lower = line.toLowerCase();
  if (lower.includes("[error]") || lower.includes("error:") || lower.includes("err ")) return "error";
  if (lower.includes("[warn]") || lower.includes("warning:") || lower.includes("warn ")) return "warn";
  if (lower.includes("[debug]") || lower.includes("debug:")) return "debug";
  if (lower.includes("[info]") || lower.includes("info:")) return "info";
  return "stdout";
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

interface LogViewerProps {
  projectId: string;
  containerId?: string;
  maxLines?: number;
}

export default function LogViewer({ projectId, containerId, maxLines = 5000 }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set(["info", "warn", "error", "debug", "stdout", "stderr"])
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  const addLog = useCallback((message: string, level?: LogLevel, source?: string) => {
    const id = `log-${++logIdCounter.current}`;
    const entry: LogEntry = {
      id,
      level: level || parseLogLevel(message),
      message,
      timestamp: new Date(),
      source,
    };
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > maxLines ? next.slice(-maxLines) : next;
    });
  }, [maxLines]);

  useEffect(() => {
    addLog("Container log viewer initialized", "info", "system");
    addLog(`Watching project ${projectId}${containerId ? ` (container: ${containerId})` : ""}`, "info", "system");

    const interval = setInterval(() => {
      const sampleLogs = [
        { msg: `[info] Server listening on port 3000`, level: "info" as LogLevel },
        { msg: `[info] Request: GET /api/health - 200 (12ms)`, level: "info" as LogLevel },
        { msg: `[debug] Cache hit for key: user:session:abc123`, level: "debug" as LogLevel },
      ];
      const sample = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
      addLog(sample.msg, sample.level, "container");
    }, 15000);

    return () => clearInterval(interval);
  }, [projectId, containerId, addLog]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!atBottom && autoScroll) setAutoScroll(false);
  }, [autoScroll]);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const toggleLevel = useCallback((level: LogLevel) => {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logIdCounter.current = 0;
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!enabledLevels.has(log.level)) return false;
      if (searchQuery) {
        return log.message.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [logs, enabledLevels, searchQuery]);

  const downloadLogs = useCallback(() => {
    const content = filteredLogs
      .map((l) => `[${formatTimestamp(l.timestamp)}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `container-logs-${projectId}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, projectId]);

  const levelCounts = useMemo(() => {
    const counts: Record<LogLevel, number> = { info: 0, warn: 0, error: 0, debug: 0, stdout: 0, stderr: 0 };
    for (const log of logs) {
      counts[log.level]++;
    }
    return counts;
  }, [logs]);

  const highlightSearch = useCallback((text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Container Logs</span>
          <span className="text-[10px] text-muted-foreground">({logs.length} lines)</span>
        </div>
        <div className="flex items-center gap-0.5">
          {showSearch && (
            <div className="relative mr-1">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="h-6 w-40 pl-7 text-xs"
                autoFocus
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
            title="Search"
          >
            <Search className="w-3 h-3" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Filter by level">
                <Filter className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(LEVEL_CONFIG) as LogLevel[]).map((level) => (
                <DropdownMenuCheckboxItem
                  key={level}
                  checked={enabledLevels.has(level)}
                  onCheckedChange={() => toggleLevel(level)}
                >
                  <span className={`flex items-center gap-2 ${LEVEL_CONFIG[level].color}`}>
                    {LEVEL_CONFIG[level].label}
                    <span className="text-[10px] text-muted-foreground ml-auto">{levelCounts[level]}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadLogs} title="Download logs">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearLogs} title="Clear logs">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${autoScroll ? "text-primary" : ""}`}
            onClick={() => autoScroll ? setAutoScroll(false) : scrollToBottom()}
            title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/30 bg-muted/10 shrink-0">
        {(Object.entries(levelCounts) as [LogLevel, number][])
          .filter(([, count]) => count > 0)
          .map(([level, count]) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-opacity ${
                enabledLevels.has(level) ? "opacity-100" : "opacity-40"
              } ${LEVEL_CONFIG[level].color}`}
            >
              {LEVEL_CONFIG[level].label}: {count}
            </button>
          ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-xs leading-5 min-h-0"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {logs.length === 0 ? "No logs yet" : "No matching logs"}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const config = LEVEL_CONFIG[log.level];
            const Icon = config.icon;
            return (
              <div
                key={log.id}
                className={`flex items-start gap-1.5 px-3 py-0.5 hover:bg-muted/30 ${config.bg}`}
              >
                <span className="text-muted-foreground/60 shrink-0 select-none w-[85px]">
                  {formatTimestamp(log.timestamp)}
                </span>
                <Icon className={`w-3 h-3 mt-1 shrink-0 ${config.color}`} />
                <span className={`flex-1 break-all ${config.color}`}>
                  {highlightSearch(log.message)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {!autoScroll && filteredLogs.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 right-4 flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs shadow-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowDownToLine className="w-3 h-3" />
          New logs
        </button>
      )}
    </div>
  );
}
