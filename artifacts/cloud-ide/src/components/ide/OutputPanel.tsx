import { useState, useEffect, useRef, useCallback } from "react";
import {
  Trash2, ArrowDownToLine, Pause, Play, Filter,
  ChevronDown, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OutputType = "log" | "warn" | "error" | "info" | "debug" | "system";

export interface OutputEntry {
  id: string;
  type: OutputType;
  message: string;
  timestamp: number;
  source?: string;
  count?: number;
}

const TYPE_CONFIG: Record<OutputType, { color: string; bg: string; label: string; dot: string }> = {
  log: { color: "text-foreground/90", bg: "", label: "Log", dot: "text-gray-400" },
  warn: { color: "text-yellow-300", bg: "bg-yellow-500/5", label: "Warn", dot: "text-yellow-400" },
  error: { color: "text-red-300", bg: "bg-red-500/5", label: "Error", dot: "text-red-400" },
  info: { color: "text-blue-300", bg: "", label: "Info", dot: "text-blue-400" },
  debug: { color: "text-muted-foreground", bg: "", label: "Debug", dot: "text-gray-500" },
  system: { color: "text-purple-300", bg: "bg-purple-500/5", label: "System", dot: "text-purple-400" },
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    + "." + String(d.getMilliseconds()).padStart(3, "0");
}

const DEMO_ENTRIES: OutputEntry[] = [
  { id: "1", type: "system", message: "Process started", timestamp: Date.now() - 5000 },
  { id: "2", type: "log", message: "Server listening on port 3000", timestamp: Date.now() - 4500 },
  { id: "3", type: "info", message: "Database connected successfully", timestamp: Date.now() - 4000, source: "db.ts" },
  { id: "4", type: "log", message: "Loading configuration from .env", timestamp: Date.now() - 3500 },
  { id: "5", type: "warn", message: "API_KEY not set, using default value", timestamp: Date.now() - 3000, source: "config.ts" },
  { id: "6", type: "log", message: '{ users: 42, sessions: 18, uptime: "2h 15m" }', timestamp: Date.now() - 2000 },
  { id: "7", type: "error", message: "TypeError: Cannot read properties of undefined (reading 'map')", timestamp: Date.now() - 1500, source: "routes/api.ts:24" },
  { id: "8", type: "error", message: "    at processRequest (/app/routes/api.ts:24:15)", timestamp: Date.now() - 1499 },
  { id: "9", type: "debug", message: "Cache hit ratio: 87.3%", timestamp: Date.now() - 1000 },
  { id: "10", type: "log", message: "Request completed in 42ms", timestamp: Date.now() - 500, source: "middleware.ts" },
];

interface OutputPanelProps {
  entries?: OutputEntry[];
  onClear?: () => void;
}

export default function OutputPanel({ entries: externalEntries, onClear }: OutputPanelProps) {
  const [entries, setEntries] = useState<OutputEntry[]>(externalEntries || DEMO_ENTRIES);
  const [autoScroll, setAutoScroll] = useState(true);
  const [paused, setPaused] = useState(false);
  const [filterTypes, setFilterTypes] = useState<Set<OutputType>>(
    new Set(["log", "warn", "error", "info", "debug", "system"])
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalEntries) setEntries(externalEntries);
  }, [externalEntries]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(atBottom);
  }, []);

  const handleClear = () => {
    setEntries([]);
    onClear?.();
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  const toggleType = (type: OutputType) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const filtered = paused ? [] : entries.filter((e) => filterTypes.has(e.type));

  const counts: Record<OutputType, number> = {
    log: entries.filter((e) => e.type === "log").length,
    warn: entries.filter((e) => e.type === "warn").length,
    error: entries.filter((e) => e.type === "error").length,
    info: entries.filter((e) => e.type === "info").length,
    debug: entries.filter((e) => e.type === "debug").length,
    system: entries.filter((e) => e.type === "system").length,
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="output-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Output</span>
          <div className="flex items-center gap-2 text-[10px]">
            {counts.error > 0 && (
              <span className="text-red-400" data-testid="error-count">{counts.error} errors</span>
            )}
            {counts.warn > 0 && (
              <span className="text-yellow-400" data-testid="warn-count">{counts.warn} warnings</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-filter">
                <Filter className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(TYPE_CONFIG) as OutputType[]).map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.has(type)}
                  onCheckedChange={() => toggleType(type)}
                >
                  <span className={`flex items-center gap-2 ${TYPE_CONFIG[type].color}`}>
                    <Circle className={`w-2 h-2 fill-current ${TYPE_CONFIG[type].dot}`} />
                    {TYPE_CONFIG[type].label} ({counts[type]})
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setPaused(!paused)}
            data-testid="button-pause"
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={scrollToBottom}
            data-testid="button-scroll-bottom"
          >
            <ArrowDownToLine className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear} data-testid="button-clear">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs"
        onScroll={handleScroll}
        data-testid="output-entries"
      >
        {paused && (
          <div className="px-3 py-2 bg-yellow-500/10 text-yellow-400 text-[10px] text-center border-b border-yellow-500/20">
            Output paused — {entries.length} entries buffered
          </div>
        )}

        {filtered.length === 0 && !paused ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 py-8">
            <span className="text-xs">No output</span>
          </div>
        ) : (
          filtered.map((entry) => {
            const config = TYPE_CONFIG[entry.type];
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-3 py-0.5 hover:bg-white/[0.02] ${config.bg}`}
                data-testid={`entry-${entry.type}-${entry.id}`}
              >
                <span className="text-muted-foreground/40 shrink-0 select-none tabular-nums w-[85px]">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <Circle className={`w-1.5 h-1.5 mt-1.5 shrink-0 fill-current ${config.dot}`} />
                <span className={`flex-1 whitespace-pre-wrap break-all ${config.color}`}>
                  {entry.message}
                </span>
                {entry.source && (
                  <span className="text-muted-foreground/30 shrink-0 text-[10px]">{entry.source}</span>
                )}
                {entry.count && entry.count > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground shrink-0">
                    {entry.count}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-1 border-t border-border/30 bg-[hsl(222,47%,13%)] text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span>{entries.length} entries</span>
        <span className={autoScroll ? "text-green-400" : "text-muted-foreground/50"}>
          {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
        </span>
      </div>
    </div>
  );
}
