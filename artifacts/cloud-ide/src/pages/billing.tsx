import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useSession } from "@clerk/react";
import { ArrowLeft, CreditCard, Download, AlertTriangle, Plus, Settings, TrendingUp, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BalanceData {
  balanceUsd: number; balanceMicroUsd: number; tier: string;
  entitlements: { includedCreditsMicroUsd: number; maxConcurrentTasks: number; allowedModels: string[]; supportLevel: string };
  autoTopup: { enabled: number; thresholdMicroUsd: number; topupAmountMicroUsd: number; lowBalanceWarnMicroUsd: number; stripePaymentMethodId: string | null } | null;
  monthlyBurn: { month: string; debitedUsd: number; refundedUsd: number }[];
  lowBalance: boolean;
}

interface LedgerEntry { id: string; kind: string; amountUsd: number; description: string | null; createdAt: string; }
interface InvoiceRow { id: string; number: string; status: string; totalUsd: number; issuedAt: string; pdfUrl: string; description: string | null; hostedUrl: string | null; }
interface SubscriptionInfo {
  plan: "free" | "pro" | "team";
  subscription: {
    status: string;
    planId: string;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: string | null;
  } | null;
}
const PLAN_PRICE_USD: Record<string, number> = { free: 0, pro: 20, team: 40 };

const KIND_LABELS: Record<string, string> = {
  topup: "Top-up",
  subscription_grant: "Subscription credits",
  promo_grant: "Promo credits",
  admin_grant: "Admin grant",
  task_debit: "Task usage",
  task_refund: "Auto-refund",
  stripe_refund: "Stripe refund",
  adjustment: "Adjustment",
};

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

export default function BillingDashboard() {
  const { session } = useSession();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [topupAmount, setTopupAmount] = useState("20");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const authedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await session?.getToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
    const res = await fetch(`${API}${path}`, { ...init, headers });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    return res.json();
  }, [session]);

  const refresh = useCallback(async () => {
    try {
      const [b, l, inv, s] = await Promise.all([
        authedFetch("/credits/balance"),
        authedFetch("/credits/ledger?limit=50"),
        authedFetch("/billing/invoices"),
        authedFetch("/billing/subscription").catch(() => null),
      ]);
      setBalance(b); setLedger(l.entries || []); setInvoices(inv); setSub(s);
    } catch { /* */ } finally { setLoading(false); }
  }, [authedFetch]);

  useEffect(() => { void refresh(); }, [refresh]);

  const [checkoutBanner, setCheckoutBanner] = useState<{ kind: "success" | "cancelled"; sessionId?: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripe = params.get("stripe");
    if (stripe === "success") {
      setCheckoutBanner({ kind: "success", sessionId: params.get("session_id") || undefined });
      const t = setTimeout(() => { void refresh(); }, 1500);
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
      return () => clearTimeout(t);
    }
    if (stripe === "cancelled") {
      setCheckoutBanner({ kind: "cancelled" });
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    }
    return undefined;
  }, [refresh]);

  const topup = useCallback(async () => {
    setBusy("topup");
    try {
      const amt = Math.max(5, Number(topupAmount) || 20);
      const out = await authedFetch("/credits/checkout", { method: "POST", body: JSON.stringify({ amountUsd: amt }) });
      if (out.checkoutUrl) {
        window.location.href = out.checkoutUrl;
      } else {
        await refresh();
      }
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }, [authedFetch, topupAmount, refresh]);

  const openPortal = useCallback(async () => {
    setBusy("portal");
    try {
      const out = await authedFetch("/billing/portal", { method: "POST" });
      if (out.url) window.location.href = out.url;
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }, [authedFetch]);

  const subscribe = useCallback(async (plan: "pro" | "team") => {
    setBusy(`subscribe-${plan}`);
    try {
      const out = await authedFetch("/billing/subscribe", { method: "POST", body: JSON.stringify({ plan }) });
      if (out.checkoutUrl) window.location.href = out.checkoutUrl;
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }, [authedFetch]);

  const saveAutoTopup = useCallback(async (patch: { enabled?: boolean; thresholdUsd?: number; topupAmountUsd?: number; lowBalanceWarnUsd?: number }) => {
    setBusy("autotopup");
    try { await authedFetch("/credits/auto-topup", { method: "PUT", body: JSON.stringify(patch) }); await refresh(); }
    finally { setBusy(null); }
  }, [authedFetch, refresh]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const burn = balance?.monthlyBurn ?? [];
  const maxBurn = Math.max(0.01, ...burn.map((b) => b.debitedUsd));

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/dashboard"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <CreditCard className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Billing & Credits</h1>
        <Link href="/tasks" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Tasks</Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {checkoutBanner?.kind === "success" && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <div className="flex-1 text-sm">
              <div className="font-medium text-emerald-600 dark:text-emerald-400">Payment received</div>
              <div className="text-muted-foreground">Your credits will appear in your balance momentarily.</div>
            </div>
            <button onClick={() => setCheckoutBanner(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}
        {checkoutBanner?.kind === "cancelled" && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <div className="font-medium">Checkout cancelled</div>
              <div className="text-muted-foreground">No charge was made. You can try again whenever you&apos;re ready.</div>
            </div>
            <button onClick={() => setCheckoutBanner(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subscription</div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold capitalize">{sub?.plan ?? "free"}</span>
                <span className="text-sm text-muted-foreground">
                  {sub?.plan === "free"
                    ? "Free forever"
                    : `$${PLAN_PRICE_USD[sub?.plan ?? "free"] ?? 0}/mo`}
                </span>
                {sub?.subscription?.status && sub.subscription.status !== "active" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 capitalize">
                    {sub.subscription.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {sub?.subscription?.currentPeriodEnd && (
                <div className="text-xs text-muted-foreground mt-1">
                  Renews on {new Date(sub.subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(!sub || sub.plan === "free") && (
                <>
                  <Button size="sm" onClick={() => void subscribe("pro")} disabled={busy?.startsWith("subscribe")}>
                    Upgrade to Pro · $20/mo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void subscribe("team")} disabled={busy?.startsWith("subscribe")}>
                    Team · $40/mo
                  </Button>
                </>
              )}
              {sub?.plan === "pro" && (
                <Button size="sm" onClick={() => void subscribe("team")} disabled={busy?.startsWith("subscribe")}>
                  Upgrade to Team · $40/mo
                </Button>
              )}
              {sub?.subscription?.stripeCustomerId && (
                <Button size="sm" variant="outline" onClick={() => void openPortal()} disabled={busy === "portal"}>
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  {busy === "portal" ? "Opening…" : "Manage subscription"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {balance?.lowBalance && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm flex-1">Your credit balance is low. Top up to keep tasks running.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Credit balance</div>
            <div className="text-4xl font-bold">${(balance?.balanceUsd ?? 0).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Tier: <span className="font-medium uppercase">{balance?.tier}</span> · {balance?.entitlements.maxConcurrentTasks} concurrent tasks · models: {balance?.entitlements.allowedModels.join(", ")}</div>
            <div className="mt-4 flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="bg-background border border-border rounded pl-6 pr-3 py-1.5 text-sm w-28" />
              </div>
              <Button size="sm" onClick={() => void topup()} disabled={busy === "topup"}><Plus className="w-3.5 h-3.5 mr-1" /> Top up</Button>
              <Link href="/pricing"><Button size="sm" variant="outline"><Sparkles className="w-3.5 h-3.5 mr-1" /> Change plan</Button></Link>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"><Settings className="w-3 h-3" /> Auto top-up</div>
            <label className="flex items-center justify-between text-sm mb-2">
              <span>Enabled</span>
              <input type="checkbox" checked={!!balance?.autoTopup?.enabled} onChange={(e) => void saveAutoTopup({ enabled: e.target.checked })} />
            </label>
            <label className="block text-xs mb-1">Floor (refill below)</label>
            <input type="number" defaultValue={(Number(balance?.autoTopup?.thresholdMicroUsd ?? 2_000_000) / 1_000_000).toFixed(2)}
              onBlur={(e) => void saveAutoTopup({ thresholdUsd: Number(e.target.value) })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-sm mb-2" />
            <label className="block text-xs mb-1">Refill amount</label>
            <input type="number" defaultValue={(Number(balance?.autoTopup?.topupAmountMicroUsd ?? 20_000_000) / 1_000_000).toFixed(2)}
              onBlur={(e) => void saveAutoTopup({ topupAmountUsd: Number(e.target.value) })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-sm mb-2" />
            <label className="block text-xs mb-1">Low-balance warning at</label>
            <input type="number" defaultValue={(Number(balance?.autoTopup?.lowBalanceWarnMicroUsd ?? 5_000_000) / 1_000_000).toFixed(2)}
              onBlur={(e) => void saveAutoTopup({ lowBalanceWarnUsd: Number(e.target.value) })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-sm" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Monthly burn</div>
          {burn.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No usage yet</div>
          ) : (
            <div className="grid grid-cols-6 gap-2 items-end h-32">
              {burn.map((b) => (
                <div key={b.month} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-mono text-muted-foreground">${b.debitedUsd.toFixed(2)}</div>
                  <div className="w-full bg-muted rounded-t relative" style={{ height: `${Math.max(2, (b.debitedUsd / maxBurn) * 100)}%` }}>
                    <div className="absolute inset-0 bg-primary/70 rounded-t" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{b.month.slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3">Recent ledger activity</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No ledger entries yet.</p>
          ) : (
            <div className="space-y-1">
              {ledger.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 text-sm">
                  <div>
                    <div className="font-medium">{KIND_LABELS[e.kind] ?? e.kind}</div>
                    <div className="text-xs text-muted-foreground">{e.description ?? ""} · {new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono ${e.amountUsd >= 0 ? "text-green-500" : "text-foreground"}`}>{e.amountUsd >= 0 ? "+" : ""}${e.amountUsd.toFixed(4)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{inv.number}</div>
                    <div className="text-xs text-muted-foreground">{inv.description ?? "Invoice"} · {new Date(inv.issuedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}>{inv.status}</span>
                    <span className="font-mono text-sm">${inv.totalUsd.toFixed(2)}</span>
                    <a href={`${API}${inv.pdfUrl.replace(/^\/api/, "")}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
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
