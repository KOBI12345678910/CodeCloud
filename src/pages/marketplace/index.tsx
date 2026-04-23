import { useEffect, useState } from "react";
import { useModuleStore } from "@/stores/module-store";
import { useAuthStore } from "@/stores/auth-store";
import { Search, Package, Star, Download, ArrowRight, Filter } from "lucide-react";
import { useLocation } from "wouter";

export default function MarketplacePage() {
  const { modules, categories, isLoading, fetchModules, fetchCategories, installModule } = useModuleStore();
  const { tenant } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => { fetchCategories(); fetchModules(); }, []);

  const handleSearch = () => fetchModules(search || undefined, selectedCat || undefined);
  const handleCategory = (cat: string | null) => { setSelectedCat(cat); fetchModules(search || undefined, cat || undefined); };

  const handleInstall = async (moduleKey: string) => {
    if (!tenant?.id) return;
    try {
      await installModule(tenant.id, moduleKey);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-blue-700 to-purple-700 text-white px-6 py-8">
        <button onClick={() => navigate("/dashboard")} className="text-blue-200 hover:text-white text-sm mb-4 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> ×××¨× ×××©×××¨×
        </button>
        <h1 className="text-3xl font-bold mb-2">ðª ×©××§ ××××××××</h1>
        <p className="text-blue-200">50,000+ ××××××× ×¢×¡×§××× â¢ 245 ×§××××¨×××ª â¢ ××ª×§× × ×××××¦×</p>

        <div className="flex gap-2 mt-6 max-w-2xl">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-3 w-5 h-5 text-white/40" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pr-10 pl-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="××¤×© ×××××××..." />
          </div>
          <button onClick={handleSearch} className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">××¤×©</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 flex gap-6">
        {/* Categories Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" /> ×§××××¨×××ª ({categories.length})
          </h3>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            <button onClick={() => handleCategory(null)}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCat ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
              ×××
            </button>
            {categories.slice(0, 50).map((c) => (
              <button key={c.category} onClick={() => handleCategory(c.category)}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${selectedCat === c.category ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                {c.category} <span className="text-xs opacity-60">({c.count})</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Modules Grid */}
        <main className="flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500">×××¢× ×××××××...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">×× × ××¦×× ×××××××</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{m.icon || "ð¦"}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.price_monthly === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {m.price_monthly === 0 ? "××× ×" : `$${m.price_monthly}/××××©`}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-1">{m.name_he || m.name_en}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{m.description_he || m.description_en}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{m.category}</span>
                    <button onClick={() => handleInstall(m.key)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 font-medium">
                      <Download className="w-4 h-4" /> ××ª×§×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
