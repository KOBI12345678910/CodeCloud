import { Link } from "wouter";
import {
  Code2, Terminal, Globe, Users, Rocket, GitBranch, Cpu, Shield, Zap, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const PILLARS = [
  { icon: Code2, title: "Editor", desc: "Monaco-powered IDE with IntelliSense, multi-cursor, and AI assistance." },
  { icon: Terminal, title: "Terminal", desc: "Real Linux shell. Install anything, run anything — right in the browser." },
  { icon: Globe, title: "Live Preview", desc: "Instant hot-reload. See every change the moment you save." },
  { icon: Users, title: "Collaboration", desc: "Pair-program with shared cursors, voice chat, and workspace sync." },
  { icon: Rocket, title: "Deployments", desc: "Ship to production in one click — domains, SSL, and CDN included." },
  { icon: GitBranch, title: "Git Native", desc: "Branch, commit, review, and merge without ever leaving the workspace." },
  { icon: Cpu, title: "Power", desc: "Up to 8 vCPU and 16 GB RAM containers — scale as your project grows." },
  { icon: Shield, title: "Security", desc: "Encrypted storage, SSO, audit logs, and granular role-based access." },
  { icon: Zap, title: "Speed", desc: "Cold starts under three seconds. No more day-long onboarding." },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative px-6 pt-24 pb-16 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary mb-6">
              The platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              One workspace. <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                Every developer tool.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              CodeCloud bundles the editor, terminal, preview, version control, and deployment into a single browser-native experience.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/sign-up">
                <Button size="lg">Start building <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">View pricing</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-t border-border/50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
