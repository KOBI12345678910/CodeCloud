import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSession, useUser } from "@clerk/react";
import { Code2, Check, ArrowRight, Lock, Shield, Cloud, ChevronDown, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanFromApi {
  id: "free" | "pro" | "team";
  name: string;
  priceUsd: number;
  description: string;
  includedCreditsUsd: number;
  features: string[];
  stripeConfigured: boolean;
}

interface CurrentSub {
  plan: "free" | "pro" | "team";
  subscription: { status: string; planId: string } | null;
}

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

const FALLBACK_PLANS: PlanFromApi[] = [
  { id: "free", name: "Free", priceUsd: 0, description: "For individuals learning and experimenting.", includedCreditsUsd: 0, stripeConfigured: true, features: ["1 active project", "512 MB storage", "Shared compute", "5 deployments / month", "Community support"] },
  { id: "pro", name: "Pro", priceUsd: 20, description: "For professionals shipping production apps.", includedCreditsUsd: 10, stripeConfigured: false, features: ["Unlimited projects", "2 GB storage", "2 vCPU / 4 GB compute", "Unlimited deployments", "$10 of AI credits included monthly", "Custom domains, private projects", "Priority email support"] },
  { id: "team", name: "Team", priceUsd: 40, description: "For teams building together at scale.", includedCreditsUsd: 25, stripeConfigured: false, features: ["Everything in Pro", "5 GB storage", "4 vCPU / 8 GB compute", "Unlimited collaborators", "$25 of AI credits included monthly", "Audit logs", "Priority chat support"] },
];

const FAQS = [
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade, downgrade, or cancel anytime from the billing page. Changes are prorated." },
  { q: "What happens if I run out of AI credits?", a: "Tasks pause until you top up. You can also enable auto-top-up so your balance refills automatically." },
  { q: "Are AI credits included with paid plans?", a: "Yes. Pro includes $10 of credits per month and Team includes $25. You can buy more anytime as pay-as-you-go." },
  { q: "Do you offer refunds?", a: "We refund unused subscription time on cancellation. Pay-as-you-go credits are non-refundable once purchased." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe. Wire transfer is available for Team plans on request." },
];

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors">
        <span className="font-semibold text-sm pr-4">{faq.q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-40" : "max-h-0"}`}>
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { session } = useSession();
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<PlanFromApi[]>(FALLBACK_PLANS);
  const [current, setCurrent] = useState<CurrentSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "cancelled") {
      setCancelled(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    }
    fetch(`${API}/billing/plans`).then((r) => r.json()).then((d) => { if (d?.plans?.length) setPlans(d.plans); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn || !session) return;
    (async () => {
      try {
        const t = await session.getToken();
        const r = await fetch(`${API}/billing/subscription`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
        if (r.ok) setCurrent(await r.json());
      } catch { /* ignore */ }
    })();
  }, [isSignedIn, session]);

  const subscribe = async (planId: "pro" | "team") => {
    setError(null);
    if (!isSignedIn) { setLocation(`/sign-in?redirect=/pricing`); return; }
    setBusy(planId);
    try {
      const t = await session?.getToken();
      const r = await fetch(`${API}/billing/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Could not start checkout.");
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscription failed.");
    } finally { setBusy(null); }
  };

  const ctaFor = (plan: PlanFromApi) => {
    if (plan.id === "free") {
      return { label: isSignedIn ? "You're on Free" : "Get started free", disabled: false, action: () => setLocation(isSignedIn ? "/dashboard" : "/sign-up") };
    }
    if (current?.plan === plan.id) return { label: "Current plan", disabled: true, action: () => {} };
    if (!plan.stripeConfigured) return { label: "Coming soon", disabled: true, action: () => {} };
    return { label: busy === plan.id ? "Redirecting…" : `Upgrade to ${plan.name}`, disabled: busy !== null, action: () => void subscribe(plan.id as "pro" | "team") };
  };

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Code2 className="w-5 h-5 text-primary-foreground" /></div>
              <span className="text-xl font-bold tracking-tight">CodeCloud</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link href="/billing"><Button variant="ghost" size="sm">Billing</Button></Link>
            ) : (
              <>
                <Link href="/sign-in"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/sign-up"><Button size="sm">Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, fair pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you ship more. Cancel anytime.</p>
          </div>

          {(error || cancelled) && (
            <div className="max-w-3xl mx-auto mt-8 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>{error ?? "Checkout cancelled. No charge was made."}</span>
            </div>
          )}
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const cta = ctaFor(plan);
              const highlight = plan.id === "pro";
              return (
                <div
                  key={plan.id}
                  className={`relative p-7 rounded-2xl border flex flex-col ${
                    highlight ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 lg:scale-[1.03]" : "border-border/50 bg-card"
                  }`}
                  data-testid={`plan-${plan.id}`}
                >
                  {highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-5xl font-bold">${plan.priceUsd}</span>
                    <span className="text-muted-foreground text-sm">{plan.priceUsd === 0 ? "/forever" : "/mo"}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  {plan.includedCreditsUsd > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full self-start">
                      <Sparkles className="w-3 h-3" /> ${plan.includedCreditsUsd} of AI credits / month included
                    </div>
                  )}
                  <Button
                    onClick={cta.action}
                    disabled={cta.disabled}
                    className="w-full mt-6 h-11"
                    variant={highlight ? "default" : "outline"}
                    data-testid={`cta-${plan.id}`}
                  >
                    {cta.label}{highlight && !cta.disabled && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>
                  <ul className="mt-7 pt-6 border-t border-border/30 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="max-w-2xl mx-auto text-center text-xs text-muted-foreground mt-8">
            Need something custom — SSO, dedicated infrastructure, or invoicing?{" "}
            <Link href="/support" className="text-primary hover:underline">Talk to us</Link>.
          </p>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq) => <FaqItem key={faq.q} faq={faq} />)}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <span>&copy; {new Date().getFullYear()} CodeCloud. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
            <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> Reliable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
