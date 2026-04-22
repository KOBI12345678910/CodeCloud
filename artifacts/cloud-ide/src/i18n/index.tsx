import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LANGUAGES,
  LANG_BY_CODE,
  isSupported,
  resolveLocale,
  interpolate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatTimeAgo,
  pluralCategory,
  type ResourceBundle,
  type Namespace,
} from "@workspace/i18n";
import enCommon from "@workspace/i18n/locales/en/common.json";

const COOKIE = "cc_locale";
const STORAGE_KEY = "cc_locale";
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "";

const ALL_LOCALE_FILES = import.meta.glob<ResourceBundle>(
  "../../../../lib/i18n/src/locales/*/common.json",
  { import: "default" },
);

function localeFromGlobKey(key: string): string {
  const m = key.match(/locales\/([^/]+)\/common\.json/);
  return m ? m[1] : "";
}

interface I18nState {
  locale: string;
  bundles: Record<string, Record<Namespace, ResourceBundle>>;
  isMachine: boolean;
  ready: boolean;
  changeLanguage: (code: string) => Promise<void>;
  t: (key: string, params?: Record<string, unknown> | { defaultValue?: string } & Record<string, unknown>) => string;
  fmt: {
    number: (n: number, opts?: Intl.NumberFormatOptions) => string;
    currency: (n: number, currency?: string, opts?: Intl.NumberFormatOptions) => string;
    date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
    relativeTime: (n: number, unit: Intl.RelativeTimeFormatUnit) => string;
    timeAgo: (d: Date | string | number) => string;
    plural: (n: number) => Intl.LDMLPluralRule;
  };
}

const I18nContext = createContext<I18nState | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(`${name}=`)) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${oneYear}; path=/; SameSite=Lax`;
}

function detectInitialLocale(): string {
  const fromCookie = readCookie(COOKIE);
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  const navLangs: string[] =
    typeof navigator !== "undefined"
      ? (navigator.languages?.length ? Array.from(navigator.languages) : navigator.language ? [navigator.language] : [])
      : [];
  return resolveLocale([fromCookie, stored, ...navLangs, DEFAULT_LOCALE]);
}

function applyHtml(locale: string) {
  if (typeof document === "undefined") return;
  const lang = LANG_BY_CODE[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = lang?.dir ?? "ltr";
}

function reportMiss(key: string, locale: string) {
  if (!API_URL) return;
  try {
    fetch(`${API_URL}/api/i18n/misses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, locale }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

const missDebounce = new Set<string>();

async function loadBundle(locale: string): Promise<ResourceBundle | null> {
  const target = Object.entries(ALL_LOCALE_FILES).find(([k]) => localeFromGlobKey(k) === locale);
  if (!target) return null;
  try {
    const mod = await target[1]();
    return mod as ResourceBundle;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>(() => detectInitialLocale());
  const [bundles, setBundles] = useState<Record<string, Record<Namespace, ResourceBundle>>>(() => ({
    en: { common: enCommon as ResourceBundle },
  }));
  const [ready, setReady] = useState(true);

  const ensureLocale = useCallback(async (code: string): Promise<ResourceBundle | null> => {
    if (bundles[code]?.common) return bundles[code].common;
    const b = await loadBundle(code);
    if (b) {
      setBundles((prev) => ({ ...prev, [code]: { common: b } }));
    }
    return b;
  }, [bundles]);

  useEffect(() => {
    applyHtml(locale);
    if (locale !== "en" && !bundles[locale]) {
      setReady(false);
      ensureLocale(locale).finally(() => setReady(true));
    }
  }, [locale, bundles, ensureLocale]);

  // Restore locale from authenticated user on login / session bootstrap.
  // If the user has no stored locale, persist the currently-detected one
  // so first-visit detection survives across devices/sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail && isSupported(detail)) {
        if (detail !== locale) void changeLanguageRef.current(detail);
      } else {
        // Empty/missing user.locale → persist currently-detected one so the
        // user record stores their first-visit language.
        void changeLanguageRef.current(locale);
      }
    };
    window.addEventListener("cc:locale-from-auth", handler as EventListener);
    return () => window.removeEventListener("cc:locale-from-auth", handler as EventListener);
  }, [locale]);

  const changeLanguageRef = useRef<(code: string) => Promise<void>>(async () => undefined);

  const changeLanguage = useCallback(async (code: string) => {
    const resolved = isSupported(code) ? code : resolveLocale([code]);
    setReady(false);
    await ensureLocale(resolved);
    setLocale(resolved);
    writeCookie(COOKIE, resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch {
      /* ignore */
    }
    if (API_URL) {
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          fetch(`${API_URL}/api/profile/locale`, {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ locale: resolved }),
          }).catch(() => undefined);
        }
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, [ensureLocale]);

  useEffect(() => {
    changeLanguageRef.current = changeLanguage;
  }, [changeLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      const ns: Namespace = "common";
      const tryLocales = [locale, FALLBACK_LOCALE];
      for (const code of tryLocales) {
        const bundle = bundles[code]?.[ns];
        if (!bundle) continue;
        const v = bundle[key];
        if (typeof v === "string") return interpolate(v, params);
      }
      const dv = (params as { defaultValue?: string } | undefined)?.defaultValue;
      if (!missDebounce.has(`${locale}:${key}`)) {
        missDebounce.add(`${locale}:${key}`);
        reportMiss(key, locale);
      }
      return interpolate(dv ?? key, params);
    },
    [bundles, locale],
  );

  const fmt = useMemo(
    () => ({
      number: (n: number, opts?: Intl.NumberFormatOptions) => formatNumber(locale, n, opts),
      currency: (n: number, currency = "USD", opts?: Intl.NumberFormatOptions) =>
        formatCurrency(locale, n, currency, opts),
      date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => formatDate(locale, d, opts),
      relativeTime: (n: number, unit: Intl.RelativeTimeFormatUnit) => formatRelativeTime(locale, n, unit),
      timeAgo: (d: Date | string | number) => formatTimeAgo(locale, d),
      plural: (n: number) => pluralCategory(locale, n),
    }),
    [locale],
  );

  const isMachine = bundles[locale]?.common?._meta?.machine === true;

  const value: I18nState = useMemo(
    () => ({ locale, bundles, isMachine, ready, changeLanguage, t, fmt }),
    [locale, bundles, isMachine, ready, changeLanguage, t, fmt],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside <I18nProvider>");
  return {
    t: ctx.t,
    i18n: { language: ctx.locale, changeLanguage: ctx.changeLanguage, isMachine: ctx.isMachine, ready: ctx.ready },
    fmt: ctx.fmt,
  };
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export { LANGUAGES, LANG_BY_CODE };
