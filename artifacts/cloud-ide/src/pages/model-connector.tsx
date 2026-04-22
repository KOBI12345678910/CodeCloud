import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Plug, Plus, Trash2, Settings, Zap, Check, X,
  Eye, EyeOff, TestTube, RefreshCw, Globe, Lock, Cpu,
  BarChart3, DollarSign, Activity, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

interface Provider {
  id: string;
  displayName: string;
  description: string;
  modelCount: number;
  connected: boolean;
}

interface ConnectedModel {
  id: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
  contextWindow: number;
  inputPricePer1kTokens: number;
  outputPricePer1kTokens: number;
  marginPercent: number;
  finalInputPer1k: number;
  finalOutputPer1k: number;
  tier: string;
  enabled: boolean;
  qualityScore: number;
  strengths: string[];
  supportsVision: boolean;
  supportsTools: boolean;
}

interface Connector {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  apiBaseUrl: string;
  authType: string;
  status: string;
  models: ConnectedModel[];
  healthCheck: { lastCheck: string; latencyMs: number; status: string };
  rateLimit: { requestsPerMinute: number; tokensPerMinute: number };
}

const PROVIDER_ICONS: Record<string, string> = {
  openai: "🟢", anthropic: "🟠", google: "🔵", xai: "⚡", deepseek: "🐋",
  meta: "📘", mistral: "🇫🇷", cohere: "🔴", perplexity: "🔍", together: "🤝",
  fireworks: "🎆", cerebras: "🧠", groq: "⚙️", sambanova: "🔧", nvidia: "💚",
  azure: "☁️", aws_bedrock: "📦", ai21: "🧬", inflection: "💬", zhipu: "🏮",
  minimax: "📐", moonshot: "🌙", baichuan: "🏯", ollama: "🖥️", custom: "🔌",
};

type Tab = "providers" | "connected" | "all-models";

export default function ModelConnectorPage() {
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [allModels, setAllModels] = useState<ConnectedModel[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [margin, setMargin] = useState(40);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      const r = await fetch(`${apiUrl}/model-connector/providers`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const data = await r.json(); setProviders(data.providers); }
    } catch { }
    setLoading(false);
  };

  const fetchConnectors = async () => {
    try {
      const r = await fetch(`${apiUrl}/model-connector/connectors`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const data = await r.json(); setConnectors(data.connectors); }
    } catch { }
  };

  const fetchAllModels = async () => {
    try {
      const r = await fetch(`${apiUrl}/model-connector/all-models`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const data = await r.json(); setAllModels(data.models); }
    } catch { }
  };

  useEffect(() => { fetchProviders(); fetchConnectors(); }, []);
  useEffect(() => { if (tab === "all-models") fetchAllModels(); }, [tab]);

  const connectProvider = async (providerId: string) => {
    const r = await fetch(`${apiUrl}/model-connector/connectors`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId, apiKey: apiKey || undefined, apiBaseUrl: customUrl || undefined, marginPercent: margin }),
    });
    if (r.ok) {
      setConnectingProvider(null); setApiKey(""); setCustomUrl("");
      fetchProviders(); fetchConnectors();
    }
  };

  const deleteConnector = async (id: string) => {
    await fetch(`${apiUrl}/model-connector/connectors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchProviders(); fetchConnectors();
  };

  const testConnector = async (id: string) => {
    const r = await fetch(`${apiUrl}/model-connector/connectors/${id}/test`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) fetchConnectors();
  };

  const addCustomModel = async (connectorId: string) => {
    await fetch(`${apiUrl}/model-connector/connectors/${connectorId}/models`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: "custom-model", displayName: "Custom Model", capabilities: ["chat"], contextWindow: 4096, inputPricePer1kTokens: 1, outputPricePer1kTokens: 3 }),
    });
    fetchConnectors();
  };

  const TIER_COLORS: Record<string, string> = {
    premium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    standard: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    economy: "bg-green-500/10 text-green-400 border-green-500/20",
    free: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-500/10 text-green-400", testing: "bg-yellow-500/10 text-yellow-400",
    disabled: "bg-red-500/10 text-red-400", error: "bg-red-500/10 text-red-400",
    healthy: "text-green-400", degraded: "text-yellow-400", down: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-background" data-testid="model-connector-page">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/ai-models"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Plug className="h-6 w-6 text-purple-400" />Universal AI Model Connector</h1>
            <p className="text-sm text-muted-foreground">Connect any AI model from any provider in the world</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Providers</div>
              <div className="text-xl font-bold text-purple-400">{providers.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Connected</div>
              <div className="text-xl font-bold text-green-400">{connectors.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Models</div>
              <div className="text-xl font-bold text-blue-400">{connectors.reduce((sum, c) => sum + c.models.length, 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {(["providers", "connected", "all-models"] as Tab[]).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "providers" ? `🌐 All Providers (${providers.length})` : t === "connected" ? `🔗 Connected (${connectors.length})` : `🤖 All Models`}
            </Button>
          ))}
        </div>

        {tab === "providers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(p => (
              <div key={p.id} className={`border rounded-xl p-5 bg-card transition-colors ${p.connected ? "border-green-500/30" : "hover:border-purple-500/30"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{PROVIDER_ICONS[p.id] || "🔌"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{p.displayName}</h3>
                      {p.connected && <Check className="h-4 w-4 text-green-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.modelCount} models</span>
                  {p.connected ? (
                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Connected</span>
                  ) : connectingProvider === p.id ? (
                    <div className="space-y-2 w-full mt-2">
                      <Input type="password" placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="h-8 text-xs" />
                      {p.id === "custom" && <Input placeholder="API Base URL" value={customUrl} onChange={e => setCustomUrl(e.target.value)} className="h-8 text-xs" />}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Margin:</span>
                        <Input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} className="h-7 w-16 text-xs" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => connectProvider(p.id)}><Plug className="h-3 w-3 mr-1" />Connect</Button>
                        <Button size="sm" variant="outline" onClick={() => setConnectingProvider(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConnectingProvider(p.id)}><Plus className="h-3 w-3 mr-1" />Connect</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "connected" && (
          <div className="space-y-4">
            {connectors.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No connectors yet. Go to Providers tab to connect your first AI provider.</p>
              </div>
            ) : connectors.map(conn => (
              <div key={conn.id} className="border rounded-xl bg-card overflow-hidden">
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedConnector(expandedConnector === conn.id ? null : conn.id)}>
                  <span className="text-xl">{PROVIDER_ICONS[conn.provider] || "🔌"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{conn.displayName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[conn.status] || ""}`}>{conn.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{conn.models.length} models • {conn.apiBaseUrl}</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className={STATUS_COLORS[conn.healthCheck?.status || "down"]}>
                      {conn.healthCheck?.status || "unknown"} • {conn.healthCheck?.latencyMs || 0}ms
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); testConnector(conn.id); }}><TestTube className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={e => { e.stopPropagation(); deleteConnector(conn.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {expandedConnector === conn.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                {expandedConnector === conn.id && (
                  <div className="border-t border-border p-4 bg-card/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Models ({conn.models.length})</h4>
                      <Button size="sm" variant="outline" onClick={() => addCustomModel(conn.id)}><Plus className="h-3 w-3 mr-1" />Add Model</Button>
                    </div>
                    <div className="grid gap-2">
                      {conn.models.map(m => (
                        <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{m.displayName}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TIER_COLORS[m.tier] || ""}`}>{m.tier}</span>
                              {m.supportsVision && <Eye className="h-3 w-3 text-blue-400" />}
                              {m.supportsTools && <Zap className="h-3 w-3 text-yellow-400" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex gap-3 mt-0.5">
                              <span>{(m.contextWindow / 1000).toFixed(0)}K ctx</span>
                              <span>Quality: {m.qualityScore}/100</span>
                              {m.strengths.length > 0 && <span>{m.strengths.join(", ")}</span>}
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">In:</span>
                              <span className="font-mono">${m.inputPricePer1kTokens.toFixed(3)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono text-green-400">${m.finalInputPer1k.toFixed(3)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Out:</span>
                              <span className="font-mono">${m.outputPricePer1kTokens.toFixed(3)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono text-green-400">${m.finalOutputPer1k.toFixed(3)}</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{m.marginPercent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "all-models" && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-4">{allModels.length} models available across all connected providers</div>
            {allModels.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.displayName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TIER_COLORS[m.tier] || ""}`}>{m.tier}</span>
                    {m.supportsVision && <Eye className="h-3 w-3 text-blue-400" />}
                    {m.supportsTools && <Zap className="h-3 w-3 text-yellow-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{(m.contextWindow / 1000).toFixed(0)}K context • Score: {m.qualityScore}/100</div>
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="text-green-400">${m.finalInputPer1k.toFixed(3)} / ${m.finalOutputPer1k.toFixed(3)}</div>
                  <div className="text-muted-foreground">per 1K tokens (in/out)</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
