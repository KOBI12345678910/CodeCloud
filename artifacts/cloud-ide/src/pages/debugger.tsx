import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Bug, Play, Pause, SkipForward, StepForward, StepBack, Square, Circle, ChevronRight, ChevronDown, Eye, Variable, Layers, Terminal, AlertTriangle, CheckCircle2, XCircle, Hash, Type, Braces, ToggleLeft } from "lucide-react";

interface Breakpoint { id: string; file: string; line: number; enabled: boolean; condition?: string; hitCount: number; }
interface StackFrame { id: string; name: string; file: string; line: number; column: number; isActive: boolean; }
interface WatchVar { name: string; value: string; type: string; expandable: boolean; children?: WatchVar[]; }

const BREAKPOINTS: Breakpoint[] = [
  { id: "bp1", file: "src/App.tsx", line: 42, enabled: true, hitCount: 3 },
  { id: "bp2", file: "src/api/auth.ts", line: 87, enabled: true, condition: "user.role === 'admin'", hitCount: 1 },
  { id: "bp3", file: "src/services/billing.ts", line: 156, enabled: false, hitCount: 0 },
  { id: "bp4", file: "src/hooks/useAI.ts", line: 23, enabled: true, hitCount: 12 },
  { id: "bp5", file: "src/utils/parser.ts", line: 89, enabled: true, condition: "tokens.length > 100", hitCount: 5 },
];

const STACK: StackFrame[] = [
  { id: "sf1", name: "handleSubmit", file: "src/App.tsx", line: 42, column: 8, isActive: true },
  { id: "sf2", name: "processRequest", file: "src/api/auth.ts", line: 87, column: 12, isActive: false },
  { id: "sf3", name: "validateToken", file: "src/middlewares/auth.ts", line: 34, column: 5, isActive: false },
  { id: "sf4", name: "createSession", file: "src/services/session.ts", line: 112, column: 3, isActive: false },
];

const VARIABLES: WatchVar[] = [
  { name: "user", value: "{id: 'usr_123', name: 'John', role: 'admin'}", type: "Object", expandable: true, children: [
    { name: "id", value: "'usr_123'", type: "string", expandable: false },
    { name: "name", value: "'John Doe'", type: "string", expandable: false },
    { name: "role", value: "'admin'", type: "string", expandable: false },
    { name: "credits", value: "1500", type: "number", expandable: false },
  ]},
  { name: "request", value: "{method: 'POST', url: '/api/ai/chat'}", type: "Object", expandable: true },
  { name: "isAuthenticated", value: "true", type: "boolean", expandable: false },
  { name: "tokenCount", value: "2847", type: "number", expandable: false },
  { name: "modelId", value: "'gpt-4o'", type: "string", expandable: false },
  { name: "estimatedCost", value: "0.0342", type: "number", expandable: false },
];

const CONSOLE_LINES = [
  { type: "info", message: "Debugger attached to process 34629", time: "15:30:01" },
  { type: "info", message: "Breakpoint hit at src/App.tsx:42", time: "15:30:05" },
  { type: "log", message: "user = {id: 'usr_123', name: 'John', role: 'admin'}", time: "15:30:05" },
  { type: "warn", message: "Token count exceeding soft limit (2847/3000)", time: "15:30:06" },
  { type: "log", message: "Estimated cost: $0.0342", time: "15:30:06" },
  { type: "error", message: "TypeError: Cannot read property 'credits' of undefined", time: "15:30:07" },
  { type: "info", message: "Stepping over...", time: "15:30:08" },
];

const TYPE_ICONS: Record<string, any> = { string: Type, number: Hash, boolean: ToggleLeft, Object: Braces };

export default function DebuggerPage() {
  const [status, setStatus] = useState<"paused" | "running" | "stopped">("paused");
  const [activeTab, setActiveTab] = useState<"variables" | "watch" | "breakpoints" | "callstack">("variables");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["user"]));
  const [bpEnabled, setBpEnabled] = useState<Record<string, boolean>>(Object.fromEntries(BREAKPOINTS.map(b => [b.id, b.enabled])));

  const toggleExpand = (name: string) => {
    const s = new Set(expanded);
    if (s.has(name)) s.delete(name); else s.add(name);
    setExpanded(s);
  };

  return (
    <FeaturePageLayout title="Debugger" description="Visual debugging with breakpoints, variable inspection, and step-through execution" icon={<Bug className="w-7 h-7 text-white" />} badge={status === "paused" ? "Paused at line 42" : status === "running" ? "Running" : "Stopped"} badgeVariant={status === "paused" ? "warning" : status === "running" ? "success" : "default"}>
      <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-1">
          {status === "paused" ? (
            <button onClick={() => setStatus("running")} className="w-8 h-8 rounded-lg bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors"><Play className="w-4 h-4 text-white ml-0.5" /></button>
          ) : (
            <button onClick={() => setStatus("paused")} className="w-8 h-8 rounded-lg bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center transition-colors"><Pause className="w-4 h-4 text-white" /></button>
          )}
          <button onClick={() => setStatus("stopped")} className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"><Square className="w-3.5 h-3.5 text-white" /></button>
        </div>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Step Over"><SkipForward className="w-4 h-4 text-gray-400" /></button>
        <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Step Into"><StepForward className="w-4 h-4 text-gray-400" /></button>
        <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Step Out"><StepBack className="w-4 h-4 text-gray-400" /></button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Circle className={`w-3 h-3 ${status === "paused" ? "text-yellow-500 animate-pulse" : status === "running" ? "text-green-500 animate-pulse" : "text-red-500"}`} fill="currentColor" />
          <span className="text-xs text-gray-400">{status === "paused" ? "Paused at src/App.tsx:42" : status === "running" ? "Running..." : "Stopped"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex border-b border-white/10">
              {(["variables", "watch", "breakpoints", "callstack"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 text-xs font-medium transition-all capitalize ${activeTab === t ? "bg-blue-600/20 text-blue-400 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>{t === "callstack" ? "Call Stack" : t}</button>
              ))}
            </div>
            <div className="p-3 max-h-[400px] overflow-y-auto">
              {activeTab === "variables" && (
                <div className="space-y-0.5">
                  {VARIABLES.map(v => {
                    const TypeIcon = TYPE_ICONS[v.type] || Variable;
                    const isExp = expanded.has(v.name);
                    return (
                      <div key={v.name}>
                        <div onClick={() => v.expandable && toggleExpand(v.name)} className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 ${v.expandable ? "cursor-pointer" : ""}`}>
                          {v.expandable ? (isExp ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />) : <span className="w-3" />}
                          <TypeIcon className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-purple-400 font-mono">{v.name}</span>
                          <span className="text-xs text-gray-500">=</span>
                          <span className="text-xs text-green-400 font-mono truncate">{v.value}</span>
                          <span className="text-[10px] text-gray-600 ml-auto">{v.type}</span>
                        </div>
                        {v.expandable && isExp && v.children && (
                          <div className="ml-6 border-l border-white/5 pl-2">
                            {v.children.map(c => {
                              const CIcon = TYPE_ICONS[c.type] || Variable;
                              return (
                                <div key={c.name} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5">
                                  <span className="w-3" />
                                  <CIcon className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs text-purple-400 font-mono">{c.name}</span>
                                  <span className="text-xs text-gray-500">=</span>
                                  <span className="text-xs text-green-400 font-mono">{c.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {activeTab === "breakpoints" && (
                <div className="space-y-1">
                  {BREAKPOINTS.map(bp => (
                    <div key={bp.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5">
                      <button onClick={() => setBpEnabled({ ...bpEnabled, [bp.id]: !bpEnabled[bp.id] })} className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${bpEnabled[bp.id] ? "bg-red-500 border-red-500" : "border-gray-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-mono truncate">{bp.file}:{bp.line}</p>
                        {bp.condition && <p className="text-[10px] text-yellow-400 font-mono">if ({bp.condition})</p>}
                      </div>
                      <span className="text-[10px] text-gray-500">hit: {bp.hitCount}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "callstack" && (
                <div className="space-y-0.5">
                  {STACK.map(frame => (
                    <div key={frame.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${frame.isActive ? "bg-yellow-500/10 border border-yellow-500/20" : "hover:bg-white/5"}`}>
                      <Layers className={`w-3 h-3 ${frame.isActive ? "text-yellow-400" : "text-gray-500"}`} />
                      <span className={`text-xs font-mono ${frame.isActive ? "text-yellow-400" : "text-gray-400"}`}>{frame.name}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">{frame.file}:{frame.line}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "watch" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input placeholder="Add watch expression..." className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                    <button className="text-xs text-blue-400 hover:text-blue-300">Add</button>
                  </div>
                  <div className="space-y-1">
                    {[{ expr: "user.credits > 1000", result: "true", type: "boolean" }, { expr: "tokenCount * 0.00003", result: "0.08541", type: "number" }, { expr: "request.headers['authorization']", result: "'Bearer eyJ...'", type: "string" }].map((w, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5">
                        <Eye className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-purple-400 font-mono">{w.expr}</span>
                        <span className="text-xs text-gray-500">=</span>
                        <span className="text-xs text-green-400 font-mono">{w.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-400">Debug Console</span>
          </div>
          <div className="p-3 font-mono text-xs space-y-1 max-h-[400px] overflow-y-auto bg-black/30">
            {CONSOLE_LINES.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-600 w-16 flex-shrink-0">{line.time}</span>
                {line.type === "error" ? <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" /> :
                 line.type === "warn" ? <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" /> :
                 line.type === "info" ? <CheckCircle2 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" /> :
                 <ChevronRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />}
                <span className={`${line.type === "error" ? "text-red-400" : line.type === "warn" ? "text-yellow-400" : "text-gray-300"}`}>{line.message}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <ChevronRight className="w-3 h-3 text-blue-400" />
              <input placeholder="Evaluate expression..." className="flex-1 bg-transparent text-gray-300 focus:outline-none placeholder-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </FeaturePageLayout>
  );
}
