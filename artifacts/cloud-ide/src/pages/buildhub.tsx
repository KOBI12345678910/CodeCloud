import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, ArrowRight, Wand2, Zap, Code2, Palette,
  ShoppingBag, BarChart3, Users, MessageSquare, Plane, Calendar,
  Clock, Trash2,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

interface SavedBuild {
  id: string;
  prompt: string;
  createdAt: number;
  preview?: string;
}

const STORAGE_KEY = "buildhub:projects";

const EXAMPLES: { icon: any; label: string; prompt: string; gradient: string }[] = [
  {
    icon: ShoppingBag,
    label: "Online store",
    prompt: "A modern e-commerce landing page for a sustainable sneaker brand with a hero, featured products grid, brand story, and newsletter signup.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    label: "SaaS dashboard",
    prompt: "An analytics dashboard with sidebar navigation, KPI cards, a revenue chart, and a recent transactions table.",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: Users,
    label: "Team page",
    prompt: "A beautiful 'Meet the team' page for a design studio with founder bio, team grid, and open roles section.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: MessageSquare,
    label: "AI chat app",
    prompt: "A ChatGPT-style chat UI with sidebar of conversations, message bubbles, and a composer at the bottom.",
    gradient: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: Plane,
    label: "Travel landing",
    prompt: "A premium travel booking landing page for boutique hotels with hero search, destination cards, and testimonials.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Calendar,
    label: "Event site",
    prompt: "A tech conference website with countdown timer, speakers grid, agenda timeline, and ticket tiers.",
    gradient: "from-cyan-500 to-blue-500",
  },
];

function loadBuilds(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveBuilds(builds: SavedBuild[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
  } catch {
    /* ignore */
  }
}

export function createBuild(prompt: string): string {
  const id = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const builds = loadBuilds();
  builds.unshift({ id, prompt, createdAt: Date.now() });
  saveBuilds(builds.slice(0, 30));
  return id;
}

export default function BuildHubPage() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [builds, setBuilds] = useState<SavedBuild[]>([]);

  useEffect(() => {
    setBuilds(loadBuilds());
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const id = createBuild(trimmed);
    navigate(`/build/${id}`);
  };

  const handleExample = (ex: typeof EXAMPLES[number]) => {
    const id = createBuild(ex.prompt);
    navigate(`/build/${id}`);
  };

  const handleDelete = (id: string) => {
    const next = builds.filter((b) => b.id !== id);
    setBuilds(next);
    saveBuilds(next);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute top-[40%] -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/15 blur-[120px]" />
        <div className="absolute top-[60%] -left-40 w-[500px] h-[500px] rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      <Header />

      <main className="relative">
        {/* HERO + PROMPT */}
        <section className="px-6 pt-20 pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Powered by Claude — generate apps in seconds
            </div>

            <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Describe an app.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Watch it build itself.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
              BuildHub AI turns natural language into beautiful, functional web apps.
              Iterate with chat, see changes live, then drop into the IDE to extend it.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-3xl">
              <div className="relative group">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-purple-500/40 via-fuchsia-500/40 to-pink-500/40 opacity-60 blur-md group-focus-within:opacity-100 transition" />
                <div className="relative rounded-2xl border border-white/10 bg-[#13131a]/90 backdrop-blur-xl shadow-2xl">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmit();
                      }
                    }}
                    placeholder="A landing page for a meditation app with breathing animation, pricing, and testimonials…"
                    className="w-full resize-none rounded-2xl bg-transparent px-5 py-4 text-base text-white placeholder:text-white/35 outline-none min-h-[120px]"
                    rows={4}
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Wand2 className="w-3.5 h-3.5" />
                      Tip: be specific about style, sections, and content
                    </div>
                    <Button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/25 disabled:opacity-40"
                    >
                      Generate <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/30">⌘/Ctrl + Enter to generate</p>
            </form>
          </div>
        </section>

        {/* EXAMPLES */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Start from an example</h2>
                <p className="text-sm text-white/50 mt-1">
                  One click to see BuildHub in action
                </p>
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-xs text-white/40">
                <Zap className="w-3.5 h-3.5" />
                Average build: ~15s
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {EXAMPLES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <button
                    key={ex.label}
                    onClick={() => handleExample(ex)}
                    className="group relative text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-white/20 transition overflow-hidden"
                  >
                    <div
                      className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${ex.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition`}
                    />
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ex.gradient} flex items-center justify-center shadow-lg`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="mt-4 font-semibold text-white">{ex.label}</h3>
                      <p className="mt-1.5 text-sm text-white/55 line-clamp-2">{ex.prompt}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-white/50 group-hover:text-purple-300 transition">
                        Try it <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* RECENT BUILDS */}
        {builds.length > 0 && (
          <section className="px-6 pb-24">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl font-semibold mb-6">Your recent builds</h2>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {builds.map((b) => (
                  <div
                    key={b.id}
                    className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
                      <Code2 className="w-5 h-5 text-purple-300" />
                    </div>
                    <Link
                      href={`/build/${b.id}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm text-white line-clamp-2">{b.prompt}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/40">
                        <Clock className="w-3 h-3" />
                        {new Date(b.createdAt).toLocaleString()}
                      </div>
                    </Link>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FEATURE STRIP */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {[
                {
                  icon: Wand2,
                  title: "Prompt-to-app",
                  body: "Describe what you want in plain English. Get a working app in seconds.",
                  color: "text-purple-400",
                },
                {
                  icon: Palette,
                  title: "Beautiful by default",
                  body: "Modern design, dark mode, gradients, animations — production-ready aesthetics.",
                  color: "text-pink-400",
                },
                {
                  icon: Code2,
                  title: "Drop into the IDE",
                  body: "Hand off to the full Cloud IDE to extend, deploy, and ship to users.",
                  color: "text-blue-400",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <Icon className={`w-6 h-6 ${f.color}`} />
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-white/55">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
