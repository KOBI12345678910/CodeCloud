import { Link } from "wouter";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const ROLES = [
  { team: "Engineering", title: "Senior Backend Engineer", location: "Remote · Worldwide" },
  { team: "Engineering", title: "Editor Platform Engineer", location: "San Francisco" },
  { team: "Design", title: "Product Designer, IDE", location: "Remote · Americas" },
  { team: "Product", title: "Product Manager, Collaboration", location: "Remote · Worldwide" },
  { team: "Sales", title: "Enterprise Account Executive", location: "New York" },
  { team: "Operations", title: "Developer Relations Lead", location: "Remote · EU" },
];

const VALUES = [
  { title: "Ship daily", desc: "Small, frequent releases. Real users tell us what to do next." },
  { title: "Stay curious", desc: "Every engineer talks to customers. Every designer reads the code." },
  { title: "Default to open", desc: "Internal docs, public roadmaps, and honest postmortems." },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative px-6 pt-24 pb-12 overflow-hidden">
          <div className="absolute top-10 left-10 w-[500px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto relative">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Build the future of <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                software, with us.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              We're a small, opinionated team scattered across nine countries. Remote-first, async by default, deeply biased toward shipping.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 border-t border-border/50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="p-6 rounded-xl border border-border/50 bg-card">
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 border-t border-border/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Open roles</h2>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div
                  key={r.title}
                  className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300"
                >
                  <div>
                    <div className="text-xs text-primary mb-1">{r.team}</div>
                    <div className="font-semibold">{r.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {r.location}
                    </div>
                  </div>
                  <Link href="/careers">
                    <Button variant="outline" size="sm">
                      Apply <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
