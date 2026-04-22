import React, { useState } from "react";
import {
  Layers, Plus, Trash2, GripVertical, X, Save, ChevronDown,
  ChevronRight, Settings, Play, Pause, ArrowDown, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Middleware {
  id: string;
  name: string;
  type: "auth" | "cors" | "rate-limit" | "logging" | "cache" | "compression" | "custom";
  enabled: boolean;
  config: Record<string, string>;
  order: number;
}

interface MiddlewarePipelineProps {
  onClose?: () => void;
}

const MIDDLEWARE_TYPES: { type: Middleware["type"]; label: string; icon: React.ElementType; defaultConfig: Record<string, string> }[] = [
  { type: "auth", label: "Authentication", icon: Shield, defaultConfig: { strategy: "jwt", headerName: "Authorization" } },
  { type: "cors", label: "CORS", icon: Zap, defaultConfig: { origin: "*", methods: "GET,POST,PUT,DELETE", credentials: "true" } },
  { type: "rate-limit", label: "Rate Limiter", icon: Shield, defaultConfig: { windowMs: "60000", max: "100" } },
  { type: "logging", label: "Request Logger", icon: Layers, defaultConfig: { format: "combined", colorize: "true" } },
  { type: "cache", label: "Response Cache", icon: Zap, defaultConfig: { ttl: "3600", maxSize: "100" } },
  { type: "compression", label: "Compression", icon: Zap, defaultConfig: { level: "6", threshold: "1024" } },
  { type: "custom", label: "Custom", icon: Settings, defaultConfig: { handler: "module.exports = (req, res, next) => next();" } },
];

const TYPE_COLORS: Record<string, string> = {
  auth: "text-green-400 bg-green-500/10",
  cors: "text-blue-400 bg-blue-500/10",
  "rate-limit": "text-yellow-400 bg-yellow-500/10",
  logging: "text-purple-400 bg-purple-500/10",
  cache: "text-cyan-400 bg-cyan-500/10",
  compression: "text-orange-400 bg-orange-500/10",
  custom: "text-gray-400 bg-gray-500/10",
};

export function MiddlewarePipeline({ onClose }: MiddlewarePipelineProps): React.ReactElement {
  const [middlewares, setMiddlewares] = useState<Middleware[]>([
    { id: "m1", name: "CORS", type: "cors", enabled: true, config: { origin: "*", methods: "GET,POST,PUT,DELETE", credentials: "true" }, order: 0 },
    { id: "m2", name: "Auth", type: "auth", enabled: true, config: { strategy: "jwt", headerName: "Authorization" }, order: 1 },
    { id: "m3", name: "Rate Limit", type: "rate-limit", enabled: true, config: { windowMs: "60000", max: "100" }, order: 2 },
    { id: "m4", name: "Logger", type: "logging", enabled: true, config: { format: "combined", colorize: "true" }, order: 3 },
    { id: "m5", name: "Compression", type: "compression", enabled: false, config: { level: "6", threshold: "1024" }, order: 4 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const selectedMiddleware = middlewares.find(m => m.id === selectedId);

  const addMiddleware = (type: Middleware["type"]) => {
    const typeInfo = MIDDLEWARE_TYPES.find(t => t.type === type)!;
    const newMw: Middleware = {
      id: `m-${Date.now()}`, name: typeInfo.label, type, enabled: true,
      config: { ...typeInfo.defaultConfig }, order: middlewares.length,
    };
    setMiddlewares(prev => [...prev, newMw]);
    setShowAddMenu(false);
    setSelectedId(newMw.id);
  };

  const removeMiddleware = (id: string) => {
    setMiddlewares(prev => prev.filter(m => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleEnabled = (id: string) => {
    setMiddlewares(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const moveMiddleware = (fromIndex: number, toIndex: number) => {
    const updated = [...middlewares];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setMiddlewares(updated.map((m, i) => ({ ...m, order: i })));
    setDragOverIndex(null);
  };

  const updateConfig = (key: string, value: string) => {
    if (!selectedId) return;
    setMiddlewares(prev => prev.map(m => m.id === selectedId ? { ...m, config: { ...m.config, [key]: value } } : m));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-purple-400" />
          <span className="text-xs font-medium">Middleware Pipeline</span>
          <span className="text-[10px] text-gray-500">{middlewares.filter(m => m.enabled).length}/{middlewares.length} active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setShowAddMenu(!showAddMenu)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
              <Plus size={10} /> Add
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#252526] border border-[#444] rounded shadow-lg py-1 z-10">
                {MIDDLEWARE_TYPES.map(t => (
                  <button key={t.type} onClick={() => addMiddleware(t.type)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#2a2d2e] text-left">
                    <t.icon size={10} className={TYPE_COLORS[t.type]?.split(" ")[0] || ""} /> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {onClose && <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r border-[#333] overflow-y-auto">
          <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Request Flow</div>
          {middlewares.map((mw, index) => (
            <div key={mw.id}>
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => { e.preventDefault(); moveMiddleware(parseInt(e.dataTransfer.getData("text/plain")), index); }}
                onClick={() => setSelectedId(mw.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors ${
                  selectedId === mw.id ? "bg-[#37373d]" : "hover:bg-[#2a2d2e]"
                } ${dragOverIndex === index ? "border-t-2 border-blue-400" : ""} ${!mw.enabled ? "opacity-40" : ""}`}
              >
                <GripVertical size={10} className="text-gray-600 cursor-grab shrink-0" />
                <button onClick={(e) => { e.stopPropagation(); toggleEnabled(mw.id); }} className="shrink-0">
                  {mw.enabled ? <Play size={10} className="text-green-400" /> : <Pause size={10} className="text-gray-500" />}
                </button>
                <span className={`px-1 py-0 rounded text-[8px] font-bold ${TYPE_COLORS[mw.type]}`}>{mw.type}</span>
                <span className="text-xs text-gray-300 truncate flex-1">{mw.name}</span>
                <button onClick={(e) => { e.stopPropagation(); removeMiddleware(mw.id); }} className="text-gray-600 hover:text-red-400 shrink-0">
                  <Trash2 size={10} />
                </button>
              </div>
              {index < middlewares.length - 1 && (
                <div className="flex justify-center py-0.5"><ArrowDown size={10} className="text-gray-600" /></div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedMiddleware ? (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Name</label>
                <input value={selectedMiddleware.name} onChange={e => setMiddlewares(prev => prev.map(m => m.id === selectedId ? { ...m, name: e.target.value } : m))}
                  className="w-full bg-[#2a2d2e] px-2 py-1.5 rounded text-xs text-gray-300 outline-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Configuration</label>
                <div className="mt-1 space-y-1.5">
                  {Object.entries(selectedMiddleware.config).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-24 shrink-0 font-mono">{key}</span>
                      {value.length > 50 ? (
                        <textarea value={value} onChange={e => updateConfig(key, e.target.value)}
                          className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-300 outline-none h-16 resize-none" />
                      ) : (
                        <input value={value} onChange={e => updateConfig(key, e.target.value)}
                          className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-300 outline-none" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-600">
              Select a middleware to configure
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
