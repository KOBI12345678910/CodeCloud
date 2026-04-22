import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, DollarSign, Settings, TrendingUp, Edit3, Save,
  ToggleLeft, ToggleRight, Plus, Trash2, BarChart3, Percent,
  Globe, Cpu, Shield, Mail, Database, Cloud, Layers, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

interface ServicePrice {
  id: string;
  category: string;
  service: string;
  displayName: string;
  description: string;
  pricingModel: string;
  basePriceMicroUsd: number;
  marginPercent: number;
  finalPriceMicroUsd: number;
  unit: string;
  enabled: boolean;
  metadata: Record<string, any>;
}

interface RevenueProjection {
  month: number;
  totalUsers: number;
  paidUsers: number;
  mrr: number;
  arr: number;
  cumulativeRevenue: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  subscription: Layers, ai: Zap, domains: Globe, cloud: Cloud,
  database: Database, email: Mail, security: Shield, support: Settings,
};

const CATEGORY_COLORS: Record<string, string> = {
  subscription: "text-blue-400", ai: "text-purple-400", domains: "text-green-400",
  cloud: "text-cyan-400", database: "text-orange-400", email: "text-pink-400",
  security: "text-red-400", support: "text-yellow-400",
};

type Tab = "services" | "ai-models" | "revenue" | "global";

export default function AdminPricingPage() {
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("services");
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [globalMargin, setGlobalMargin] = useState(40);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ServicePrice>>({});
  const [projection, setProjection] = useState<RevenueProjection[]>([]);
  const [simParams, setSimParams] = useState({ users: 10000, conversionRate: 5, arpu: 50, churn: 3, months: 12 });
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      const r = await fetch(`${apiUrl}/admin/pricing/services`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setServices(data.services);
        setCategories(data.categories);
        setGlobalMargin(data.globalMarginPercent);
      }
    } catch { }
    setLoading(false);
  };

  const fetchProjection = async () => {
    try {
      const params = new URLSearchParams({
        users: String(simParams.users), conversionRate: String(simParams.conversionRate),
        arpu: String(simParams.arpu), churn: String(simParams.churn), months: String(simParams.months),
      });
      const r = await fetch(`${apiUrl}/admin/pricing/revenue-simulator?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const data = await r.json(); setProjection(data.projection); }
    } catch { }
  };

  useEffect(() => { fetchServices(); }, []);
  useEffect(() => { if (tab === "revenue") fetchProjection(); }, [tab, simParams]);

  const updateService = async (id: string, updates: Partial<ServicePrice>) => {
    const r = await fetch(`${apiUrl}/admin/pricing/services/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (r.ok) { fetchServices(); setEditingId(null); }
  };

  const toggleService = async (id: string, enabled: boolean) => updateService(id, { enabled });

  const updateGlobalMargin = async (margin: number, applyToAll: boolean) => {
    await fetch(`${apiUrl}/admin/pricing/global`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ marginPercent: margin, applyToAll }),
    });
    setGlobalMargin(margin);
    if (applyToAll) fetchServices();
  };

  const filtered = selectedCategory === "all" ? services : services.filter(s => s.category === selectedCategory);

  const formatPrice = (microUsd: number) => {
    const usd = microUsd / 1_000_000;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
    if (usd >= 1) return `$${usd.toFixed(2)}`;
    if (usd >= 0.01) return `$${usd.toFixed(3)}`;
    return `$${usd.toFixed(6)}`;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-pricing-page">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-green-400" />Admin Pricing Engine</h1>
            <p className="text-sm text-muted-foreground">Full control over all service pricing, margins, and revenue</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Services</div>
            <div className="text-2xl font-bold text-green-400">{services.length}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {(["services", "ai-models", "revenue", "global"] as Tab[]).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "services" ? "Service Pricing" : t === "ai-models" ? "AI Model Costs" : t === "revenue" ? "Revenue Simulator" : "Global Settings"}
            </Button>
          ))}
        </div>

        {tab === "services" && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>All ({services.length})</Button>
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] || Settings;
                const count = services.filter(s => s.category === cat).length;
                return (
                  <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>
                    <Icon className={`h-3 w-3 mr-1 ${CATEGORY_COLORS[cat] || ""}`} />{cat} ({count})
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3">
              {filtered.map(svc => {
                const Icon = CATEGORY_ICONS[svc.category] || Settings;
                const isEditing = editingId === svc.id;
                return (
                  <div key={svc.id} className={`border rounded-lg p-4 ${svc.enabled ? "border-border bg-card" : "border-border/50 bg-card/50 opacity-60"}`}>
                    <div className="flex items-center gap-4">
                      <Icon className={`h-5 w-5 ${CATEGORY_COLORS[svc.category] || "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{svc.displayName}</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{svc.pricingModel}</span>
                          <span className="text-xs text-muted-foreground">/{svc.unit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">Base:</div>
                          <Input type="number" className="w-24 h-7 text-xs" value={editValues.basePriceMicroUsd ?? svc.basePriceMicroUsd}
                            onChange={e => setEditValues({ ...editValues, basePriceMicroUsd: Number(e.target.value) })} />
                          <div className="text-xs text-muted-foreground">Margin %:</div>
                          <Input type="number" className="w-16 h-7 text-xs" value={editValues.marginPercent ?? svc.marginPercent}
                            onChange={e => setEditValues({ ...editValues, marginPercent: Number(e.target.value) })} />
                          <Button size="sm" variant="ghost" onClick={() => { updateService(svc.id, editValues); }}><Save className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Cost</div>
                            <div className="text-sm font-mono">{formatPrice(svc.basePriceMicroUsd)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Margin</div>
                            <div className="text-sm font-mono text-green-400">{svc.marginPercent}%</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Sell Price</div>
                            <div className="text-sm font-bold font-mono text-blue-400">{formatPrice(svc.finalPriceMicroUsd)}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(svc.id); setEditValues({}); }}><Edit3 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleService(svc.id, !svc.enabled)}>
                            {svc.enabled ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "revenue" && (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Users</label>
                <Input type="number" value={simParams.users} onChange={e => setSimParams({ ...simParams, users: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Conversion %</label>
                <Input type="number" value={simParams.conversionRate} onChange={e => setSimParams({ ...simParams, conversionRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ARPU ($)</label>
                <Input type="number" value={simParams.arpu} onChange={e => setSimParams({ ...simParams, arpu: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Churn %</label>
                <Input type="number" value={simParams.churn} onChange={e => setSimParams({ ...simParams, churn: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Months</label>
                <Input type="number" value={simParams.months} onChange={e => setSimParams({ ...simParams, months: Number(e.target.value) })} />
              </div>
            </div>

            {projection.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="text-sm text-muted-foreground">Final MRR</div>
                    <div className="text-3xl font-bold text-green-400">${projection[projection.length - 1].mrr.toLocaleString()}</div>
                  </div>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="text-sm text-muted-foreground">Final ARR</div>
                    <div className="text-3xl font-bold text-blue-400">${projection[projection.length - 1].arr.toLocaleString()}</div>
                  </div>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="text-sm text-muted-foreground">Cumulative Revenue</div>
                    <div className="text-3xl font-bold text-purple-400">${projection[projection.length - 1].cumulativeRevenue.toLocaleString()}</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-card overflow-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Month</th>
                      <th className="text-right py-2 text-muted-foreground">Users</th>
                      <th className="text-right py-2 text-muted-foreground">Paid</th>
                      <th className="text-right py-2 text-muted-foreground">MRR</th>
                      <th className="text-right py-2 text-muted-foreground">ARR</th>
                      <th className="text-right py-2 text-muted-foreground">Cumulative</th>
                    </tr></thead>
                    <tbody>
                      {projection.map(p => (
                        <tr key={p.month} className="border-b border-border/50">
                          <td className="py-2">{p.month}</td>
                          <td className="text-right">{p.totalUsers.toLocaleString()}</td>
                          <td className="text-right text-green-400">{p.paidUsers.toLocaleString()}</td>
                          <td className="text-right font-mono">${p.mrr.toLocaleString()}</td>
                          <td className="text-right font-mono text-blue-400">${p.arr.toLocaleString()}</td>
                          <td className="text-right font-mono text-purple-400">${p.cumulativeRevenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "global" && (
          <div className="space-y-6">
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Percent className="h-4 w-4" />Global Margin</h3>
              <div className="flex items-center gap-4">
                <Input type="number" className="w-32" value={globalMargin} onChange={e => setGlobalMargin(Number(e.target.value))} />
                <span className="text-muted-foreground">%</span>
                <Button onClick={() => updateGlobalMargin(globalMargin, false)}>Update Default</Button>
                <Button variant="destructive" onClick={() => updateGlobalMargin(globalMargin, true)}>Apply to ALL Services</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This margin is applied as default for new services. "Apply to ALL" overwrites per-service margins.</p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4" />Currency Markup</h3>
              <div className="grid grid-cols-4 gap-4">
                {[{ code: "EUR", symbol: "€" }, { code: "GBP", symbol: "£" }, { code: "ILS", symbol: "₪" }, { code: "JPY", symbol: "¥" }].map(c => (
                  <div key={c.code} className="border rounded-lg p-3">
                    <div className="text-sm font-medium">{c.symbol} {c.code}</div>
                    <div className="text-xs text-muted-foreground mt-1">Markup applied on top of USD pricing</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4">Payment Methods Supported</h3>
              <div className="flex flex-wrap gap-2">
                {["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Google Pay", "Bank Transfer", "Wire Transfer", "Crypto (BTC/ETH)", "Invoice (NET 30)", "Alipay", "WeChat Pay"].map(m => (
                  <span key={m} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs border border-green-500/20">{m}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ai-models" && (
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu className="h-4 w-4" />AI Model Pricing Control</h3>
            <p className="text-sm text-muted-foreground mb-4">Set per-model pricing margins. Each AI model's cost to end-users = your cost + margin %.</p>
            <div className="text-sm text-muted-foreground">Go to <Link href="/model-connector" className="text-blue-400 hover:underline">Model Connector</Link> to manage connected providers and per-model pricing.</div>
          </div>
        )}
      </div>
    </div>
  );
}
