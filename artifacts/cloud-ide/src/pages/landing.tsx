import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Code2, Zap, Globe, Users, Terminal, Rocket,
  Check, Star, ArrowRight, Shield, Cpu, GitBranch,
  BarChart3, Lock, Cloud, Layers, Sparkles, ChevronRight,
  Circle, Minus, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CODE_LINES = [
  { text: 'import express from "express";', color: "text-blue-400" },
  { text: "", color: "" },
  { text: "const app = express();", color: "text-cyan-300" },
  { text: 'const port = process.env.PORT || 3000;', color: "text-cyan-300" },
  { text: "", color: "" },
  { text: 'app.get("/api/hello", (req, res) => {', color: "text-yellow-300" },
  { text: '  res.json({ message: "Hello, CodeCloud!" });', color: "text-green-400" },
  { text: "});", color: "text-yellow-300" },
  { text: "", color: "" },
  { text: "app.listen(port, () => {", color: "text-purple-400" },
  { text: '  console.log(`Server running on ${port}`);', color: "text-green-400" },
  { text: "});", color: "text-purple-400" },
];

function useAnimatedCounter(end: number, duration: number = 2000, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, active]);
  return count;
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
    <div className="w-full max-w-2xl mx-auto mt-12 rounded-xl border border-border/50 bg-[hsl(222,47%,8%)] shadow-2xl shadow-primary/10 overflow-hidden" data-testid="code-editor-mockup">
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
      <div className="p-4 font-mono text-sm leading-6 min-h-[280px]">
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
      <div className="text-3xl md:text-4xl font-bold text-primary" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {display}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

const features = [
  { icon: Code2, title: "Monaco Editor", desc: "VS Code-quality editing with IntelliSense, syntax highlighting, and multi-cursor support" },
  { icon: Terminal, title: "Integrated Terminal", desc: "Full Linux terminal — run commands, install packages, debug directly in the browser" },
  { icon: Globe, title: "Live Preview", desc: "Instant hot-reloading preview. See every change reflected in real-time" },
  { icon: Users, title: "Team Collaboration", desc: "Invite team members, assign roles, and build together with shared projects" },
  { icon: Zap, title: "Instant Setup", desc: "Pick a template, click create — your dev environment is ready in under 3 seconds" },
  { icon: Rocket, title: "One-Click Deploy", desc: "Ship to production with one click. Custom domains, SSL, and CDN included" },
  { icon: Shield, title: "Built-in Security", desc: "AES-256 encryption, role-based access control, and audit logging for your projects" },
  { icon: GitBranch, title: "Version Control", desc: "Built-in Git integration with branching, commits, and pull request workflows" },
  { icon: Cpu, title: "Powerful Containers", desc: "Dedicated compute with up to 8 vCPU and 16GB RAM for demanding workloads" },
];


const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for learning and personal projects",
    features: ["3 projects", "1 GB storage", "Shared compute", "Community support", "Public projects", "Basic templates"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    desc: "For professionals building production applications",
    features: ["Unlimited projects", "20 GB storage", "Dedicated 4 vCPU / 8 GB RAM", "Priority support", "Private projects", "All templates", "Custom domains", "Team collaboration (5 members)", "API access"],
    cta: "Start Pro Trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "Custom",
    period: "",
    desc: "For organizations that need scale and control",
    features: ["Everything in Pro", "Unlimited storage", "8 vCPU / 16 GB RAM", "SSO / SAML", "Audit logs", "SLA guarantee", "Dedicated support engineer", "On-premise option", "Custom integrations", "Unlimited team members"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const testimonials = [
  { name: "Sarah Chen", role: "CTO, TechFlow", text: "CodeCloud replaced our entire local dev setup. Our team onboards 10x faster now.", avatar: "SC" },
  { name: "Marcus Johnson", role: "Lead Developer, Shipyard", text: "The deployment pipeline is incredible. We went from code to production in under a minute.", avatar: "MJ" },
  { name: "Aisha Patel", role: "Founder, DevScale", text: "We run our entire startup on CodeCloud. The collaboration features are game-changing.", avatar: "AP" },
];

const logos = ["Google", "Microsoft", "Stripe", "Vercel", "Shopify", "Notion"];

export default function LandingPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">CodeCloud</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/explore" className="text-muted-foreground hover:text-foreground transition-colors">Explore</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
            <Link href="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" data-testid="link-sign-in">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" data-testid="link-sign-up">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 md:py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-duration:4s] pointer-events-none" />
          <div className="absolute bottom-10 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse [animation-duration:6s] [animation-delay:1s] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse [animation-duration:8s] [animation-delay:2s] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Now with AI-powered code assistance</span>
              <ChevronRight className="w-3 h-3" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              Build, deploy, and
              <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                scale from your browser
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The cloud IDE platform trusted by over 50,000 developers. Write code, collaborate with your team, and deploy to production — all without leaving the browser.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="px-8 h-12 text-base" data-testid="button-get-started">
                  Start Building Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 h-12 text-base" onClick={scrollToFeatures} data-testid="button-explore">
                See Features
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required. Free tier available forever.</p>

            <AnimatedCodeEditor />
          </div>
        </section>

        <section className="py-12 px-6 border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm text-muted-foreground mb-8">Trusted by teams at</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40">
              {logos.map((logo) => (
                <span key={logo} className="text-lg font-semibold tracking-wide">{logo}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 border-t border-border/50" ref={statsRef}>
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={10000} suffix="+" label="Developers" active={statsVisible} />
            <StatsCounter value={50000} suffix="+" label="Projects Created" active={statsVisible} />
            <StatsCounter value={1000000} suffix="+" label="Deployments" active={statsVisible} />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary" data-testid="stat-uptime">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">Uptime</div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Everything you need to build</h2>
              <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                A complete development platform with enterprise-grade features, from code editor to production deployment.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Simple, transparent pricing</h2>
              <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                Start free. Scale as you grow. No hidden fees, no surprises.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative p-8 rounded-xl border ${
                    plan.highlight
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                      : "border-border/50 bg-card"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
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
                      className="w-full mt-6"
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
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Loved by developers</h2>
              <p className="mt-4 text-muted-foreground">See what our users have to say</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div key={t.name} className="p-6 rounded-xl border border-border/50 bg-card">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build your next project?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join 50,000+ developers who build and deploy from the browser. Start for free today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="px-10 h-12 text-base" data-testid="button-cta-signup">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="px-10 h-12 text-base">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">CodeCloud</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The cloud IDE platform for modern development teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link href="/status" className="hover:text-foreground transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Developers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/api-docs" className="hover:text-foreground transition-colors">API Docs</Link></li>
                <li><span className="cursor-default">Guides</span></li>
                <li><span className="cursor-default">Community</span></li>
                <li><span className="cursor-default">Open Source</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="cursor-default">About</span></li>
                <li><span className="cursor-default">Blog</span></li>
                <li><span className="cursor-default">Careers</span></li>
                <li><span className="cursor-default">Contact</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="cursor-default">Privacy</span></li>
                <li><span className="cursor-default">Terms</span></li>
                <li><span className="cursor-default">Security</span></li>
                <li><span className="cursor-default">DPA</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} CodeCloud. All rights reserved.</span>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
              <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> Reliable</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
