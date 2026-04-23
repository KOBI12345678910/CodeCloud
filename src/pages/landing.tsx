import { useLocation } from "wouter";
import { Bot, Package, Zap, Globe, Shield, Star, ArrowLeft, ChevronDown } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const features = [
    { icon: Package, title: "50,000+ ×××××××", desc: "××§×××× ××××× ××¢××× ×©× ××××××× ×¢×¡×§××× ×××× ×× ×××ª×§× ×" },
    { icon: Bot, title: "×× ×× ××××¦×¢××ª AI", desc: "×¡×¤×¨ ×-AI ×× ××ª× ×¦×¨×× ×××× ××× × ××ª ×××¢×¨××ª ××©××××" },
    { icon: Zap, title: "××× ××××¢×", desc: "××¤×¡ ×§××, ××¤×¡ ××××¢× ×××©××ª. ××× ×××× ××©××××© ×××××" },
    { icon: Globe, title: "245 ×§××××¨×××ª", desc: "×× ×ª×¢×©×××, ×× ××××¨, ×× ×¡×× ×¢×¡×§ â ××××¡×" },
    { icon: Shield, title: "××××× ××¨××× ××ª", desc: "Row Level Security, ××¦Ö¤× ×, multi-tenant isolation" },
    { icon: Star, title: "×ª××× ××ª ××× ×", desc: "××ª×× ×××× × ×¢× 5 ×××××××. ×©××¨× ××©×ª×××" },
  ];

  const stats = [
    { value: "50,945", label: "×××××××" },
    { value: "245", label: "×§××××¨×××ª" },
    { value: "â", label: "××¤×©×¨××××ª" },
    { value: "0", label: "×§×× × ××¨×©" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">K</div>
          <span className="font-bold text-xl">Kobi Business OS</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="px-4 py-2 text-sm text-slate-300 hover:text-white">×× ××¡×</button>
          <button onClick={() => navigate("/register")} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            ××ª×× ×××× ×
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
          <Zap className="w-4 h-4" /> ××¤×××¤××¨×× ××¢×¡×§××ª ×××××× ××¢×××
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          ×× × ××¢×¨××ª ×¢×¡×§××ª ×©×××
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">×¢× ×©×××ª AI ×××ª</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          50,000+ ××××××× ×××× ××. 245 ×§××××¨×××ª. ××¤×¡ ××××¢× ×××©××ª.
          ×¤×©×× ×¡×¤×¨ ×-AI ×× ××¢×¡×§ ×©×× ×¦×¨×× â ××××¢×¨××ª ×ª××× × ×××.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate("/register")}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all hover:scale-105">
            ××ª×× ××× ××ª ×××× × <ArrowLeft className="w-5 h-5 inline mr-2" />
          </button>
          <button onClick={() => navigate("/marketplace")}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors">
            ××× ×××ï¿½ï¿½×××
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">××× Kobi Business OS?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <f.icon className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-20">
        <h2 className="text-3xl font-bold mb-4">×××× ××× ××ª ××ª ×××¢×¨××ª ×©××?</h2>
        <p className="text-slate-400 mb-8">××¦××¨×£ ××××¤× ×¢×¢G§×× ×©×××¨ ××©×ª××©×× ×-Kobi Business OS</p>
        <button onClick={() => navigate("/register")}
          className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg hover:scale-105 transition-transform">
          ××ª×× ×××× × ×¢××©××
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        Â© 2026 Kobi Business OS by Kobi Elkayam. All rights reserved.
      </footer>
    </div>
  );
}
