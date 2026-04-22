import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Puzzle, Search, Download, Star, CheckCircle2, Shield, Trash2, ExternalLink, Paintbrush, ShieldCheck, Bot, Palette, Container, Eye, GitBranch, Database, Send, FlaskConical, Terminal, Figma, Filter } from "lucide-react";

interface Extension {
  id: string; name: string; slug: string; description: string; author: string; category: string; version: string; downloads: number; rating: number; ratingCount: number; icon: string; price: number; isPremium: boolean; isVerified: boolean; isInstalled: boolean; tags: string[];
}

const ICONS: Record<string, any> = { Paintbrush, Shield: ShieldCheck, Bot, Palette, Container, Eye, GitBranch, Database, Send, FlaskConical, Terminal, Figma };

const EXTENSIONS: Extension[] = [
  { id: "1", name: "Prettier", slug: "prettier", description: "Opinionated code formatter for consistent styling", author: "Prettier Team", category: "formatters", version: "3.5.1", downloads: 2847561, rating: 4.9, ratingCount: 15243, icon: "Paintbrush", price: 0, isPremium: false, isVerified: true, isInstalled: true, tags: ["formatter"] },
  { id: "2", name: "ESLint", slug: "eslint", description: "Find and fix problems in your JavaScript/TypeScript code", author: "ESLint Foundation", category: "linters", version: "9.15.0", downloads: 3156892, rating: 4.8, ratingCount: 18924, icon: "Shield", price: 0, isPremium: false, isVerified: true, isInstalled: true, tags: ["linter"] },
  { id: "3", name: "GitHub Copilot", slug: "github-copilot", description: "AI pair programmer that suggests code completions", author: "GitHub", category: "ai", version: "1.245.0", downloads: 1923456, rating: 4.7, ratingCount: 12567, icon: "Bot", price: 10, isPremium: true, isVerified: true, isInstalled: false, tags: ["ai", "copilot"] },
  { id: "4", name: "Tailwind CSS IntelliSense", slug: "tailwindcss", description: "Intelligent Tailwind CSS tooling for your IDE", author: "Tailwind Labs", category: "css", version: "0.14.5", downloads: 1456789, rating: 4.9, ratingCount: 8934, icon: "Palette", price: 0, isPremium: false, isVerified: true, isInstalled: true, tags: ["tailwind", "css"] },
  { id: "5", name: "Docker Integration", slug: "docker", description: "Build, manage, and deploy containerized applications", author: "Microsoft", category: "devops", version: "1.32.0", downloads: 987654, rating: 4.6, ratingCount: 5678, icon: "Container", price: 0, isPremium: false, isVerified: true, isInstalled: false, tags: ["docker"] },
  { id: "6", name: "Live Preview", slug: "live-preview", description: "Real-time preview of your web application in-editor", author: "CodeCloud", category: "preview", version: "2.1.0", downloads: 2345678, rating: 4.8, ratingCount: 11234, icon: "Eye", price: 0, isPremium: false, isVerified: true, isInstalled: true, tags: ["preview"] },
  { id: "7", name: "GitLens", slug: "gitlens", description: "Supercharge Git with blame annotations and history", author: "GitKraken", category: "git", version: "16.2.0", downloads: 1567890, rating: 4.7, ratingCount: 9876, icon: "GitBranch", price: 0, isPremium: false, isVerified: true, isInstalled: false, tags: ["git"] },
  { id: "8", name: "Database Viewer Pro", slug: "db-viewer", description: "Visual database management with ER diagrams and query builder", author: "CodeCloud", category: "database", version: "3.0.0", downloads: 876543, rating: 4.9, ratingCount: 4567, icon: "Database", price: 5, isPremium: true, isVerified: true, isInstalled: false, tags: ["database"] },
  { id: "9", name: "REST Client", slug: "rest-client", description: "Send HTTP requests and view responses directly in editor", author: "Community", category: "api", version: "0.26.0", downloads: 1234567, rating: 4.6, ratingCount: 7654, icon: "Send", price: 0, isPremium: false, isVerified: false, isInstalled: false, tags: ["api"] },
  { id: "10", name: "AI Test Generator", slug: "ai-test", description: "Automatically generate unit tests using AI", author: "CodeCloud", category: "testing", version: "1.5.0", downloads: 654321, rating: 4.5, ratingCount: 3456, icon: "FlaskConical", price: 8, isPremium: true, isVerified: true, isInstalled: false, tags: ["testing", "ai"] },
  { id: "11", name: "Vim Keybindings", slug: "vim", description: "Vim emulation for the code editor", author: "Community", category: "keybindings", version: "1.28.0", downloads: 543210, rating: 4.4, ratingCount: 2345, icon: "Terminal", price: 0, isPremium: false, isVerified: false, isInstalled: false, tags: ["vim"] },
  { id: "12", name: "Figma to Code", slug: "figma", description: "Convert Figma designs into production-ready React code", author: "CodeCloud", category: "design", version: "2.0.0", downloads: 432198, rating: 4.8, ratingCount: 2890, icon: "Figma", price: 12, isPremium: true, isVerified: true, isInstalled: false, tags: ["figma", "design"] },
];

const CATEGORIES = ["all", "formatters", "linters", "ai", "css", "devops", "preview", "git", "database", "api", "testing", "keybindings", "design"];

function formatNum(n: number) { if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(0) + "K"; return n.toString(); }

export default function ExtensionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"popular" | "rating" | "newest">("popular");
  const [installed, setInstalled] = useState<Set<string>>(new Set(EXTENSIONS.filter(e => e.isInstalled).map(e => e.id)));

  let filtered = EXTENSIONS.filter(e => {
    if (category !== "all" && e.category !== category) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  if (sort === "popular") filtered.sort((a, b) => b.downloads - a.downloads);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);

  return (
    <FeaturePageLayout title="Extensions Marketplace" description="Enhance your IDE with powerful extensions and plugins" icon={<Puzzle className="w-7 h-7 text-white" />} badge={`${installed.size} Installed`}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-white">{EXTENSIONS.length}</p><p className="text-xs text-gray-400">Total Extensions</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-green-400">{installed.size}</p><p className="text-xs text-gray-400">Installed</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-yellow-400">{EXTENSIONS.filter(e => e.isPremium).length}</p><p className="text-xs text-gray-400">Premium</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-blue-400">{EXTENSIONS.filter(e => e.isVerified).length}</p><p className="text-xs text-gray-400">Verified</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search extensions..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as any)} className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${category === c ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ext => {
          const IconComp = ICONS[ext.icon] || Puzzle;
          const isInst = installed.has(ext.id);
          return (
            <div key={ext.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <IconComp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{ext.name}</p>
                    {ext.isVerified && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                    {ext.isPremium && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full flex-shrink-0">PRO</span>}
                  </div>
                  <p className="text-xs text-gray-500">{ext.author} · v{ext.version}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{ext.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{formatNum(ext.downloads)}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />{ext.rating}</span>
                </div>
                {isInst ? (
                  <button onClick={() => { const s = new Set(installed); s.delete(ext.id); setInstalled(s); }} className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors">
                    <Trash2 className="w-3 h-3" /> Uninstall
                  </button>
                ) : (
                  <button onClick={() => setInstalled(new Set([...installed, ext.id]))} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">
                    <Download className="w-3 h-3" /> {ext.price > 0 ? `$${ext.price}/mo` : "Install"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </FeaturePageLayout>
  );
}
