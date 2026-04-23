import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { ArrowRight, User, Building, Globe, Palette, Key, Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const { language, setLanguage, theme, setTheme } = useUIStore();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2">
          <ArrowRight className="w-4 h-4" /> ×××¨× ×××©×××¨×
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">××××¨××ª</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Profile */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white mb-4">
            <User className="w-5 h-5" /> ×¤×¨××¤××
          </h2>
          <div className="space-y-3">
            <div><span className="text-sm text-slate-500">×©×:</span> <span className="text-slate-800 dark:text-white mr-2">{user?.display_name}</span></div>
            <div><span className="text-sm text-slate-500">××××××:</span> <span className="text-slate-800 dark:text-white mr-2" dir="ltr">{user?.email}</span></div>
            <div><span className="text-sm text-slate-500">×ª×¤×§××:</span> <span className="text-slate-800 dark:text-white mr-2">{user?.role}</span></div>
          </div>
        </section>

        {/* Tenant */}
        {tenant && (
          <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white mb-4">
              <Building className="w-5 h-5" /> ××¨×××
            </h2>
            <div className="space-y-3">
              <div><span className="text-sm text-slate-500">×©×:</span> <span className="text-slate-800 dark:text-white mr-2">{tenant.name}</span></div>
              <div><span className="text-sm text-slate-500">×ª××× ××ª:</span> <span className="text-slate-800 dark:text-white mr-2">{tenant.plan}</span></div>
              <div><span className="text-sm text-slate-500">×¡×××:</span> <span className="text-slate-800 dark:text-white mr-2" dir="ltr">{tenant.slug}</span></div>
            </div>
          </section>
        )}

        {/* Language & Theme */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white mb-4">
            <Palette className="w-5 h-5" /> ×ª×¦××× ××©×¤×
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-500 block mb-1">×©×¤×</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white">
                <option value="he">×¢××¨××ª</option>
                <option value="en">English</option>
                <option value="ar">Ø§ÙØ¹Ø±Ø¨ÙØ©</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500 block mb-1">×¢×¨××ª × ××©×</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value as any)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white">
                <option value="system">××¢×¨××ª</option>
                <option value="light">××××¨</option>
                <option value="dark">×××</option>
              </select>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
