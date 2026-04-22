import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Palette, Check, Sun, Moon, Monitor, Download, Star, Eye, Paintbrush, Sparkles, Sliders } from "lucide-react";

interface Theme {
  id: string; name: string; author: string; category: "dark" | "light" | "high-contrast"; colors: { bg: string; fg: string; accent: string; sidebar: string; editor: string; terminal: string; }; downloads: number; rating: number; isActive: boolean; isPremium: boolean; preview: string[];
}

const THEMES: Theme[] = [
  { id: "t1", name: "CodeCloud Dark", author: "CodeCloud", category: "dark", colors: { bg: "#0a0f1e", fg: "#e2e8f0", accent: "#3b82f6", sidebar: "#0f1629", editor: "#0c1222", terminal: "#080d1a" }, downloads: 0, rating: 5.0, isActive: true, isPremium: false, preview: ["#0a0f1e", "#1e293b", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"] },
  { id: "t2", name: "Dracula", author: "Dracula Theme", category: "dark", colors: { bg: "#282a36", fg: "#f8f8f2", accent: "#bd93f9", sidebar: "#21222c", editor: "#282a36", terminal: "#1e1f29" }, downloads: 2456000, rating: 4.9, isActive: false, isPremium: false, preview: ["#282a36", "#44475a", "#bd93f9", "#50fa7b", "#f1fa8c", "#ff5555"] },
  { id: "t3", name: "One Dark Pro", author: "binaryify", category: "dark", colors: { bg: "#282c34", fg: "#abb2bf", accent: "#61afef", sidebar: "#21252b", editor: "#282c34", terminal: "#1e2127" }, downloads: 1897000, rating: 4.8, isActive: false, isPremium: false, preview: ["#282c34", "#3e4451", "#61afef", "#98c379", "#e5c07b", "#e06c75"] },
  { id: "t4", name: "GitHub Dark", author: "GitHub", category: "dark", colors: { bg: "#0d1117", fg: "#c9d1d9", accent: "#58a6ff", sidebar: "#161b22", editor: "#0d1117", terminal: "#010409" }, downloads: 1234000, rating: 4.7, isActive: false, isPremium: false, preview: ["#0d1117", "#161b22", "#58a6ff", "#3fb950", "#d29922", "#f85149"] },
  { id: "t5", name: "Monokai Pro", author: "monokai", category: "dark", colors: { bg: "#2d2a2e", fg: "#fcfcfa", accent: "#ffd866", sidebar: "#221f22", editor: "#2d2a2e", terminal: "#1a181a" }, downloads: 987000, rating: 4.8, isActive: false, isPremium: true, preview: ["#2d2a2e", "#403e41", "#ffd866", "#a9dc76", "#78dce8", "#ff6188"] },
  { id: "t6", name: "Catppuccin Mocha", author: "Catppuccin", category: "dark", colors: { bg: "#1e1e2e", fg: "#cdd6f4", accent: "#89b4fa", sidebar: "#181825", editor: "#1e1e2e", terminal: "#11111b" }, downloads: 876000, rating: 4.9, isActive: false, isPremium: false, preview: ["#1e1e2e", "#313244", "#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8"] },
  { id: "t7", name: "Solarized Light", author: "Ethan Schoonover", category: "light", colors: { bg: "#fdf6e3", fg: "#657b83", accent: "#268bd2", sidebar: "#eee8d5", editor: "#fdf6e3", terminal: "#f5efdc" }, downloads: 654000, rating: 4.5, isActive: false, isPremium: false, preview: ["#fdf6e3", "#eee8d5", "#268bd2", "#859900", "#b58900", "#dc322f"] },
  { id: "t8", name: "Light+", author: "CodeCloud", category: "light", colors: { bg: "#ffffff", fg: "#1e1e1e", accent: "#0078d4", sidebar: "#f3f3f3", editor: "#ffffff", terminal: "#f0f0f0" }, downloads: 543000, rating: 4.4, isActive: false, isPremium: false, preview: ["#ffffff", "#f3f3f3", "#0078d4", "#22863a", "#e36209", "#d73a49"] },
  { id: "t9", name: "Tokyo Night", author: "enkia", category: "dark", colors: { bg: "#1a1b26", fg: "#a9b1d6", accent: "#7aa2f7", sidebar: "#16161e", editor: "#1a1b26", terminal: "#13131d" }, downloads: 765000, rating: 4.8, isActive: false, isPremium: false, preview: ["#1a1b26", "#24283b", "#7aa2f7", "#9ece6a", "#e0af68", "#f7768e"] },
  { id: "t10", name: "High Contrast", author: "CodeCloud", category: "high-contrast", colors: { bg: "#000000", fg: "#ffffff", accent: "#00ff00", sidebar: "#0a0a0a", editor: "#000000", terminal: "#000000" }, downloads: 234000, rating: 4.3, isActive: false, isPremium: false, preview: ["#000000", "#1a1a1a", "#00ff00", "#00ffff", "#ffff00", "#ff0000"] },
];

function formatNum(n: number) { if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(0) + "K"; return n.toString(); }

export default function ThemesPage() {
  const [active, setActive] = useState("t1");
  const [category, setCategory] = useState<"all" | "dark" | "light" | "high-contrast">("all");
  const [search, setSearch] = useState("");

  let filtered = THEMES.filter(t => {
    if (category !== "all" && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <FeaturePageLayout title="Themes" description="Customize your IDE appearance with beautiful themes" icon={<Palette className="w-7 h-7 text-white" />} badge={THEMES.find(t => t.id === active)?.name || ""}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search themes..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {(["all", "dark", "light", "high-contrast"] as const).map(c => {
            const Icon = c === "dark" ? Moon : c === "light" ? Sun : c === "high-contrast" ? Monitor : Sparkles;
            return (
              <button key={c} onClick={() => setCategory(c)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all capitalize ${category === c ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                <Icon className="w-3 h-3" />{c === "high-contrast" ? "HC" : c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(theme => (
          <div key={theme.id} onClick={() => setActive(theme.id)} className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${active === theme.id ? "border-blue-500 ring-2 ring-blue-500/30" : "border-white/10 hover:border-white/20"}`}>
            <div className="h-28 relative" style={{ background: theme.colors.bg }}>
              <div className="absolute inset-0 flex">
                <div className="w-1/4 h-full" style={{ background: theme.colors.sidebar }}>
                  <div className="p-2 space-y-1.5">
                    {[1,2,3,4].map(i => <div key={i} className="h-1.5 rounded-full opacity-30" style={{ background: theme.colors.fg, width: `${50 + Math.random() * 40}%` }} />)}
                  </div>
                </div>
                <div className="flex-1 p-2">
                  <div className="space-y-1">
                    {theme.preview.slice(2).map((c, i) => <div key={i} className="h-1.5 rounded-full" style={{ background: c, width: `${30 + Math.random() * 60}%`, opacity: 0.7 }} />)}
                  </div>
                </div>
              </div>
              {active === theme.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
              )}
              {theme.isPremium && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full">PRO</div>
              )}
            </div>
            <div className="p-3 bg-white/5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{theme.name}</p>
                <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-500" fill="currentColor" /><span className="text-xs text-gray-400">{theme.rating}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{theme.author}</span>
                <div className="flex gap-1">{theme.preview.map((c, i) => <div key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ background: c }} />)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </FeaturePageLayout>
  );
}
