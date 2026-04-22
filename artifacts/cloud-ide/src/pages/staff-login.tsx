import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignIn } from "@clerk/react";
import { Shield, Eye, EyeOff, Code2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StaffLoginPage() {
  const [, navigate] = useLocation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLoaded || !signIn || !setActive) {
      setError("המערכת לא מוכנה. נסה שוב בעוד רגע.");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate("/staff");
      } else {
        setError("נדרש אימות נוסף. נסה שוב.");
      }
    } catch {
      setError("אימייל או סיסמה שגויים. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-6" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="relative w-full max-w-md">
        <Link href="/">
          <Button variant="ghost" size="sm" className="absolute -top-12 right-0 text-zinc-400 gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> חזרה לאתר
          </Button>
        </Link>

        <Card className="bg-zinc-900/80 border-zinc-700/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">כניסת עובדים</h1>
            <p className="text-sm text-zinc-400 mt-1">פורטל ניהול CodeCloud — גישה מורשית בלבד</p>
            <div className="flex items-center gap-2 justify-center mt-3">
              <div className="h-px flex-1 bg-zinc-700" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Staff Only</span>
              </div>
              <div className="h-px flex-1 bg-zinc-700" />
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center" data-testid="staff-login-error" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">אימייל ארגוני</label>
                <Input
                  type="email"
                  placeholder="you@codecloud.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-1.5">סיסמה</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:ring-red-500/20 pl-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500/20" />
                  זכור אותי
                </label>
                <Link href="/forgot-password" className="text-red-400 hover:text-red-300 transition">שכחת סיסמה?</Link>
              </div>

              <Button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white h-11 text-base font-medium shadow-lg shadow-red-500/20">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "כניסה למערכת"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <div className="text-center text-xs text-zinc-500">
                הגישה מוגבלת לעובדי CodeCloud בלבד.
                <br />ניסיונות כניסה לא מורשים נרשמים ומנוטרים.
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Shield className="w-3 h-3" /> SSL מוצפן
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Code2 className="w-3 h-3" /> v2.1.0
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/sign-in" className="text-sm text-zinc-500 hover:text-zinc-400 transition">
            לקוח? כנס כאן →
          </Link>
        </div>
      </div>
    </div>
  );
}
