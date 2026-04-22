import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSession, useUser } from "@clerk/react";
import { Code2, Check, ArrowRight, Lock, Shield, Cloud, ChevronDown, Sparkles, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

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

const DISPLAY_PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    priceMonthly: 0,
    priceAnnual: 0,
    period: "forever",
    desc: "For exploring what's possible",
    features: [
      "Free daily Agent credits",
      "Free credits for AI integrations",
      "Publish 1 app",
      "Limited Agent intelligence",
    ],
    cta: "Sign up",
    highlight: false,
    apiId: "free" as const,
  },
  {
    id: "core" as const,
    name: "Core",
    priceMonthly: 20,
    priceAnnual: 18,
    period: "/month",
    desc: "For personal projects & simple apps",
    badge: "10% off",
    features: [
      "$20 of monthly credits",
      "Includes up to 5 collaborators",
      "Unlimited workspaces",
      "Autonomous long builds",
      'Remove "Made with CodeCloud" badge',
    ],
    cta: "Join Core",
    highlight: false,
    apiId: "pro" as const,
    subscribeId: "pro" as const,
  },
  {
    id: "pro" as const,
    name: "Pro",
    priceMonthly: 100,
    priceAnnual: 90,
    period: "/month",
    desc: "For commercial and professional apps",
    badge: "Save 10%",
    features: [
      "Everything in Core",
      "$100 monthly credits",
      "Includes up to 15 collaborators",
      "Includes up to 50 viewers",
      "Access to the most powerful models",
      "Private deployments",
      "Database restore up to 28 days",
      "Premium support",
      "Exclusive community",
    ],
    cta: "Join Pro",
    highlight: true,
    apiId: "pro" as const,
    subscribeId: "pro" as const,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    priceMonthly: -1,
    priceAnnual: -1,
    period: "",
    desc: "For enterprise-grade security & controls",
    features: [
      "Everything in Pro",
      "Custom seat limits",
      "SSO / SAML",
      "Advanced privacy controls",
      "Design system support",
      "Data warehouse connections",
      "Custom groups",
      "Dedicated support",
      "Single-tenant environments",
      "Region selection",
      "Static outbound IPs",
      "VPC peering",
    ],
    cta: "Contact us",
    highlight: false,
    apiId: "team" as const,
    subscribeId: "team" as const,
  },
];

const FAQS = [
  { q: "What are all the features included in these plans?", a: "Each plan builds on the one before it. Starter gets you started with basic features. Core unlocks unlimited workspaces and 5 collaborators. Pro adds powerful AI, 15 collaborators, private deploys, and premium support. Enterprise adds SSO, SAML, dedicated infra, and custom controls." },
  { q: "Can I switch plans at any time?", a: "Yes. Upgrade, downgrade, or cancel anytime from the billing page. Changes are prorated." },
  { q: "What happens if I run out of credits?", a: "Tasks pause until you top up. You can enable auto-top-up so your balance refills automatically." },
  { q: "Are AI credits included with paid plans?", a: "Yes. Core includes $20 of credits, Pro includes $100. You can buy more anytime as pay-as-you-go." },
  { q: "Do you offer refunds?", a: "We refund unused subscription time on cancellation. Pay-as-you-go credits are non-refundable once purchased." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe. Wire transfer is available for Enterprise plans on request." },
];

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left hover:text-foreground transition-colors">
        <span className="font-medium text-base pr-4">{faq.q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { session } = useSession();
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState<CurrentSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "cancelled") {
      setCancelled(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    }
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

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <MarketingHeader />

      <main>
        <section className="pt-20 pb-8 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">Choose the best plan for you.</p>
          </div>

          {(error || cancelled) && (
            <div className="max-w-3xl mx-auto mt-8 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>{error ?? "Checkout cancelled. No charge was made."}</span>
            </div>
          )}
        </section>

        <section className="px-6 pb-6">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${!annual ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${annual ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Yearly
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-semibold">Up to 10% off</span>
            </button>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {DISPLAY_PLANS.map((plan) => {
              const isEnterprise = plan.id === "enterprise";
              const price = isEnterprise ? "Custom" : annual ? `$${plan.priceAnnual}` : `$${plan.priceMonthly}`;
              const isCurrent = plan.id === "starter" && current?.plan === "free"
                || plan.id === "pro" && current?.plan === "pro"
                || plan.id === "enterprise" && current?.plan === "team";

              return (
                <div
                  key={plan.id}
                  className={`relative p-7 rounded-2xl border flex flex-col transition-all duration-300 ${
                    plan.highlight
                      ? "border-primary/60 bg-gradient-to-b from-primary/10 to-transparent shadow-2xl shadow-primary/20"
                      : "border-border/50 bg-card/60 hover:border-primary/30"
                  }`}
                  data-testid={`plan-${plan.id}`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.badge && annual && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-semibold">{plan.badge}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    {!isEnterprise && plan.priceMonthly > 0 && annual && (
                      <span className="text-lg text-muted-foreground/50 line-through mr-1">${plan.priceMonthly}</span>
                    )}
                    <span className="text-3xl font-bold">
                      {plan.period === "forever" ? "Free" : price}
                    </span>
                    {plan.period && plan.period !== "forever" && (
                      <span className="text-muted-foreground text-sm">
                        per month{annual && !isEnterprise ? "\nbilled annually" : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">{plan.desc}</p>

                  {plan.id === "pro" && (
                    <div className="mt-3 flex items-center">
                      <select className="bg-card border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground">
                        <option>$100 credits</option>
                        <option>$200 credits</option>
                        <option>$500 credits</option>
                      </select>
                      {annual && <span className="ml-2 text-xs text-primary font-medium">Save $10</span>}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      if (isEnterprise) { setLocation("/contact"); return; }
                      if (plan.id === "starter") { setLocation(isSignedIn ? "/dashboard" : "/sign-up"); return; }
                      subscribe(plan.apiId);
                    }}
                    disabled={isCurrent || busy !== null}
                    className={`w-full mt-5 h-11 ${plan.highlight ? "shadow-lg shadow-primary/20" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    data-testid={`cta-${plan.id}`}
                  >
                    {isCurrent ? "Current plan" : plan.cta}
                    {plan.highlight && !isCurrent && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>

                  <ul className="mt-6 pt-5 border-t border-border/30 space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        {plan.id === "enterprise" ? (
                          <Plus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="max-w-3xl mx-auto text-center text-xs text-muted-foreground mt-8">
            *Prices are subject to tax depending on your location. CodeCloud Agent is powered by large language models.
            While it can produce powerful results, its behavior is probabilistic — meaning it may occasionally make mistakes.
          </p>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Frequently asked questions</h2>
            <div className="divide-y-0">
              {FAQS.map((faq) => <FaqItem key={faq.q} faq={faq} />)}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
