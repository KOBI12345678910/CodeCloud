import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Calendar, Mail, Rss, MessageSquare, ArrowLeft } from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface BlogPost {
  slug: string;
  date: string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  body?: string;
}

const CATEGORIES = ["All", "News", "Tutorials", "Engineering", "Product", "Community", "Case studies"];

const POSTS: BlogPost[] = [
  { slug: "cold-starts", date: "Apr 18, 2026", category: "Engineering", title: "How we cut cold-start times by 73%", excerpt: "A behind-the-scenes look at the container snapshotting work that makes CodeCloud feel instant.", author: "Maya Chen", body: "We re-architected the cold-start path around prewarmed snapshot pools and shared base images. Here's exactly what changed and what surprised us." },
  { slug: "ai-pair", date: "Apr 9, 2026", category: "Product", title: "Introducing AI pair-programming", excerpt: "Inline completions, refactors, and explanations powered by your private workspace context.", author: "Daniel Park", body: "Today we're shipping AI pair-programming with three modes: ghost suggestions, refactor on selection, and explain-this-block." },
  { slug: "100k", date: "Mar 28, 2026", category: "Community", title: "100,000 developers and counting", excerpt: "A note of thanks to the community that has grown around CodeCloud.", author: "Sara Lopez", body: "Thank you. Whether you joined last week or shipped your first deploy on day one, this milestone belongs to you." },
  { slug: "collab-editor", date: "Mar 14, 2026", category: "Engineering", title: "Designing the new collaborative editor", excerpt: "How we re-architected real-time collaboration to scale from two devs to two hundred.", author: "Andre Müller", body: "Our new collab layer is built on a CRDT we call Loom — designed for low-latency multi-cursor editing across continents." },
  { slug: "tutorial-deploy", date: "Mar 1, 2026", category: "Tutorials", title: "Deploy a Next.js app in 60 seconds", excerpt: "A step-by-step walkthrough from project creation to a custom domain on TLS.", author: "Sara Lopez", body: "Step 1: pick the Next.js template. Step 2: hit Run. Step 3: open Deployments → Deploy. We'll walk through each click." },
];

const seedComments: Record<string, { id: string; author: string; body: string; createdAt: string }[]> = {};

function PostView({ slug }: { slug: string }) {
  const post = POSTS.find((p) => p.slug === slug);
  const { toast } = useToast();
  const [comments, setComments] = useState(seedComments[slug] || []);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  if (!post) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-muted-foreground">Post not found.</div>;
  }

  const submit = () => {
    if (!body.trim()) return;
    const c = { id: `c-${Date.now()}`, author: name || "Anonymous", body, createdAt: new Date().toLocaleString() };
    const next = [...comments, c];
    setComments(next);
    seedComments[slug] = next;
    setBody("");
    toast({ title: "Comment posted" });
  };

  return (
    <article className="max-w-3xl mx-auto px-6 py-12" data-testid={`blog-post-${slug}`}>
      <Link href="/blog">
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> All posts</Button>
      </Link>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">{post.category}</span>
      <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
      <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
        <Avatar className="w-7 h-7"><AvatarFallback className="text-xs">{post.author[0]}</AvatarFallback></Avatar>
        <span><Link href={`/blog?author=${encodeURIComponent(post.author)}`} className="hover:text-primary">{post.author}</Link></span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
      </div>
      <div className="prose prose-invert mt-8 leading-relaxed">
        <p className="text-lg text-foreground/90">{post.excerpt}</p>
        <p className="mt-6 text-foreground/85">{post.body}</p>
      </div>

      <section className="mt-12 pt-8 border-t border-border/40" data-testid="blog-comments">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments ({comments.length})</h3>
        <div className="space-y-3 mb-6">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Be the first to comment.</p>
          ) : comments.map((c) => (
            <div key={c.id} className="p-3 rounded border border-border/40 text-sm">
              <div className="font-medium">{c.author}</div>
              <div className="text-xs text-muted-foreground mb-1">{c.createdAt}</div>
              <div>{c.body}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} data-testid="blog-comment-name" />
          <Textarea placeholder="Add a comment..." value={body} onChange={(e) => setBody(e.target.value)} data-testid="blog-comment-body" />
          <Button onClick={submit} disabled={!body.trim()} data-testid="blog-comment-submit">Post comment</Button>
        </div>
      </section>
    </article>
  );
}

function NewsletterSignup() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/newsletter/subscribe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topic: "blog" }),
      });
      if (res.ok) { toast({ title: "Subscribed!" }); setEmail(""); }
      else toast({ title: "Invalid email", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-blue-500/5 border-primary/20" data-testid="newsletter-signup">
      <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-3">
        <Mail className="w-8 h-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Get every post in your inbox</h3>
          <p className="text-xs text-muted-foreground">One email per week. No spam.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dev.io" type="email" className="sm:w-56" data-testid="newsletter-email" />
          <Button onClick={submit} disabled={busy || !email}>Subscribe</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BlogPage() {
  const [matchPost, params] = useRoute("/blog/:slug");
  const [category, setCategory] = useState("All");
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const author = search.get("author");

  const visible = useMemo(() => {
    let list = POSTS;
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (author) list = list.filter((p) => p.author === author);
    return list;
  }, [category, author]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      {matchPost && params?.slug ? (
        <main><PostView slug={params.slug} /></main>
      ) : (
        <main>
          <section className="px-6 pt-16 pb-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold tracking-tight">The CodeCloud Blog</h1>
              <p className="mt-3 text-lg text-muted-foreground">Stories, deep dives, and product updates from the team building CodeCloud.</p>
              {author && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Filtering posts by <span className="text-primary font-medium">{author}</span> ·{" "}
                  <Link href="/blog" className="underline">clear</Link>
                </div>
              )}
            </div>
          </section>

          <section className="px-6 pb-6 border-y border-border/40">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 py-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
                  data-testid={`blog-cat-${c.toLowerCase().replace(/\s+/g, "-")}`}
                >{c}</button>
              ))}
              <a href={`${API}/blog/rss.xml`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" data-testid="blog-rss">
                <Rss className="w-3 h-3" /> RSS
              </a>
            </div>
          </section>

          <section className="px-6 py-10">
            <div className="max-w-4xl mx-auto">
              <NewsletterSignup />
              <div className="mt-8 space-y-4">
                {visible.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}>
                    <article className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors cursor-pointer" data-testid={`blog-card-${p.slug}`}>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.category}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {p.date}</span>
                        <span>by {p.author}</span>
                      </div>
                      <h2 className="text-2xl font-semibold group-hover:text-primary transition-colors">{p.title}</h2>
                      <p className="mt-2 text-muted-foreground leading-relaxed">{p.excerpt}</p>
                    </article>
                  </Link>
                ))}
                {visible.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">No posts in this category yet.</p>
                )}
              </div>
            </div>
          </section>
        </main>
      )}
      <MarketingFooter />
    </div>
  );
}
