import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  BookOpen, Code2, Rocket, Terminal, Users, Zap, Search, Play, HelpCircle, Award,
} from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { Input } from "@/components/ui/input";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface DocSection {
  id: string;
  title: string;
  icon: any;
  category: "Getting Started" | "Tutorials" | "API Reference" | "FAQ";
  body: string;
  videoId?: string;
}

const SECTIONS: DocSection[] = [
  { id: "getting-started", title: "Getting Started", icon: Zap, category: "Getting Started", body: `# Getting Started\n\nWelcome to CodeCloud. In under 60 seconds you can spin up a project, edit code in the browser, and share a live preview link with your team.\n\n## 1. Create your first project\nUse the dashboard's **New project** button or pick a template from the template store. Each project gets an isolated container with its own filesystem and dependencies.\n\n## 2. Edit, run, and preview\nThe Monaco-based editor supports multi-cursor, AI completions, and inline diagnostics. Hit **Run** to start your dev server and **Preview** to see the result.\n\n## 3. Invite collaborators\nShare a project link to pair-program in real time. Cursors, selections, and terminal output sync instantly.` },
  { id: "editor", title: "Editor & Shortcuts", icon: Code2, category: "Tutorials", body: `# Editor & Shortcuts\n\n- **Ctrl/Cmd+P** open file\n- **Ctrl/Cmd+Shift+F** global search across files\n- **Shift+Alt+F** format current file (Prettier)\n- **Ctrl/Cmd+B** toggle sidebar\n- **Ctrl/Cmd+/** toggle comment\n\nAI suggestions appear inline; press **Tab** to accept.` },
  { id: "terminal", title: "Terminal & Shell", icon: Terminal, category: "Tutorials", body: `# Terminal & Shell\n\nEvery project ships with an integrated Linux shell. Install packages with pnpm/npm/pip/cargo — your container is preserved across sessions.\n\nExample:\n\n\`\`\`bash\npnpm add zod\nnode --version\n\`\`\`` },
  { id: "deploy", title: "Deployments", icon: Rocket, category: "Tutorials", body: `# Deployments\n\nShip to production in one click. Deployments include:\n\n- Custom domains and managed SSL\n- Region selection (US, EU, APAC)\n- Atomic rollbacks and deploy history\n- Per-deployment env vars\n\nSee the deployment dashboard for the full audit trail.` },
  { id: "collab", title: "Collaboration", icon: Users, category: "Tutorials", body: `# Collaboration\n\nInvite teammates as **viewer**, **editor**, or **admin**. Pair-program in real time with shared cursors, voice notes, and an inline comment thread on every line.` },
  { id: "api", title: "API Reference", icon: BookOpen, category: "API Reference", body: `# API Reference\n\nAll REST endpoints are mounted under \`/api\`. Authenticate with a bearer token from **Settings → API Keys**.\n\nExample:\n\n\`\`\`http\nGET /api/projects\nAuthorization: Bearer <token>\n\`\`\`\n\nFull endpoint docs at /api-docs.` },
  { id: "bounties", title: "Bounties Guide", icon: Award, category: "Tutorials", body: `# Bounties\n\nPost paid work, apply to listed bounties, and exchange reviews after delivery. Funds are escrowed via the existing billing integration. Visit /bounties to browse open work.` },
  { id: "faq", title: "FAQ", icon: HelpCircle, category: "FAQ", body: `# FAQ\n\n**Is the free tier really free?** Yes — three always-on projects with 1 GB storage each.\n\n**Can I bring my own model?** Pro and Enterprise plans support BYO API keys for OpenAI, Anthropic, Gemini, and OpenRouter.\n\n**Is my code private?** Private projects are encrypted at rest with AES-256-GCM and never used to train models.` },
];

const VIDEOS = [
  { id: "60s-tour", title: "60-second platform tour", embedId: "dQw4w9WgXcQ" },
  { id: "deploy-demo", title: "Deploying in one click", embedId: "dQw4w9WgXcQ" },
];

function renderMarkdown(md: string): string {
  let html = md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, _lang, code) =>
      `<pre class="bg-muted/40 border border-border/40 rounded-md px-3 py-2 my-3 text-xs overflow-x-auto"><code>${code.replace(/[<>&]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</code></pre>`)
    .replace(/^# (.*)$/gm, '<h1 class="text-3xl font-bold mt-6 mb-3 scroll-mt-24">$1</h1>')
    .replace(/^## (.*)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2 scroll-mt-24">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted/40 text-xs">$1</code>')
    .replace(/^- (.*)$/gm, '<li class="ml-5 list-disc">$1</li>');
  html = html.split(/\n{2,}/).map((b) => b.trim().startsWith("<") ? b : `<p class="mt-3 text-foreground/85 leading-relaxed">${b}</p>`).join("\n");
  return html;
}

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<{ title: string; subtitle?: string; url: string }[]>([]);
  const grouped = useMemo(() => {
    const m: Record<string, DocSection[]> = {};
    SECTIONS.forEach((s) => { (m[s.category] = m[s.category] || []).push(s); });
    return m;
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchHits([]); return; }
    const t = setTimeout(async () => {
      const localHits = SECTIONS.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.body.toLowerCase().includes(search.toLowerCase()))
        .map((s) => ({ title: s.title, subtitle: s.category, url: `#${s.id}` }));
      try {
        const res = await fetch(`${API}/search/global?q=${encodeURIComponent(search)}&limit=4`);
        const data = await res.json();
        const remoteDocs = (data.groups || []).find((g: any) => g.type === "doc")?.hits || [];
        setSearchHits([...localHits, ...remoteDocs.filter((h: any) => !localHits.find((l) => l.title === h.title))]);
      } catch {
        setSearchHits(localHits);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
        <aside className="lg:sticky lg:top-24 self-start" data-testid="docs-toc">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search docs..." className="pl-9" data-testid="docs-search" />
          </div>
          {search.trim() && searchHits.length > 0 && (
            <div className="mb-4 space-y-1 border border-border/50 rounded-md p-2 bg-card/50">
              {searchHits.map((h, i) => (
                <a key={i} href={h.url} className="block px-2 py-1.5 rounded hover:bg-muted/40 text-sm">
                  <div className="font-medium truncate">{h.title}</div>
                  {h.subtitle && <div className="text-[11px] text-muted-foreground">{h.subtitle}</div>}
                </a>
              ))}
            </div>
          )}
          <nav className="space-y-4 text-sm">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">{cat}</h4>
                <ul className="space-y-0.5">
                  {items.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 text-foreground/80 hover:text-foreground" data-testid={`docs-nav-${s.id}`}>
                        <s.icon className="w-3.5 h-3.5 opacity-70" /> {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">Videos</h4>
              <ul className="space-y-0.5">
                {VIDEOS.map((v) => (
                  <li key={v.id}>
                    <a href={`#video-${v.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 text-foreground/80 hover:text-foreground">
                      <Play className="w-3.5 h-3.5 opacity-70" /> {v.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        <article className="prose prose-invert max-w-none" data-testid="docs-content">
          <header className="mb-10 pb-8 border-b border-border/40">
            <h1 className="text-5xl font-bold tracking-tight">Documentation</h1>
            <p className="mt-3 text-lg text-muted-foreground">From your first project to enterprise rollouts.</p>
          </header>

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="mb-12 scroll-mt-24" data-testid={`docs-section-${s.id}`}>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
            </section>
          ))}

          <section id="videos" className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Video tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VIDEOS.map((v) => (
                <div key={v.id} id={`video-${v.id}`} className="rounded-lg border border-border/40 overflow-hidden bg-card scroll-mt-24">
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${v.embedId}`}
                      title={v.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-3"><p className="font-medium text-sm">{v.title}</p></div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-16 p-6 rounded-xl border border-border/40 bg-card/50 flex items-center justify-between">
            <div>
              <p className="font-semibold">Looking for the API?</p>
              <p className="text-sm text-muted-foreground mt-1">Browse the full REST reference.</p>
            </div>
            <Link href="/api-docs" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Open API Reference</Link>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
