import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Globe, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/authStore";

interface CoverageRow {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  total: number;
  translated: number;
  missing: number;
  coverage: number;
  source: "hand" | "machine";
}

interface MissEntry {
  locale: string;
  key: string;
  count: number;
}

const API = (import.meta.env.VITE_API_URL as string | undefined) || "";

export default function AdminI18nPage() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [misses, setMisses] = useState<MissEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [translatingLocale, setTranslatingLocale] = useState<string | null>(null);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  async function load() {
    setLoading(true);
    try {
      const [coverageRes, missesRes] = await Promise.all([
        fetch(`${API}/api/i18n/coverage`, { credentials: "include", headers: authHeaders }).then((r) => r.json()),
        fetch(`${API}/api/i18n/misses`, { credentials: "include", headers: authHeaders }).then((r) => r.json()),
      ]);
      setRows(coverageRes.rows ?? []);
      setMisses(missesRes.misses ?? []);
    } catch {
      setRows([]);
      setMisses([]);
    } finally {
      setLoading(false);
    }
  }

  async function autoTranslate(locale: string) {
    setTranslatingLocale(locale);
    setAutoMessage(null);
    try {
      const r = await fetch(`${API}/api/i18n/auto-translate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ locale }),
      });
      const data = await r.json();
      if (!r.ok) {
        setAutoMessage(`${locale}: ${data.message || data.error || "Failed"}`);
      } else {
        setAutoMessage(`${locale}: +${data.added ?? 0} keys translated`);
        await load();
      }
    } catch (e) {
      setAutoMessage(`${locale}: ${(e as Error).message}`);
    } finally {
      setTranslatingLocale(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.nativeName.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const missesByLocale = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of misses) m.set(x.locale, (m.get(x.locale) ?? 0) + x.count);
    return m;
  }, [misses]);

  const handCount = rows.filter((r) => r.source === "hand").length;
  const fullyCovered = rows.filter((r) => r.coverage >= 99).length;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-i18n-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Admin
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="font-semibold">{t("admin.i18n.title")}</span>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2" data-testid="i18n-refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin.i18n.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.i18n.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Total locales</CardDescription><CardTitle className="text-3xl">{rows.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Hand-translated</CardDescription><CardTitle className="text-3xl">{handCount}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Fully covered (≥99%)</CardDescription><CardTitle className="text-3xl">{fullyCovered}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Runtime misses</CardDescription><CardTitle className="text-3xl">{misses.reduce((s, m) => s + m.count, 0)}</CardTitle></CardHeader></Card>
        </div>

        {autoMessage && (
          <div className="rounded border border-border/60 bg-accent/40 px-3 py-2 text-sm" data-testid="i18n-auto-banner">
            {autoMessage}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Coverage by locale</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter locales…"
                  className="pl-7 h-8 w-56"
                  data-testid="i18n-filter"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                    <th className="py-2 pr-4">{t("admin.i18n.locale")}</th>
                    <th className="py-2 pr-4">{t("admin.i18n.language")}</th>
                    <th className="py-2 pr-4">{t("admin.i18n.coverage")}</th>
                    <th className="py-2 pr-4">{t("admin.i18n.missing")}</th>
                    <th className="py-2 pr-4">{t("admin.i18n.misses")}</th>
                    <th className="py-2 pr-4">{t("admin.i18n.source")}</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.code} className="border-b border-border/30 hover:bg-accent/40" data-testid={`i18n-row-${r.code}`}>
                      <td className="py-2 pr-4 font-mono text-xs">{r.code}{r.dir === "rtl" && <span className="ml-1 text-amber-500">RTL</span>}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span dir={r.dir}>{r.nativeName}</span>
                          <span className="text-xs text-muted-foreground">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                            <div
                              className={`h-full ${r.coverage >= 99 ? "bg-emerald-500" : r.coverage >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.coverage}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums w-12 text-right">{r.coverage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{r.missing}</td>
                      <td className="py-2 pr-4 tabular-nums">{missesByLocale.get(r.code) ?? 0}</td>
                      <td className="py-2 pr-4">
                        {r.source === "hand" ? (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">{t("admin.i18n.hand")}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/40">{t("admin.i18n.machine")}</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {r.missing > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={translatingLocale === r.code}
                            onClick={() => autoTranslate(r.code)}
                            data-testid={`i18n-auto-${r.code}`}
                          >
                            {translatingLocale === r.code ? "Translating…" : "Auto-translate"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top runtime misses</CardTitle>
            <CardDescription>Translation keys requested by the client but missing in the bundle.</CardDescription>
          </CardHeader>
          <CardContent>
            {misses.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No misses recorded yet.</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {misses.slice(0, 50).map((m) => (
                  <li key={`${m.locale}:${m.key}`} className="py-2 flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground w-16">{m.locale}</span>
                    <span className="font-mono text-xs flex-1 truncate">{m.key}</span>
                    <span className="text-xs tabular-nums">{m.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
