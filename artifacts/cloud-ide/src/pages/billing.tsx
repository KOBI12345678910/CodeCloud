import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useGetProfile } from "@workspace/api-client-react";
import {
  ArrowLeft, CreditCard, Download, ExternalLink, AlertTriangle,
  Cpu, Brain, Globe, HardDrive, Zap, Server, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingSummary {
  plan: any;
  interval: string;
  status: string;
  currentPeriod: { start: string; end: string };
  baseCost: number;
  meteredUsage: {
    type: string; name: string; used: number; included: number;
    overage: number; cost: number; unit: string;
  }[];
  totalEstimatedCost: number;
  invoiceHistory: any[];
  paymentMethod: any;
  nextInvoiceDate: string | null;
}

export default function BillingDashboard() {
  const { user } = useUser();
  const { data: profile } = useGetProfile();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/billing/summary`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const METER_ICONS: Record<string, any> = {
    compute: Cpu, ai_tokens: Brain, bandwidth: Globe,
    storage_overage: HardDrive, always_on: Server, gpu_compute: Zap,
  };

  const UsageBar = ({ used, included }: { used: number; included: number; overage: number }) => {
    const pct = included === Infinity ? 0 : Math.min((used / (included || 1)) * 100, 150);
    const color = pct > 100 ? "bg-destructive" : pct > 80 ? "bg-yellow-500" : "bg-primary";
    return (
      <div className="w-full h-2 bg-muted rounded-full overflow-visible relative">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        {included !== Infinity && (
          <div className="absolute top-0 bottom-0 w-px bg-muted-foreground" style={{ left: `${Math.min(100, (included / Math.max(used, included)) * 100)}%` }} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/settings"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <CreditCard className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Billing & Usage</h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{summary?.plan?.name || "Free"} Plan</h2>
              <p className="text-sm text-muted-foreground">
                {summary?.status === "active" ? "Active" : summary?.status}
                {summary?.currentPeriod.end && ` · Renews ${new Date(summary.currentPeriod.end).toLocaleDateString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                ${summary?.totalEstimatedCost.toFixed(2) || "0.00"}
                <span className="text-sm text-muted-foreground font-normal">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground">estimated this month</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button size="sm">
                {(profile?.plan || "free") === "free" ? "Upgrade" : "Change Plan"}
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Current Period Cost Breakdown</h2>

          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Base subscription ({summary?.plan?.name})</span>
              <span className="text-sm font-medium">${summary?.baseCost.toFixed(2)}</span>
            </div>

            {summary?.meteredUsage.filter((m) => m.cost > 0).map((meter) => (
              <div key={meter.type} className="flex items-center justify-between py-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground">{meter.name} overage ({meter.overage.toFixed(1)} {meter.unit})</span>
                <span className="text-sm font-medium text-yellow-500">${meter.cost.toFixed(2)}</span>
              </div>
            ))}

            <div className="flex items-center justify-between py-3 border-t-2 border-border">
              <span className="text-sm font-bold">Estimated Total</span>
              <span className="text-lg font-bold">${summary?.totalEstimatedCost.toFixed(2)}</span>
            </div>
          </div>

          {summary?.nextInvoiceDate && (
            <p className="text-xs text-muted-foreground">Next invoice: {new Date(summary.nextInvoiceDate).toLocaleDateString()}</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Usage This Month</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary?.meteredUsage.map((meter) => {
              const Icon = METER_ICONS[meter.type] || Cpu;
              const isOverLimit = meter.used > meter.included && meter.included !== Infinity;
              return (
                <div key={meter.type} className={`rounded-xl p-4 ${isOverLimit ? "bg-yellow-500/5 border border-yellow-500/20" : "bg-muted/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isOverLimit ? "text-yellow-500" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">{meter.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono">{meter.used.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground"> / {meter.included === Infinity ? "\u221e" : meter.included} {meter.unit}</span>
                    </div>
                  </div>
                  <UsageBar used={meter.used} included={meter.included} overage={meter.overage} />
                  {isOverLimit && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-yellow-500">
                      <AlertTriangle className="w-3 h-3" />
                      Overage: {meter.overage.toFixed(1)} {meter.unit} (+${meter.cost.toFixed(2)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {summary?.paymentMethod && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Payment Method</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-9 bg-muted rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm capitalize">{summary.paymentMethod.brand} **** {summary.paymentMethod.last4}</p>
                <p className="text-xs text-muted-foreground">Expires {summary.paymentMethod.expMonth}/{summary.paymentMethod.expYear}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Invoice History</h2>

          {(!summary?.invoiceHistory || summary.invoiceHistory.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
          ) : (
            <div className="space-y-2">
              {summary.invoiceHistory.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{inv.number || "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">{inv.date ? new Date(inv.date).toLocaleDateString() : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${inv.status === "paid" ? "text-green-500" : inv.status === "open" ? "text-yellow-500" : "text-muted-foreground"}`}>
                      ${inv.amount.toFixed(2)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      inv.status === "paid" ? "bg-green-500/10 text-green-500" : inv.status === "open" ? "bg-yellow-500/10 text-yellow-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {inv.status}
                    </span>
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded transition">
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {inv.hostedUrl && (
                      <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded transition">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
