import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Code2, Zap, Globe, Users, Terminal, Rocket,
  Check, Star, ArrowRight, Shield, Cpu, GitBranch,
  Sparkles, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
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
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for learning and personal projects",
    features: ["3 projects", "1 GB storage", "Shared compute", "Community support", "Public projects", "Basic templates"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    desc: "For professionals building production apps",
    features: ["Unlimited projects", "20 GB storage", "Dedicated 4 vCPU / 8 GB RAM", "Priority support", "Private projects", "All templates", "Custom domains", "Team collaboration (5 members)", "API access"],
    cta: "Start Pro trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "Custom",
    period: "",
    desc: "For organizations that need scale and control",
    features: ["Everything in Pro", "Unlimited storage", "8 vCPU / 16 GB RAM", "SSO / SAML", "Audit logs", "SLA guarantee", "Dedicated support engineer", "On-premise option", "Custom integrations", "Unlimited team members"],
    cta: "Contact sales",
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
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
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
    return () => obs.disconnect();
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased" data-testid="landing-page">
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,hsl(224_76%_48%/0.18),transparent_60%)] pointer-events-none" />
          <div className="absolute top-32 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl animate-pulse [animation-duration:8s] pointer-events-none" />
          <div className="absolute bottom-0 -right-40 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-3xl animate-pulse [animation-duration:10s] [animation-delay:2s] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent)",
            }}
          />

          <div className="max-w-5xl mx-auto text-center relative">
            <Reveal>
              <Link href="/blog">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs sm:text-sm text-primary mb-8 hover:bg-primary/10 transition-colors cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Now with AI-powered code assistance</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
                Build, ship, and
                <br />
                <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                  scale from your browser
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                The cloud IDE trusted by 50,000+ developers. Write code, collaborate with your team, and deploy to production — without ever leaving the browser.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/sign-up">
                  <Button size="lg" className="px-8 h-12 text-base shadow-lg shadow-primary/20" data-testid="button-get-started">
                    Start building <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="px-8 h-12 text-base bg-white/5 border-border/60 hover:bg-white/10" onClick={scrollToFeatures} data-testid="button-explore">
                  See features
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No credit card required. Free forever tier available.</p>
            </Reveal>

            <Reveal delay={320}>
              <AnimatedCodeEditor />
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
            <StatsCounter value={10000} suffix="+" label="Developers" active={statsVisible} />
            <StatsCounter value={50000} suffix="+" label="Projects Created" active={statsVisible} />
            <StatsCounter value={1000000} suffix="+" label="Deployments" active={statsVisible} />
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
            <Reveal>
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
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h2>
                <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg">
                  Start free. Scale as you grow. No hidden fees, no surprises.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 80}>
                  <div
                    className={`relative h-full p-8 rounded-2xl border transition-all duration-300 ${
                      plan.highlight
                        ? "border-primary/60 bg-gradient-to-b from-primary/10 to-transparent shadow-2xl shadow-primary/20 scale-[1.02]"
                        : "border-border/50 bg-card/60 hover:border-primary/30"
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-xs font-semibold rounded-full shadow-lg shadow-primary/30">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                    <Link href="/sign-up">
                      <Button
                        className={`w-full mt-6 ${plan.highlight ? "shadow-lg shadow-primary/20" : ""}`}
                        variant={plan.highlight ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                    <ul className="mt-8 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
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
            <Reveal>
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
        </div>
      </section>

        {/* CTA */}
        <section className="py-24 px-6 border-t border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,hsl(224_76%_48%/0.18),transparent_60%)] pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <Reveal>
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
