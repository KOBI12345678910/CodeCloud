import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LANGUAGES,
  isSupported,
} from "@workspace/i18n";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localeRoot(): string {
  const candidates = [
    path.resolve(__dirname, "../../../../lib/i18n/src/locales"),
    path.resolve(__dirname, "../../../../../lib/i18n/src/locales"),
    path.resolve(process.cwd(), "lib/i18n/src/locales"),
    path.resolve(process.cwd(), "../../lib/i18n/src/locales"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const ROOT = localeRoot();
const cache = new Map<string, Record<string, string> | null>();

export function loadServerBundle(locale: string): Record<string, string> | null {
  if (cache.has(locale)) return cache.get(locale) ?? null;
  const file = path.join(ROOT, locale, "common.json");
  try {
    if (!fs.existsSync(file)) {
      cache.set(locale, null);
      return null;
    }
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "_meta") continue;
      if (typeof v === "string") flat[k] = v;
    }
    cache.set(locale, flat);
    return flat;
  } catch {
    cache.set(locale, null);
    return null;
  }
}

export function invalidateBundle(locale?: string): void {
  if (locale) {
    cache.delete(locale);
  } else {
    cache.clear();
  }
}

export function getLocaleMeta(locale: string): { machine: boolean } {
  const file = path.join(ROOT, locale, "common.json");
  try {
    if (!fs.existsSync(file)) return { machine: false };
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as { _meta?: { machine?: boolean } };
    return { machine: parsed._meta?.machine === true };
  } catch {
    return { machine: false };
  }
}

export function listAvailableLocales(): string[] {
  try {
    return fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [DEFAULT_LOCALE];
  }
}

export interface CoverageRow {
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

export function computeCoverage(): CoverageRow[] {
  const en = loadServerBundle(DEFAULT_LOCALE) ?? {};
  const enKeys = Object.keys(en);
  const total = enKeys.length || 1;
  const out: CoverageRow[] = [];
  for (const lang of LANGUAGES) {
    const bundle = loadServerBundle(lang.code) ?? {};
    const meta = getLocaleMeta(lang.code);
    let translated = 0;
    for (const k of enKeys) if (typeof bundle[k] === "string") translated++;
    out.push({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      dir: lang.dir,
      total,
      translated,
      missing: total - translated,
      coverage: Math.round((translated / total) * 1000) / 10,
      source: meta.machine ? "machine" : "hand",
    });
  }
  return out.sort((a, b) => b.coverage - a.coverage);
}

const missCounter = new Map<string, number>();
const MAX_MISSES = 5_000;

export function recordMiss(locale: string, key: string): void {
  if (missCounter.size >= MAX_MISSES) {
    const firstKey = missCounter.keys().next().value;
    if (firstKey) missCounter.delete(firstKey);
  }
  const k = `${locale}:${key}`;
  missCounter.set(k, (missCounter.get(k) ?? 0) + 1);
}

export interface MissEntry {
  locale: string;
  key: string;
  count: number;
}

export function listMisses(): MissEntry[] {
  const out: MissEntry[] = [];
  for (const [k, count] of missCounter.entries()) {
    const idx = k.indexOf(":");
    out.push({ locale: k.slice(0, idx), key: k.slice(idx + 1), count });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function clearMisses(): void {
  missCounter.clear();
}

export function getServerLocaleInfo() {
  return {
    defaultLocale: DEFAULT_LOCALE,
    fallbackLocale: FALLBACK_LOCALE,
    supported: LANGUAGES.length,
    available: listAvailableLocales().length,
  };
}

export function isSupportedLocale(code: string): boolean {
  return isSupported(code);
}

export const i18nService = {
  loadServerBundle,
  computeCoverage,
  listMisses,
  recordMiss,
  clearMisses,
  getServerLocaleInfo,
  listAvailableLocales,
  isSupportedLocale,
};
