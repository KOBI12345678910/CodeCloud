import { Link } from "wouter";
import { ArrowRight, Calendar } from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const POSTS = [
  {
    date: "Apr 18, 2026",
    tag: "Engineering",
    title: "How we cut cold-start times by 73%",
    excerpt: "A behind-the-scenes look at the container snapshotting work that makes CodeCloud feel instant.",
  },
  {
    date: "Apr 9, 2026",
    tag: "Product",
    title: "Introducing AI pair-programming",
    excerpt: "Inline completions, refactors, and explanations — all powered by your own private workspace context.",
  },
  {
    date: "Mar 28, 2026",
    tag: "Community",
    title: "100,000 developers and counting",
    excerpt: "A note of thanks to the community that's grown around CodeCloud — and what's next.",
  },
  {
    date: "Mar 14, 2026",
    tag: "Engineering",
    title: "Designing the new collaborative editor",
    excerpt: "How we re-architected real-time collaboration to scale from two devs to two hundred.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative px-6 pt-24 pb-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto relative">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">The CodeCloud Blog</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Stories, deep dives, and product updates from the team building CodeCloud.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 border-t border-border/50">
          <div className="max-w-4xl mx-auto space-y-4">
            {POSTS.map((p) => (
              <Link key={p.title} href="/blog">
                <article className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.tag}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {p.date}</span>
                  </div>
                  <h2 className="text-2xl font-semibold group-hover:text-primary transition-colors">{p.title}</h2>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{p.excerpt}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
