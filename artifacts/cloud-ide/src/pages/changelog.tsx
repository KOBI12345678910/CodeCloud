import { useState } from "react";
import { Link } from "wouter";
import { Code2, ArrowLeft, Sparkles, Bug, TrendingUp, Filter, Rss, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type Category = "feature" | "fix" | "improvement";

interface ChangelogEntry {
  version: string;
  date: string;
  entries: Array<{
    category: Category;
    title: string;
    description: string;
  }>;
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.5.0",
    date: "2026-04-16",
    entries: [
      { category: "feature", title: "AI Code Assistant", description: "Integrated AI chat panel in the IDE for code explanation, debugging, and generation." },
      { category: "feature", title: "Global Search & Replace", description: "Ctrl+Shift+F to search across all project files with regex support and file type filters." },
      { category: "feature", title: "Code Formatting", description: "Format on save with Prettier for JS/TS/HTML/CSS/JSON. Shift+Alt+F to format." },
      { category: "improvement", title: "Enhanced Monaco Editor", description: "Bracket pair colorization, improved autocomplete, and better minimap navigation." },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-04-10",
    entries: [
      { category: "feature", title: "JWT Authentication", description: "Complete auth system with access tokens (15min), refresh tokens (7 days), and brute force protection." },
      { category: "feature", title: "Google OAuth", description: "Sign in with Google for quick account creation and login." },
      { category: "feature", title: "Project Export", description: "Download your entire project as a ZIP file." },
      { category: "fix", title: "Security Hardening", description: "AES-256-GCM encryption for secrets, admin role-based access, IDOR prevention." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-05",
    entries: [
      { category: "feature", title: "Admin Panel", description: "Platform admin dashboard with user management, project overview, and audit logs." },
      { category: "feature", title: "API Keys", description: "Generate and manage API keys for programmatic access." },
      { category: "improvement", title: "Settings Page", description: "Tabbed settings with Profile, API Keys, and Appearance sections." },
      { category: "fix", title: "File Tree Improvements", description: "Inline rename, new folder creation, and context menu fixes." },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-28",
    entries: [
      { category: "feature", title: "Project Templates", description: "10 starter templates: Vanilla JS, Node.js, Express, Python, Flask, TypeScript, React, Next.js, HTML/CSS, Go." },
      { category: "feature", title: "Explore Page", description: "Browse public projects with search, language filters, and fork functionality." },
      { category: "improvement", title: "Dashboard Stats", description: "Project count, deployment stats, storage usage, and language breakdown." },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-20",
    entries: [
      { category: "feature", title: "Collaboration", description: "Invite collaborators with viewer, editor, or admin roles." },
      { category: "feature", title: "Deployments", description: "One-click deployment with status tracking and deploy history." },
      { category: "feature", title: "File Management", description: "Full CRUD operations with drag-and-drop, move, and recursive directory operations." },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-15",
    entries: [
      { category: "feature", title: "Initial Release", description: "Monaco Editor IDE with file tree, terminal UI, live preview, and Clerk authentication." },
      { category: "feature", title: "18+ Database Tables", description: "Complete data model for users, projects, files, templates, and more." },
    ],
  },
];

const categoryConfig: Record<Category, { icon: typeof Sparkles; label: string; color: string; bg: string }> = {
  feature: { icon: Sparkles, label: "New", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  fix: { icon: Bug, label: "Fixed", color: "text-red-400", bg: "bg-red-500/20" },
  improvement: { icon: TrendingUp, label: "Improved", color: "text-blue-400", bg: "bg-blue-500/20" },
};

function SubscribeBar() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/newsletter/subscribe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topic: "changelog" }),
      });
      if (res.ok) { toast({ title: "You're subscribed" }); setEmail(""); }
      else toast({ title: "Invalid email", variant: "destructive" });
    } finally { setBusy(false); }
  };
  return (
    <div className="mb-8 p-4 rounded-lg border border-border/40 bg-card/50 flex flex-col sm:flex-row items-center gap-3" data-testid="changelog-subscribe">
      <Mail className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-medium">Subscribe to release notes</p>
        <p className="text-xs text-muted-foreground">Get an email when we ship something new.</p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@dev.io" className="sm:w-56" data-testid="changelog-email" />
        <Button onClick={submit} disabled={busy || !email}>Subscribe</Button>
        <a href={`${API}/changelog/rss.xml`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border/40 hover:bg-muted/40" title="RSS" data-testid="changelog-rss"><Rss className="w-4 h-4" /></a>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  const [filter, setFilter] = useState<Category | "all">("all");

  const filtered = changelog.map((release) => ({
    ...release,
    entries: release.entries.filter((e) => filter === "all" || e.category === filter),
  })).filter((r) => r.entries.length > 0);

  return (
    <div className="min-h-screen bg-background" data-testid="changelog-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">CodeCloud</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Changelog</h1>
            <p className="text-muted-foreground mt-1">What's new in CodeCloud</p>
          </div>
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            {(["all", "feature", "fix", "improvement"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  filter === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All" : categoryConfig[cat].label}
              </button>
            ))}
          </div>
        </div>

        <SubscribeBar />

        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/30" />

          {filtered.map((release) => (
            <div key={release.version} className="relative pl-12 pb-10">
              <div className="absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full bg-primary border-4 border-background" />

              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xl font-bold">v{release.version}</h2>
                <time className="text-sm text-muted-foreground">{release.date}</time>
              </div>

              <div className="space-y-3">
                {release.entries.map((entry, i) => {
                  const config = categoryConfig[entry.category];
                  const Icon = config.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
