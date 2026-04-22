import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Users, Heart, MessageSquare, Eye, ExternalLink, Search, TrendingUp, Award, Star, Flame, Clock, Filter, Globe, Sparkles } from "lucide-react";

interface ShowcaseProject {
  id: string; title: string; description: string; author: string; authorAvatar: string; image: string; likes: number; comments: number; views: number; tags: string[]; category: string; featured: boolean; createdAt: string;
}

const PROJECTS: ShowcaseProject[] = [
  { id: "1", title: "AI-Powered Task Manager", description: "A beautiful task management app with AI prioritization, natural language input, and smart scheduling", author: "Sarah Chen", authorAvatar: "SC", image: "", likes: 2453, comments: 189, views: 45200, tags: ["React", "AI", "Tailwind"], category: "productivity", featured: true, createdAt: "2026-04-20T00:00:00Z" },
  { id: "2", title: "Real-time Crypto Dashboard", description: "Live cryptocurrency tracking with interactive charts, portfolio management, and price alerts", author: "Marco Silva", authorAvatar: "MS", image: "", likes: 1876, comments: 134, views: 32100, tags: ["Vue", "WebSocket", "Charts"], category: "finance", featured: true, createdAt: "2026-04-18T00:00:00Z" },
  { id: "3", title: "Multiplayer Drawing Game", description: "Draw and guess game with real-time multiplayer support, custom rooms, and leaderboards", author: "Yuki Tanaka", authorAvatar: "YT", image: "", likes: 3201, comments: 267, views: 67800, tags: ["Canvas", "Socket.io", "Game"], category: "games", featured: true, createdAt: "2026-04-15T00:00:00Z" },
  { id: "4", title: "E-commerce Storefront", description: "Full-featured online store with Stripe payments, inventory management, and admin dashboard", author: "Alex Johnson", authorAvatar: "AJ", image: "", likes: 1234, comments: 98, views: 21500, tags: ["Next.js", "Stripe", "PostgreSQL"], category: "ecommerce", featured: false, createdAt: "2026-04-19T00:00:00Z" },
  { id: "5", title: "Music Production Studio", description: "Browser-based DAW with virtual instruments, effects, and real-time collaboration", author: "DJ Byte", authorAvatar: "DB", image: "", likes: 4567, comments: 345, views: 89200, tags: ["Web Audio", "React", "MIDI"], category: "music", featured: true, createdAt: "2026-04-12T00:00:00Z" },
  { id: "6", title: "Fitness Tracking App", description: "Track workouts, nutrition, and progress with AI-generated workout plans", author: "Lisa Park", authorAvatar: "LP", image: "", likes: 987, comments: 76, views: 15600, tags: ["React Native", "AI", "Health"], category: "health", featured: false, createdAt: "2026-04-17T00:00:00Z" },
  { id: "7", title: "Code Snippet Manager", description: "Organize, search, and share code snippets with syntax highlighting and team collaboration", author: "Dev Tools Inc", authorAvatar: "DT", image: "", likes: 1543, comments: 112, views: 28900, tags: ["TypeScript", "Monaco", "Share"], category: "developer", featured: false, createdAt: "2026-04-16T00:00:00Z" },
  { id: "8", title: "AI Resume Builder", description: "Create professional resumes with AI-powered content suggestions and beautiful templates", author: "Career AI", authorAvatar: "CA", image: "", likes: 2109, comments: 178, views: 41300, tags: ["AI", "PDF", "Templates"], category: "productivity", featured: false, createdAt: "2026-04-14T00:00:00Z" },
  { id: "9", title: "Weather Visualization", description: "Beautiful 3D weather maps with forecasts, radar, and severe weather alerts", author: "Sky Data", authorAvatar: "SD", image: "", likes: 876, comments: 54, views: 12400, tags: ["Three.js", "API", "Maps"], category: "data", featured: false, createdAt: "2026-04-13T00:00:00Z" },
];

const CATEGORIES = ["all", "productivity", "finance", "games", "ecommerce", "music", "health", "developer", "data"];
const GRADIENT_COLORS = ["from-blue-600 to-purple-600", "from-green-600 to-teal-600", "from-orange-600 to-red-600", "from-pink-600 to-rose-600", "from-indigo-600 to-blue-600", "from-yellow-600 to-orange-600", "from-emerald-600 to-green-600", "from-violet-600 to-purple-600", "from-cyan-600 to-blue-600"];

function formatNum(n: number) { if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return n.toString(); }

export default function CommunityPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"trending" | "popular" | "newest">("trending");

  let filtered = PROJECTS.filter(p => {
    if (category !== "all" && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  if (sort === "popular") filtered.sort((a, b) => b.likes - a.likes);
  else if (sort === "newest") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <FeaturePageLayout title="Community" description="Discover amazing projects built by the CodeCloud community" icon={<Users className="w-7 h-7 text-white" />} badge="Open">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-white">156K</p><p className="text-xs text-gray-400">Creators</p></div>
        <div className="p-4 bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-white">423K</p><p className="text-xs text-gray-400">Projects</p></div>
        <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-white">2.1M</p><p className="text-xs text-gray-400">Forks</p></div>
        <div className="p-4 bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-white">8.7M</p><p className="text-xs text-gray-400">Total Views</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search community projects..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {([["trending", Flame], ["popular", TrendingUp], ["newest", Clock]] as const).map(([s, Icon]) => (
            <button key={s} onClick={() => setSort(s as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all capitalize ${sort === s ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              <Icon className="w-3 h-3" />{s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${category === c ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project, i) => (
          <div key={project.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] transition-all group cursor-pointer">
            <div className={`h-36 bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} flex items-center justify-center relative`}>
              {project.featured && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full"><Award className="w-3 h-3" /> Featured</div>
              )}
              <Sparkles className="w-12 h-12 text-white/30" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">{project.authorAvatar}</div>
                <span className="text-xs text-gray-500">{project.author}</span>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">{project.title}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {project.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-white/5 text-gray-500 text-[10px] rounded-full">{t}</span>)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(project.likes)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{project.comments}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNum(project.views)}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </FeaturePageLayout>
  );
}
