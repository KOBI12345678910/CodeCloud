import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useLocation } from "wouter";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", company_name: "" });
  const { register, isLoading, error, setError } = useAuthStore();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ ...form, plan: "free" });
      navigate("/dashboard");
    } catch {}
  };

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">××¦××¨×£ ×-Kobi Business OS</h1>
          <p className="text-blue-200 text-sm">50,000+ ××××××× ×¢×¡×§××× â¢ ×× ×× ××××¦×¢××ª AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-3 text-sm text-center">{error}</div>
          )}

          <div>
            <label className="block text-sm text-blue-200 mb-1">×©× ×××</label>
            <input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="×©× ×××" required />
          </div>

          <div>
            <label className="block text-sm text-blue-200 mb-1">×©× ×××¨×</label>
            <input type="text" value={form.company_name} onChange={(e) => update("company_name", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="×©× ××××¨× (×××¤×¦××× ××)" />
          </div>

          <div>
            <label className="block text-sm text-blue-200 mb-1">××××××</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="your@email.com" required dir="ltr" />
          </div>

          <div>
            <label className="block text-sm text-blue-200 mb-1">×¡××¡××</label>
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="××¤×××ª 6 ×ª××××" required dir="ltr" minLength={6} />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-semibold rounded-lg transition-colors">
            {isLoading ? "×××¦×¨ ××©×××..." : "××¨×©×× ××× ×"}
          </button>
        </form>

        <p className="text-center text-blue-200 text-sm mt-6">
          ××© ×× ×××¨ ××©×××?{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300 underline" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>×× ××¡×</a>
        </p>
      </div>
    </div>
  );
}
