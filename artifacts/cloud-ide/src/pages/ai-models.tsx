import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Brain, Zap, DollarSign, Eye, Wrench, Search,
  TrendingUp, Clock, Star, Filter, BarChart3, Sparkles,
  ChevronDown, ChevronUp, Globe, Cpu, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

interface AIModel {
  id: string;
  label: string;
  provider: string;
  tier: string;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  inputPer1k: number;
  outputPer1k: number;
  qualityScore: number;
  avgLatencyMs: number;
  strengths: string[];
  description: string;
}

type SortKey = "qualityScore" | "avgCost" | "avgLatencyMs" | "contextWindow";
type Tab = "all" | "recommend" | "compare";

const TIER_COLORS: Record<string, string> = {
  premium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  standard: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  economy: "bg-green-500/10 text-green-500 border-green-500/20",
  free: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const PROVIDER_ICONS: Record<string, string> = {
  openai: "🟢", anthropic: "🟠", google: "🔵", xai: "⚡", deepseek: "🐋",
  meta: "📘", mistral: "🇫🇷", qwen: "🇨🇳", cohere: "🔴", ollama: "🖥️",
  perplexity: "🔍", ai21: "🧬", together: "🤝", fireworks: "🎆", cerebras: "🧠",
  inflection: "💬", zhipu: "🏮", minimax: "📐", moonshot: "🌙", yi: "✨",
  sambanova: "⚙️", nvidia: "💚", amazon: "📦", azure: "☁️", baichuan: "🏯",
};

export default function AIModelsPage() {
  const token = useAuthStore((s) => s.token);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("qualityScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  const [recommendTask, setRecommendTask] = useState("code");
  const [recommendStrategy, setRecommendStrategy] = useState("cheapest");
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/api/ai/models`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setModels(data.models || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const providers = useMemo(() => [...new Set(models.map((m) => m.provider))].sort(), [models]);
  const tiers = ["premium", "standard", "economy", "free"];

  const filtered = useMemo(() => {
    let result = models;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.label.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    if (tierFilter !== "all") result = result.filter((m) => m.tier === tierFilter);
    if (providerFilter !== "all") result = result.filter((m) => m.provider === providerFilter);

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortKey === "avgCost") {
        aVal = (a.inputPer1k + a.outputPer1k) / 2;
        bVal = (b.inputPer1k + b.outputPer1k) / 2;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [models, search, tierFilter, providerFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "avgCost" || key === "avgLatencyMs"); }
  };

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const fetchRecommendation = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/ai/recommend/${recommendStrategy}/${recommendTask}`, { credentials: "include" });
      const data = await res.json();
      setRecommendation(data);
    } catch {}
  };

  const avgCost = (m: AIModel) => ((m.inputPer1k + m.outputPer1k) / 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/dashboard"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Brain className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">AI Model Marketplace</h1>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-2">
          {models.length} models · {providers.length} providers
        </span>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 border-b border-border mb-6">
          {([
            { id: "all", label: "All Models", icon: Globe },
            { id: "recommend", label: "Smart Recommend", icon: Sparkles },
            { id: "compare", label: "Compare", icon: BarChart3 },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "all" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models..." className="pl-9" />
              </div>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
                <option value="all">All tiers</option>
                {tiers.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
                <option value="all">All providers</option>
                {providers.map((p) => <option key={p} value={p}>{PROVIDER_ICONS[p] || "🤖"} {p}</option>)}
              </select>
              <div className="flex gap-1">
                {([
                  { key: "qualityScore" as SortKey, label: "Quality", icon: Star },
                  { key: "avgCost" as SortKey, label: "Cost", icon: DollarSign },
                  { key: "avgLatencyMs" as SortKey, label: "Speed", icon: Clock },
                ]).map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => handleSort(key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${sortKey === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    <Icon className="w-3 h-3" /> {label}
                    {sortKey === key && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((m) => (
                  <div key={m.id} className={`bg-card border rounded-xl p-5 hover:border-primary/40 transition cursor-pointer ${selectedForCompare.has(m.id) ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
                    onClick={() => toggleCompare(m.id)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PROVIDER_ICONS[m.provider] || "🤖"}</span>
                        <div>
                          <h3 className="text-sm font-semibold">{m.label}</h3>
                          <p className="text-[10px] text-muted-foreground capitalize">{m.provider}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TIER_COLORS[m.tier] || ""}`}>
                        {m.tier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.description}</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{m.qualityScore}</p>
                        <p className="text-[10px] text-muted-foreground">Quality</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">${avgCost(m).toFixed(4)}</p>
                        <p className="text-[10px] text-muted-foreground">/1k avg</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{m.avgLatencyMs < 1000 ? `${m.avgLatencyMs}ms` : `${(m.avgLatencyMs / 1000).toFixed(1)}s`}</p>
                        <p className="text-[10px] text-muted-foreground">Latency</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.strengths.map((s) => (
                        <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {m.supportsVision && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />Vision</span>}
                      {m.supportsTools && <span className="flex items-center gap-0.5"><Wrench className="w-3 h-3" />Tools</span>}
                      <span className="flex items-center gap-0.5"><Cpu className="w-3 h-3" />{m.contextWindow >= 1000000 ? `${(m.contextWindow / 1000000).toFixed(0)}M` : `${(m.contextWindow / 1000).toFixed(0)}K`} ctx</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedForCompare.size >= 2 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50">
                <span className="text-sm font-medium">{selectedForCompare.size} models selected</span>
                <Button variant="secondary" size="sm" onClick={() => setTab("compare")}>Compare</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedForCompare(new Set())} className="text-primary-foreground/70">Clear</Button>
              </div>
            )}
          </>
        )}

        {tab === "recommend" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Smart AI Router</h2>
              <p className="text-xs text-muted-foreground mb-4">Tell us your task and we'll recommend the best model based on your preferences.</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Task type</label>
                  <select value={recommendTask} onChange={(e) => setRecommendTask(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    {["code", "content", "math", "vision", "reasoning", "general"].map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Optimize for</label>
                  <select value={recommendStrategy} onChange={(e) => setRecommendStrategy(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="cheapest">Cheapest</option>
                    <option value="fastest">Fastest</option>
                    <option value="best">Best Quality</option>
                  </select>
                </div>
              </div>
              <Button onClick={fetchRecommendation} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" /> Get Recommendation
              </Button>
            </div>

            {recommendation && (
              <div className="bg-card border border-primary/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Recommended: {recommendation.model?.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{recommendation.reason}</p>
                {recommendation.savings && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-3">
                    <p className="text-xs text-green-500 font-medium">
                      💰 Save {recommendation.savings.savedPercent}% compared to {recommendation.savings.comparedTo}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Est. cost: ${recommendation.estimatedCostPer1k?.toFixed(6)}/1k tokens</p>
                {recommendation.alternatives?.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Alternatives:</p>
                    {recommendation.alternatives.map((alt: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-medium">{alt.model?.label}</span>
                        <span className="text-[10px] text-muted-foreground">{alt.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "compare" && (
          <div className="space-y-6">
            {selectedForCompare.size < 2 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Select at least 2 models to compare</p>
                <Button variant="outline" size="sm" onClick={() => setTab("all")}>Browse Models</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Property</th>
                      {[...selectedForCompare].map((id) => {
                        const m = models.find((x) => x.id === id);
                        return m ? (
                          <th key={id} className="text-center py-3 px-4">
                            <span className="text-lg">{PROVIDER_ICONS[m.provider]}</span>
                            <p className="text-xs font-semibold mt-1">{m.label}</p>
                          </th>
                        ) : null;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Quality Score", fn: (m: AIModel) => <span className={`font-bold ${m.qualityScore >= 90 ? "text-green-500" : m.qualityScore >= 80 ? "text-yellow-500" : "text-red-500"}`}>{m.qualityScore}/100</span> },
                      { label: "Avg Cost / 1k tokens", fn: (m: AIModel) => `$${avgCost(m).toFixed(5)}` },
                      { label: "Latency", fn: (m: AIModel) => m.avgLatencyMs < 1000 ? `${m.avgLatencyMs}ms` : `${(m.avgLatencyMs / 1000).toFixed(1)}s` },
                      { label: "Context Window", fn: (m: AIModel) => m.contextWindow >= 1000000 ? `${(m.contextWindow / 1000000).toFixed(0)}M` : `${(m.contextWindow / 1000).toFixed(0)}K` },
                      { label: "Vision", fn: (m: AIModel) => m.supportsVision ? "✅" : "❌" },
                      { label: "Tool Use", fn: (m: AIModel) => m.supportsTools ? "✅" : "❌" },
                      { label: "Tier", fn: (m: AIModel) => <span className={`px-2 py-0.5 rounded-full text-[10px] border ${TIER_COLORS[m.tier]}`}>{m.tier}</span> },
                      { label: "Strengths", fn: (m: AIModel) => m.strengths.join(", ") },
                      { label: "Input $/1k", fn: (m: AIModel) => `$${m.inputPer1k.toFixed(5)}` },
                      { label: "Output $/1k", fn: (m: AIModel) => `$${m.outputPer1k.toFixed(5)}` },
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-border/50">
                        <td className="py-2.5 px-4 text-muted-foreground text-xs">{label}</td>
                        {[...selectedForCompare].map((id) => {
                          const m = models.find((x) => x.id === id);
                          return m ? <td key={id} className="py-2.5 px-4 text-center text-xs">{fn(m)}</td> : null;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
