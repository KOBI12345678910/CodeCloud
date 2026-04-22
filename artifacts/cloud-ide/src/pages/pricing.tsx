import { useState } from "react";
import { Link } from "wouter";
import {
  Code2, Check, X, ArrowRight, Lock, Shield, Cloud, Zap, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: "For individuals learning and experimenting",
    features: {
      "Projects": "1",
      "Storage": "512 MB",
      "Compute": "Shared",
      "Deployments / month": "5",
      "Collaborators": "None",
      "Community support": true,
      "Custom domains": false,
      "Private projects": false,
      "API access": false,
      "Priority support": false,
      "Audit logs": false,
      "SSO / SAML": false,
      "SLA guarantee": false,
    },
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 10,
    desc: "For professionals building production apps",
    features: {
      "Projects": "Unlimited",
      "Storage": "2 GB",
      "Compute": "2 vCPU / 4 GB",
      "Deployments / month": "Unlimited",
      "Collaborators": "3 per project",
      "Community support": true,
      "Custom domains": true,
      "Private projects": true,
      "API access": true,
      "Priority support": true,
      "Audit logs": false,
      "SSO / SAML": false,
      "SLA guarantee": false,
    },
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Team",
    monthlyPrice: 29,
    yearlyPrice: 23,
    desc: "For teams building together at scale",
    features: {
      "Projects": "Unlimited",
      "Storage": "5 GB",
      "Compute": "4 vCPU / 8 GB",
      "Deployments / month": "Unlimited",
      "Collaborators": "Unlimited",
      "Community support": true,
      "Custom domains": true,
      "Private projects": true,
      "API access": true,
      "Priority support": true,
      "Audit logs": true,
      "SSO / SAML": false,
      "SLA guarantee": false,
    },
    cta: "Start Team Trial",
    highlight: false,
  },
  {
    name: "Enterprise",
    monthlyPrice: 99,
    yearlyPrice: 79,
    desc: "For organizations that need full control",
    features: {
      "Projects": "Unlimited",
      "Storage": "10 GB",
      "Compute": "Dedicated 8 vCPU / 16 GB",
      "Deployments / month": "Unlimited",
      "Collaborators": "Unlimited",
      "Community support": true,
      "Custom domains": true,
      "Private projects": true,
      "API access": true,
      "Priority support": true,
      "Audit logs": true,
      "SSO / SAML": true,
      "SLA guarantee": true,
    },
    cta: "Contact Sales",
    highlight: false,
  },
];

const faqs = [
  { q: "Can I try Pro for free?", a: "Yes! Every paid plan comes with a 14-day free trial. No credit card required to start." },
  { q: "What happens when I exceed my plan limits?", a: "We'll notify you and give you a grace period to upgrade. Your projects will never be deleted." },
  { q: "Can I change plans at any time?", a: "Absolutely. Upgrade, downgrade, or cancel anytime. Changes take effect immediately with prorated billing." },
  { q: "Do you offer discounts for startups?", a: "Yes, we offer 50% off Pro for verified startups in their first year. Contact us for details." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and wire transfers for Enterprise customers." },
  { q: "Is there a self-hosted option?", a: "Enterprise customers can deploy CodeCloud on their own infrastructure. Contact our sales team to learn more." },
  { q: "How does the annual billing discount work?", a: "When you choose annual billing, you save 20% compared to monthly pricing. You'll be billed once per year." },
];

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl bg-card overflow-hidden" data-testid={`faq-item`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
      >
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
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">CodeCloud</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Plans that scale with you
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free, upgrade when you're ready. All plans include the full IDE experience.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 bg-muted/50 p-1 rounded-full" data-testid="billing-toggle">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 text-sm rounded-full transition-all ${!annual ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                data-testid="toggle-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 text-sm rounded-full transition-all ${annual ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                data-testid="toggle-annual"
              >
                Annual <span className="text-primary font-medium ml-1">-20%</span>
              </button>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const price = annual ? `$${plan.yearlyPrice}` : `$${plan.monthlyPrice}`;
              return (
                <div
                  key={plan.name}
                  className={`relative p-6 rounded-2xl border flex flex-col ${
                    plan.highlight
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 lg:scale-[1.03]"
                      : "border-border/50 bg-card"
                  }`}
                  data-testid={`plan-${plan.name.toLowerCase()}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    {plan.monthlyPrice === 0 ? (
                      <>
                        <span className="text-4xl font-bold">$0</span>
                        <span className="text-muted-foreground text-sm">/forever</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">{price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  {annual && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-primary mt-1">
                      Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                  <Link href={plan.name === "Enterprise" ? "/" : "/sign-up"}>
                    <Button className="w-full mt-5 h-10" variant={plan.highlight ? "default" : "outline"} data-testid={`cta-${plan.name.toLowerCase()}`}>
                      {plan.cta} {plan.highlight && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </Link>
                  <div className="mt-6 pt-6 border-t border-border/30 space-y-2.5 flex-1">
                    {Object.entries(plan.features).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-muted-foreground text-xs">{key}</span>
                        {typeof value === "boolean" ? (
                          value ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                        ) : (
                          <span className="font-medium text-xs whitespace-nowrap">{value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10" data-testid="faq-heading">Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <FaqItem key={faq.q} faq={faq} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Need a custom plan?</h2>
            <p className="text-muted-foreground mb-8">
              Enterprise customers get dedicated support, custom integrations, and flexible billing. Let's talk.
            </p>
            <Button size="lg" className="px-10 h-12" data-testid="button-contact-sales">Contact Sales</Button>
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
