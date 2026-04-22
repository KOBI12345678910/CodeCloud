import React, { useState } from "react";
import {
  Shield, Plus, Trash2, Edit2, ToggleLeft, ToggleRight,
  BarChart3, Clock, Users, Key, Globe, ChevronDown, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RateLimitRule {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "ALL";
  limitBy: "ip" | "user" | "apiKey";
  maxRequests: number;
  windowSeconds: number;
  burstLimit: number;
  enabled: boolean;
}

interface RateLimitConfigProps {
  onClose?: () => void;
}

const SAMPLE_RULES: RateLimitRule[] = [
  { id: "rl-1", endpoint: "/api/auth/login", method: "POST", limitBy: "ip", maxRequests: 5, windowSeconds: 300, burstLimit: 2, enabled: true },
  { id: "rl-2", endpoint: "/api/projects", method: "ALL", limitBy: "user", maxRequests: 100, windowSeconds: 60, burstLimit: 20, enabled: true },
  { id: "rl-3", endpoint: "/api/deploy", method: "POST", limitBy: "apiKey", maxRequests: 10, windowSeconds: 3600, burstLimit: 3, enabled: true },
  { id: "rl-4", endpoint: "/api/files", method: "GET", limitBy: "user", maxRequests: 500, windowSeconds: 60, burstLimit: 50, enabled: false },
];

export default function RateLimitConfig({ onClose }: RateLimitConfigProps): React.ReactElement {
  const [rules, setRules] = useState<RateLimitRule[]>(SAMPLE_RULES);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState("");
  const [newMethod, setNewMethod] = useState<RateLimitRule["method"]>("ALL");
  const [newLimitBy, setNewLimitBy] = useState<RateLimitRule["limitBy"]>("ip");
  const [newMax, setNewMax] = useState(100);
  const [newWindow, setNewWindow] = useState(60);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const addRule = () => {
    if (!newEndpoint) return;
    setRules(prev => [...prev, {
      id: `rl-${Date.now()}`, endpoint: newEndpoint, method: newMethod,
      limitBy: newLimitBy, maxRequests: newMax, windowSeconds: newWindow,
      burstLimit: Math.floor(newMax * 0.2), enabled: true,
    }]);
    setShowAdd(false);
    setNewEndpoint("");
  };

  const limitByIcon = (lb: string) => lb === "ip" ? Globe : lb === "user" ? Users : Key;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Rate Limit Configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={12} /> Add Rule
          </Button>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={14} /></Button>}
        </div>
      </div>

      {showAdd && (
        <div className="px-4 py-3 border-b border-border/30 space-y-2 bg-muted/20">
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} placeholder="/api/endpoint" className="col-span-2 px-2 py-1.5 rounded border border-border text-xs bg-background" />
            <select value={newMethod} onChange={e => setNewMethod(e.target.value as RateLimitRule["method"])} className="px-2 py-1.5 rounded border border-border text-xs bg-background">
              <option>ALL</option><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={newLimitBy} onChange={e => setNewLimitBy(e.target.value as RateLimitRule["limitBy"])} className="px-2 py-1.5 rounded border border-border text-xs bg-background">
              <option value="ip">By IP</option><option value="user">By User</option><option value="apiKey">By API Key</option>
            </select>
            <input type="number" value={newMax} onChange={e => setNewMax(+e.target.value)} placeholder="Max requests" className="px-2 py-1.5 rounded border border-border text-xs bg-background" />
            <input type="number" value={newWindow} onChange={e => setNewWindow(+e.target.value)} placeholder="Window (s)" className="px-2 py-1.5 rounded border border-border text-xs bg-background" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={addRule}>Create Rule</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {rules.map(rule => {
          const LimitIcon = limitByIcon(rule.limitBy);
          const expanded = expandedRule === rule.id;
          return (
            <div key={rule.id} className={`border-b border-border/20 ${!rule.enabled ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedRule(expanded ? null : rule.id)}>
                {expanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${rule.method === "ALL" ? "bg-gray-500/20 text-gray-400" : rule.method === "GET" ? "bg-green-500/20 text-green-400" : rule.method === "POST" ? "bg-blue-500/20 text-blue-400" : rule.method === "PUT" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>{rule.method}</span>
                <span className="text-xs font-mono flex-1">{rule.endpoint}</span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <LimitIcon size={10} />
                  <span>{rule.limitBy}</span>
                </div>
                <span className="text-xs text-muted-foreground">{rule.maxRequests}/{rule.windowSeconds}s</span>
                <button onClick={e => { e.stopPropagation(); toggleRule(rule.id); }} className="p-1">
                  {rule.enabled ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} className="text-gray-500" />}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteRule(rule.id); }} className="p-1 text-gray-500 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded && (
                <div className="px-8 py-3 bg-muted/10 space-y-2 text-xs">
                  <div className="grid grid-cols-4 gap-4">
                    <div><span className="text-muted-foreground">Max Requests:</span> <span className="font-medium">{rule.maxRequests}</span></div>
                    <div><span className="text-muted-foreground">Window:</span> <span className="font-medium">{rule.windowSeconds}s</span></div>
                    <div><span className="text-muted-foreground">Burst:</span> <span className="font-medium">{rule.burstLimit}</span></div>
                    <div><span className="text-muted-foreground">Limit By:</span> <span className="font-medium capitalize">{rule.limitBy}</span></div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><BarChart3 size={10} /> 0 blocked today</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> Last hit: never</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
