import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ShoppingCart, Globe, Cloud, Database, Mail, Shield, Zap,
  Layers, CreditCard, Server, Wifi, HardDrive, Lock, Headphones,
  Plus, Minus, Check, AlertTriangle, BarChart3, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

interface ServiceItem {
  id: string;
  category: string;
  displayName: string;
  description: string;
  pricingModel: string;
  finalPriceMicroUsd: number;
  unit: string;
  enabled: boolean;
  metadata: Record<string, any>;
}

interface ActiveSubscription {
  id: string;
  serviceName: string;
  category: string;
  status: string;
  priceMicroUsd: number;
  billingCycle: string;
  currentPeriodEnd: string;
}

interface SpendingSummary {
  subscriptionsUsd: number;
  usageUsd: number;
  totalUsd: number;
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; description: string }> = {
  subscription: { icon: Layers, color: "text-blue-400", description: "Platform plans & tiers" },
  ai: { icon: Zap, color: "text-purple-400", description: "AI models, tokens & generation" },
  domains: { icon: Globe, color: "text-green-400", description: "Domain registration, transfer & SSL" },
  cloud: { icon: Cloud, color: "text-cyan-400", description: "Compute, storage, bandwidth & CDN" },
  database: { icon: Database, color: "text-orange-400", description: "Managed databases" },
  email: { icon: Mail, color: "text-pink-400", description: "Email sending & professional email" },
  security: { icon: Shield, color: "text-red-400", description: "WAF, monitoring, compliance" },
  support: { icon: Headphones, color: "text-yellow-400", description: "Priority & dedicated support" },
};

type Tab = "marketplace" | "my-services" | "usage" | "invoices";

export default function ServiceMarketplacePage() {
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("marketplace");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [spending, setSpending] = useState<SpendingSummary>({ subscriptionsUsd: 0, usageUsd: 0, totalUsd: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<{ serviceId: string; quantity: number }[]>([]);

  useEffect(() => {
    fetchServices();
    fetchMyServices();
  }, []);

  const fetchServices = async () => {
    try {
      const r = await fetch(`${apiUrl}/catalog/services`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const data = await r.json(); setServices(data.services); }
    } catch { }
  };

  const fetchMyServices = async () => {
    try {
      const r = await fetch(`${apiUrl}/billing/services`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setSubscriptions(data.subscriptions);
        setSpending(data.spending);
      }
    } catch { }
  };

  const subscribe = async (serviceId: string) => {
    await fetch(`${apiUrl}/billing/services/subscribe`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, billingCycle: "monthly" }),
    });
    fetchMyServices();
  };

  const cancelSubscription = async (id: string) => {
    await fetch(`${apiUrl}/billing/services/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchMyServices();
  };

  const formatPrice = (microUsd: number) => {
    const usd = microUsd / 1_000_000;
    if (usd === 0) return "Free";
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
    if (usd >= 1) return `$${usd.toFixed(2)}`;
    return `$${usd.toFixed(4)}`;
  };

  const categories = [...new Set(services.map(s => s.category))];
  const filtered = selectedCategory === "all" ? services : services.filter(s => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background" data-testid="service-marketplace-page">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/billing"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-blue-400" />Service Marketplace</h1>
            <p className="text-sm text-muted-foreground">Subscribe to individual services — pay only for what you use</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Monthly Spend</div>
              <div className="text-xl font-bold text-green-400">${spending.totalUsd.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Active Services</div>
              <div className="text-xl font-bold text-blue-400">{subscriptions.filter(s => s.status === "active").length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {(["marketplace", "my-services", "usage", "invoices"] as Tab[]).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "marketplace" ? "🛍️ Marketplace" : t === "my-services" ? "📦 My Services" : t === "usage" ? "📊 Usage" : "📄 Invoices"}
            </Button>
          ))}
        </div>

        {tab === "marketplace" && (
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>All</Button>
              {categories.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg?.icon || Layers;
                return (
                  <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>
                    <Icon className={`h-3 w-3 mr-1 ${cfg?.color || ""}`} />{cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(svc => {
                const cfg = CATEGORY_CONFIG[svc.category];
                const Icon = cfg?.icon || Layers;
                const isSubscribed = subscriptions.some(s => s.serviceName === svc.displayName && s.status === "active");
                return (
                  <div key={svc.id} className="border rounded-xl p-5 bg-card hover:border-blue-500/50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-muted ${cfg?.color || ""}`}><Icon className="h-5 w-5" /></div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{svc.displayName}</h3>
                        <p className="text-xs text-muted-foreground">{svc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <div className="text-2xl font-bold">{formatPrice(svc.finalPriceMicroUsd)}</div>
                        <div className="text-xs text-muted-foreground">per {svc.unit}</div>
                      </div>
                      {isSubscribed ? (
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs flex items-center gap-1"><Check className="h-3 w-3" />Active</span>
                      ) : (
                        <Button size="sm" onClick={() => subscribe(svc.id)}>
                          <Plus className="h-3 w-3 mr-1" />Subscribe
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{svc.pricingModel}</span>
                      {svc.metadata?.freeBasicIncluded && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">Free tier included</span>}
                      {svc.metadata?.freeMonthly && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">{svc.metadata.freeMonthly} free/mo</span>}
                      {svc.metadata?.freeGbIncluded && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">{svc.metadata.freeGbIncluded}GB free</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "my-services" && (
          <div className="space-y-3">
            {subscriptions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active services. Browse the marketplace to get started.</p>
              </div>
            ) : (
              subscriptions.map(sub => (
                <div key={sub.id} className="border rounded-lg p-4 bg-card flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-muted ${CATEGORY_CONFIG[sub.category]?.color || ""}`}>
                    {(() => { const Icon = CATEGORY_CONFIG[sub.category]?.icon || Layers; return <Icon className="h-4 w-4" />; })()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{sub.serviceName}</div>
                    <div className="text-xs text-muted-foreground">{sub.billingCycle} • Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${sub.status === "active" ? "bg-green-500/10 text-green-400" : sub.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {sub.status}
                  </span>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(sub.priceMicroUsd)}</div>
                    <div className="text-xs text-muted-foreground">/{sub.billingCycle === "monthly" ? "mo" : "yr"}</div>
                  </div>
                  {sub.status === "active" && (
                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => cancelSubscription(sub.id)}>Cancel</Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "usage" && (
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4" />Usage Breakdown</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">Subscriptions</div>
                <div className="text-2xl font-bold text-blue-400">${spending.subscriptionsUsd.toFixed(2)}</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">Usage-based</div>
                <div className="text-2xl font-bold text-purple-400">${spending.usageUsd.toFixed(2)}</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold text-green-400">${spending.totalUsd.toFixed(2)}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Detailed usage analytics are available after your first billing cycle.</p>
          </div>
        )}

        {tab === "invoices" && (
          <div className="border rounded-lg p-6 bg-card text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet. Invoices are generated at the end of each billing cycle.</p>
            <Button className="mt-4" variant="outline" onClick={async () => {
              await fetch(`${apiUrl}/billing/invoices/generate`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({}) });
              fetchMyServices();
            }}>Generate Invoice</Button>
          </div>
        )}
      </div>
    </div>
  );
}
