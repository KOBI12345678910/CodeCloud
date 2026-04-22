import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Code2, Zap, Globe, Users, Terminal, Rocket,
  Check, Star, ArrowRight, Shield, Cpu, GitBranch,
  Sparkles, ChevronRight, Monitor, Smartphone, Palette,
  Presentation, Play, Send, Plus, Database, Bot, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import HreflangTags from "@/components/HreflangTags";
import { useTranslation, LANGUAGES } from "@/i18n";

function shouldSkipAnimations(): boolean {
  if (typeof window === "undefined") return true;
  if (!("IntersectionObserver" in window)) return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  return false;
}

function useReveal<T extends HTMLElement>(initialVisible = false) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(initialVisible || shouldSkipAnimations());
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    const fallback = window.setTimeout(() => setVisible(true), 1500);
    return () => {
      obs.disconnect();
      window.clearTimeout(fallback);
    };
  }, [visible]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "", immediate = false }: { children: React.ReactNode; delay?: number; className?: string; immediate?: boolean }) {
  const { ref, visible } = useReveal<HTMLDivElement>(immediate);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const CODE_LINES: { text: string; color: string }[] = [
  { text: "import express from 'express';", color: "text-purple-400" },
  { text: "import { db } from './lib/db';", color: "text-purple-400" },
  { text: "", color: "" },
  { text: "const app = express();", color: "text-blue-300" },
  { text: "", color: "" },
  { text: "app.get('/api/users', async (req, res) => {", color: "text-cyan-300" },
  { text: "  const users = await db.user.findMany();", color: "text-slate-200" },
  { text: "  res.json({ users });", color: "text-slate-200" },
  { text: "});", color: "text-cyan-300" },
  { text: "", color: "" },
  { text: "app.listen(3000, () => {", color: "text-cyan-300" },
  { text: "  console.log('🚀 Server ready');", color: "text-green-300" },
  { text: "});", color: "text-cyan-300" },
];

function AnimatedCodeEditor() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) return;
    const delay = CODE_LINES[visibleLines]?.text === "" ? 200 : 120 + Math.random() * 100;
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-14 rounded-2xl border border-border/50 bg-[hsl(222,47%,8%)] shadow-2xl shadow-primary/20 overflow-hidden ring-1 ring-white/5" data-testid="code-editor-mockup">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(222,47%,11%)] border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-xs text-muted-foreground/60 font-mono">server.ts</span>
        </div>
      </div>
      <div className="p-5 font-mono text-sm leading-6 min-h-[300px]">
        {CODE_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 text-right text-muted-foreground/30 select-none mr-4 text-xs leading-6">{i + 1}</span>
            <span className={line.color}>{line.text}</span>
            {i === visibleLines - 1 && visibleLines < CODE_LINES.length && (
              <span className="inline-block w-2 h-5 bg-primary/70 ml-0.5 animate-pulse" />
            )}
          </div>
        ))}
        {visibleLines >= CODE_LINES.length && (
          <div className="flex">
            <span className="w-8 text-right text-muted-foreground/30 select-none mr-4 text-xs leading-6">{CODE_LINES.length + 1}</span>
            <span className="inline-block w-2 h-5 bg-primary/70 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

function useAnimatedCounter(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return count;
}

function StatsCounter({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useAnimatedCounter(value, 2000, active);
  const display = value >= 1000 ? `${(count / 1000).toFixed(count >= value ? 1 : 0).replace(/\.0$/, "")}K` : count.toString();
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-blue-400 bg-clip-text text-transparent" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {display}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

const CATEGORIES = [
  { icon: Monitor, label: "Website" },
  { icon: Smartphone, label: "Mobile" },
  { icon: Palette, label: "Design" },
  { icon: Presentation, label: "Slides" },
  { icon: Play, label: "Animation" },
  { icon: Database, label: "Backend" },
  { icon: Bot, label: "AI Agent" },
];

const EXAMPLE_PROMPTS = [
  "SaaS landing page with auth",
  "Task management dashboard",
  "E-commerce storefront",
  "Real-time chat application",
];

const logos = ["Acme", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Hooli", "Pied Piper"];

const testimonials = [
  { name: "Sarah Chen", role: "Senior Engineer @ Stripe", avatar: "SC", text: "The fastest dev environment I've ever used. Zero setup, instant collaboration — it just works." },
  { name: "Marcus Johnson", role: "Founder @ DevTools.io", avatar: "MJ", text: "We replaced our entire local toolchain with this. Ship velocity went up 3x in the first month." },
  { name: "Priya Patel", role: "Tech Lead @ Notion", avatar: "PP", text: "Onboarding a new engineer used to take days. Now it's literally one click and they're coding." },
  { name: "David Kim", role: "CTO @ Vercel", avatar: "DK", text: "The integrated terminal and live preview are game-changers. Our team won't go back." },
  { name: "Emma Rodriguez", role: "Staff Engineer @ Linear", avatar: "ER", text: "Beautiful editor, real Linux shell, instant deploy — this is how cloud dev should feel." },
  { name: "Alex Thompson", role: "Indie Hacker", avatar: "AT", text: "Built and shipped my entire SaaS from an iPad on a flight. Felt like the future." },
];

const features = [
  { icon: Code2, title: "Monaco Editor", desc: "VS Code-quality editing with IntelliSense, syntax highlighting, and multi-cursor support." },
  { icon: Terminal, title: "Integrated Terminal", desc: "A real Linux shell — run commands, install packages, and debug in the browser." },
  { icon: Globe, title: "Live Preview", desc: "Instant hot-reload preview. See every change reflected in real time." },
  { icon: Users, title: "Team Collaboration", desc: "Invite teammates, assign roles, and build together with shared projects." },
  { icon: Zap, title: "Instant Setup", desc: "Pick a template, click create — your dev environment is ready in under 3 seconds." },
  { icon: Rocket, title: "One-Click Deploy", desc: "Ship to production with one click. Custom domains, SSL, and CDN included." },
  { icon: Shield, title: "Built-in Security", desc: "AES-256 encryption, role-based access, and audit logging for your projects." },
  { icon: GitBranch, title: "Version Control", desc: "Built-in Git with branching, commits, and pull request workflows." },
  { icon: Cpu, title: "Powerful Containers", desc: "Dedicated compute up to 8 vCPU and 16 GB RAM for demanding workloads." },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    priceAnnual: "$0",
    period: "forever",
    desc: "For exploring what's possible",
    features: ["Free daily Agent credits", "Free AI integrations", "Publish 1 app", "Community support", "Public projects", "Basic templates"],
    cta: "Sign up",
    highlight: false,
  },
  {
    name: "Core",
    price: "$20",
    priceAnnual: "$18",
    period: "/month",
    desc: "For personal projects & simple apps",
    features: ["$20 of monthly credits", "Up to 5 collaborators", "Unlimited workspaces", "Autonomous long builds", "Remove \"Made with CodeCloud\" badge", "All templates", "Custom domains"],
    cta: "Join Core",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$100",
    priceAnnual: "$90",
    period: "/month",
    desc: "For commercial & professional apps",
    features: ["Everything in Core", "$100 monthly credits", "Up to 15 collaborators", "Up to 50 viewers", "Most powerful AI models", "Private deployments", "Database restore up to 28 days", "Premium support"],
    cta: "Join Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceAnnual: "Custom",
    period: "",
    desc: "Enterprise-grade security & controls",
    features: ["Everything in Pro", "Custom seat limits", "SSO / SAML", "Advanced privacy controls", "Design system support", "Data warehouse connections", "Dedicated support", "Single-tenant environments", "Region selection", "VPC peering"],
    cta: "Contact us",
    highlight: false,
  },
];

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features", href: "/product" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Docs", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Security", href: "/security" },
    { label: "Compliance", href: "/compliance" },
  ],
};

export default function LandingPage() {
  const { t } = useTranslation();
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(shouldSkipAnimations());
  const [promptValue, setPromptValue] = useState("");
  const [billingAnnual, setBillingAnnual] = useState(true);

  useEffect(() => {
    if (statsVisible) return;
    const el = statsRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setStatsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    const fallback = window.setTimeout(() => setStatsVisible(true), 2500);
    return () => {
      obs.disconnect();
      window.clearTimeout(fallback);
    };
  }, [statsVisible]);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased" data-testid="landing-page">
      <HreflangTags path="/" />
      <MarketingHeader />

      <main>
        {/* Hero — Prompt-first like Replit/Lovable */}
        <section className="relative px-6 pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,hsl(224_76%_48%/0.12),transparent_60%)] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent)",
            }}
          />

          <div className="max-w-3xl mx-auto text-center relative">
            <Reveal immediate>
              <h1 className="text-4xl sm:text-5xl md:text-[3.75rem] font-bold tracking-tight leading-[1.1]">
                What will you build?
              </h1>
            </Reveal>

            <Reveal delay={80} immediate>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Turn ideas into apps in minutes — no coding needed
              </p>
            </Reveal>

            <Reveal delay={160} immediate>
              <div className="mt-10 w-full max-w-2xl mx-auto">
                <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/10 transition-all focus-within:border-primary/50 focus-within:shadow-primary/20">
                  <textarea
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder="Describe your idea, CodeCloud will bring it to life..."
                    rows={2}
                    className="w-full resize-none bg-transparent px-5 pt-5 pb-2 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                    data-testid="hero-prompt"
                  />
                  <div className="flex items-center justify-between px-4 pb-3">
                    <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground">
                      <Plus className="w-5 h-5" />
                    </button>
                    <Link href="/sign-up">
                      <button
                        className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all shadow-lg shadow-primary/30"
                        data-testid="hero-submit"
                      >
                        <ArrowRight className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={240} immediate>
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl border border-border/40 bg-card/60 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                      <cat.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{cat.label}</span>
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={320} immediate>
              <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Try:
                </span>
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPromptValue(p)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Logos */}
        <section className="py-12 px-6 border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8">
              Trusted by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:gap-x-16 opacity-50">
              {logos.map((logo) => (
                <span
                  key={logo}
                  className="text-lg font-semibold tracking-wide hover:opacity-80 hover:text-foreground transition-all"
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-6 border-t border-border/50" ref={statsRef}>
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={50000} suffix="+" label="Developers" active={statsVisible} />
            <StatsCounter value={120000} suffix="+" label="Projects Created" active={statsVisible} />
            <StatsCounter value={450000} suffix="+" label="Deployments" active={statsVisible} />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-blue-400 bg-clip-text text-transparent" data-testid="stat-uptime">
                99.9%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Uptime</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 border-t border-border/50 relative" id="features">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-6xl mx-auto relative">
            <Reveal immediate>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Everything you need to build</h2>
                <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
                  A complete development platform with enterprise-grade features, from editor to deploy.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 60}>
                  <div className="h-full p-6 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 px-6 border-t border-border/50" id="pricing">
          <div className="max-w-7xl mx-auto">
            <Reveal immediate>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Pricing</h2>
                <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg">
                  Choose the best plan for you.
                </p>
              </div>
            </Reveal>

            <Reveal delay={60} immediate>
              <div className="flex items-center justify-center gap-3 mb-12">
                <button
                  onClick={() => setBillingAnnual(false)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${!billingAnnual ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingAnnual(true)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${billingAnnual ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Yearly
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-semibold">Save 10%</span>
                </button>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 80}>
                  <div
                    className={`relative h-full p-7 rounded-2xl border transition-all duration-300 ${
                      plan.highlight
                        ? "border-primary/60 bg-gradient-to-b from-primary/10 to-transparent shadow-2xl shadow-primary/20"
                        : "border-border/50 bg-card/60 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      {plan.highlight && (
                        <span className="px-2.5 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                          Save 10%
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {billingAnnual ? plan.priceAnnual : plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-muted-foreground text-sm">
                          per month{billingAnnual && plan.price !== "Custom" ? ", billed annually" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">{plan.desc}</p>
                    <Link href={plan.name === "Enterprise" ? "/contact" : "/sign-up"}>
                      <Button
                        className={`w-full mt-5 ${plan.highlight ? "shadow-lg shadow-primary/20" : ""}`}
                        variant={plan.highlight ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <Reveal immediate>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Loved by developers</h2>
                <p className="mt-4 text-muted-foreground text-lg">See what our users have to say.</p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 80}>
                  <div className="h-full p-6 rounded-xl border border-border/50 bg-card/60 hover:border-primary/30 transition-all duration-300">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed mb-6">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 border-t border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,hsl(224_76%_48%/0.18),transparent_60%)] pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <Reveal immediate>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Ready to build your next project?
              </h2>
              <p className="text-muted-foreground mb-10 text-lg">
                Join 50,000+ developers building and deploying from the browser. Start free today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/sign-up">
                  <Button size="lg" className="px-10 h-12 text-base shadow-lg shadow-primary/20" data-testid="button-cta-signup">
                    Create free account <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="px-10 h-12 text-base bg-white/5">
                    View pricing
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
