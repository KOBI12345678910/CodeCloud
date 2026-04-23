import { ArrowRight, BarChart3, TrendingUp, Users, Package } from "lucide-react";
import { useLocation } from "wouter";

export default function AnalyticsPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2">
          <ArrowRight className="w-4 h-4" /> ×××¨×
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> ×× ×××××§×¡
        </h1>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <TrendingUp className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">×× ×××××§×¡ ××ª×§××</h2>
          <p className="text-slate-500">××××× ××× ×××××§×¡ ×××¤×¢× ×¢× ××ª×§× ×ª ××××××× × ××¡×¤××. ××ª×§× ××××××× ×××©××§ ××× ××¨×××ª × ×ª×× ××.</p>
        </div>
      </main>
    </div>
  );
}
