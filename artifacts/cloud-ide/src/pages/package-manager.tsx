import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Package, Search, Plus, Trash2, ArrowUp, Shield, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Download, Lock, Info } from "lucide-react";

interface PackageInfo { name: string; version: string; latest: string; description: string; license: string; size: string; downloads: string; isDev: boolean; hasUpdate: boolean; vulns: number; }

const PACKAGES: PackageInfo[] = [
  { name: "react", version: "19.1.0", latest: "19.1.0", description: "A JavaScript library for building user interfaces", license: "MIT", size: "2.5 KB", downloads: "23M/week", isDev: false, hasUpdate: false, vulns: 0 },
  { name: "react-dom", version: "19.1.0", latest: "19.1.0", description: "React package for working with the DOM", license: "MIT", size: "135 KB", downloads: "22M/week", isDev: false, hasUpdate: false, vulns: 0 },
  { name: "typescript", version: "5.6.3", latest: "5.8.2", description: "TypeScript is a language for application scale JavaScript development", license: "Apache-2.0", size: "22 MB", downloads: "15M/week", isDev: true, hasUpdate: true, vulns: 0 },
  { name: "tailwindcss", version: "3.4.15", latest: "4.1.0", description: "A utility-first CSS framework for rapid UI development", license: "MIT", size: "4.5 MB", downloads: "9M/week", isDev: true, hasUpdate: true, vulns: 0 },
  { name: "express", version: "5.2.1", latest: "5.2.1", description: "Fast, unopinionated, minimalist web framework", license: "MIT", size: "210 KB", downloads: "28M/week", isDev: false, hasUpdate: false, vulns: 0 },
  { name: "@tanstack/react-query", version: "5.62.0", latest: "5.75.0", description: "Hooks for fetching, caching and updating asynchronous data in React", license: "MIT", size: "1.2 MB", downloads: "4M/week", isDev: false, hasUpdate: true, vulns: 0 },
  { name: "lucide-react", version: "0.469.0", latest: "0.475.0", description: "Beautiful & consistent icon toolkit", license: "ISC", size: "45 MB", downloads: "3M/week", isDev: false, hasUpdate: true, vulns: 0 },
  { name: "zod", version: "3.24.0", latest: "3.24.0", description: "TypeScript-first schema validation with static type inference", license: "MIT", size: "520 KB", downloads: "12M/week", isDev: false, hasUpdate: false, vulns: 0 },
  { name: "drizzle-orm", version: "0.38.0", latest: "0.42.0", description: "Headless TypeScript ORM with a head", license: "Apache-2.0", size: "3.1 MB", downloads: "1.5M/week", isDev: false, hasUpdate: true, vulns: 0 },
  { name: "vite", version: "7.3.2", latest: "7.3.2", description: "Next Generation Frontend Tooling", license: "MIT", size: "8.2 MB", downloads: "14M/week", isDev: true, hasUpdate: false, vulns: 0 },
  { name: "jsonwebtoken", version: "9.0.2", latest: "9.0.2", description: "JSON Web Token implementation", license: "MIT", size: "85 KB", downloads: "16M/week", isDev: false, hasUpdate: false, vulns: 1 },
  { name: "stripe", version: "17.4.0", latest: "18.1.0", description: "Stripe API wrapper", license: "MIT", size: "4.8 MB", downloads: "2M/week", isDev: false, hasUpdate: true, vulns: 0 },
];

export default function PackageManagerPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "deps" | "dev" | "outdated" | "vulnerable">("all");
  const [installing, setInstalling] = useState(false);
  const [newPkg, setNewPkg] = useState("");

  let filtered = PACKAGES.filter(p => {
    if (search && !p.name.includes(search.toLowerCase())) return false;
    if (filter === "deps") return !p.isDev;
    if (filter === "dev") return p.isDev;
    if (filter === "outdated") return p.hasUpdate;
    if (filter === "vulnerable") return p.vulns > 0;
    return true;
  });

  const outdatedCount = PACKAGES.filter(p => p.hasUpdate).length;
  const vulnCount = PACKAGES.filter(p => p.vulns > 0).length;

  return (
    <FeaturePageLayout title="Package Manager" description="Visual package management for your project dependencies" icon={<Package className="w-7 h-7 text-white" />} badge={`${PACKAGES.length} Packages`}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-white">{PACKAGES.length}</p><p className="text-xs text-gray-400">Total Packages</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-blue-400">{PACKAGES.filter(p => !p.isDev).length}</p><p className="text-xs text-gray-400">Dependencies</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className={`text-2xl font-bold ${outdatedCount > 0 ? "text-yellow-400" : "text-green-400"}`}>{outdatedCount}</p><p className="text-xs text-gray-400">Outdated</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className={`text-2xl font-bold ${vulnCount > 0 ? "text-red-400" : "text-green-400"}`}>{vulnCount}</p><p className="text-xs text-gray-400">Vulnerabilities</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search installed packages..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div className="flex items-center gap-2">
          <input value={newPkg} onChange={e => setNewPkg(e.target.value)} placeholder="npm package name..." className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none w-48" />
          <button onClick={() => { if (newPkg) { setInstalling(true); setTimeout(() => setInstalling(false), 2000); setNewPkg(""); }}} className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
            {installing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Install
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "deps", "dev", "outdated", "vulnerable"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
            {f === "all" ? "All" : f === "deps" ? "Dependencies" : f === "dev" ? "Dev" : f === "outdated" ? `Outdated (${outdatedCount})` : `Vulnerable (${vulnCount})`}
          </button>
        ))}
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs rounded-lg transition-colors">
          <ArrowUp className="w-3 h-3" /> Update All ({outdatedCount})
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(pkg => (
          <div key={pkg.name} className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white font-mono">{pkg.name}</p>
                {pkg.isDev && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full">dev</span>}
                {pkg.vulns > 0 && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> {pkg.vulns} vuln</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">{pkg.description}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-white font-mono">{pkg.version}</p>
                {pkg.hasUpdate && <p className="text-[10px] text-yellow-400">{pkg.latest} available</p>}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500"><Download className="w-3 h-3" />{pkg.downloads}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500"><Lock className="w-3 h-3" />{pkg.license}</div>
              {pkg.hasUpdate ? (
                <button className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded-lg transition-colors"><ArrowUp className="w-3 h-3" /></button>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <button className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </FeaturePageLayout>
  );
}
