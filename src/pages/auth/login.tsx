import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, setError } = useAuthStore();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Kobi Business OS</h1>
          <p className="text-blue-200 text-sm">××¤×××¤××¨×× ××¢×¡×§××ª ×××××× ××¢×××</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-3 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-blue-200 mb-1">××××××</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="your@email.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm text-blue-200 mb-1">×¡××¡××</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="â¢â¢â¢â¢â¢â¢â¢â¢"
              required
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? "××ª×××¨..." : "×× ××¡×"}
          </button>
        </form>

        <p className="text-center text-blue-200 text-sm mt-6">
          ××× ×× ××©×××?{" "}
          <a href="/register" className="text-blue-400 hover:text-blue-300 underline" onClick={(e) => { e.preventDefault(); navigate("/register"); }}>
            ××¨×©×× ××× ×
          </a>
        </p>
      </div>
    </div>
  );
}
