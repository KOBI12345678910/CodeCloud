import { Link } from "wouter";
import { BookOpen, Code2, Rocket, Terminal, Users, Zap, ArrowRight } from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const SECTIONS = [
  { icon: Zap, title: "Quickstart", desc: "Spin up your first project in under 60 seconds.", href: "/sign-up" },
  { icon: Code2, title: "Editor", desc: "Keyboard shortcuts, multi-cursor, and AI assistance.", href: "/docs" },
  { icon: Terminal, title: "Terminal & Shell", desc: "Working with the integrated Linux environment.", href: "/docs" },
  { icon: Rocket, title: "Deployments", desc: "Ship to production with custom domains and SSL.", href: "/docs" },
  { icon: Users, title: "Collaboration", desc: "Invite teammates and pair-program in real time.", href: "/docs" },
  { icon: BookOpen, title: "API Reference", desc: "REST endpoints and SDKs for the CodeCloud API.", href: "/api-docs" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative px-6 pt-24 pb-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Documentation</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Everything you need to be productive on CodeCloud — from your first project to enterprise rollouts.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 border-t border-border/50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => (
              <Link key={s.title} href={s.href}>
                <div className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
