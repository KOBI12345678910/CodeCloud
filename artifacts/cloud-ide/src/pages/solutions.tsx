import { Link } from "wouter";
import { ArrowRight, Briefcase, GraduationCap, Building2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const SOLUTIONS = [
  {
    icon: Rocket,
    title: "Startups",
    desc: "Ship faster with zero infra setup. Spin up production-ready environments in seconds.",
  },
  {
    icon: Building2,
    title: "Enterprise",
    desc: "SSO, audit logs, and dedicated compute. The control your IT team demands.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    desc: "Classroom-ready environments. Students code in the browser — no installs, no IT tickets.",
  },
  {
    icon: Briefcase,
    title: "Agencies",
    desc: "Onboard contractors in minutes. Share workspaces, ship client work, archive when done.",
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative px-6 pt-24 pb-12 overflow-hidden">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Built for every <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                kind of team
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're a two-person startup or a Fortune 500, CodeCloud adapts to how your team builds.
            </p>
          </div>
        </section>

        <section className="px-6 py-16 border-t border-border/50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {SOLUTIONS.map((s) => (
              <div
                key={s.title}
                className="p-8 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 border-t border-border/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to get started?</h2>
            <p className="mt-4 text-muted-foreground">Talk to sales or start a free trial — your call.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/sign-up">
                <Button size="lg">Start free <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
              <Link href="/support">
                <Button size="lg" variant="outline">Contact sales</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
