export * from "./registry";
export * from "./formatters";
export * from "./detect";

import enCommon from "./locales/en/common.json" with { type: "json" };
import { LANGUAGES, LANG_BY_CODE, DEFAULT_LOCALE, FALLBACK_LOCALE, isSupported, resolveLocale, parseAcceptLanguage } from "./registry/languages";

export type Namespace = "common";
export const NAMESPACES: Namespace[] = ["common"];

export interface ResourceBundle {
  _meta?: { machine?: boolean; source?: string; generated?: string };
  [key: string]: unknown;
}

const STATIC_BUNDLES: Record<string, Record<Namespace, ResourceBundle>> = {
  en: { common: enCommon as ResourceBundle },
};

export function getStaticBundle(locale: string, ns: Namespace = "common"): ResourceBundle | null {
  return STATIC_BUNDLES[locale]?.[ns] ?? null;
}

const TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
// Lightweight ICU-style: {var, plural, one {…} other {…}} and {var, select, m {…} f {…} other {…}}
const ICU_RE = /\{\s*([a-zA-Z0-9_.-]+)\s*,\s*(plural|select)\s*,([\s\S]*?)\}\s*(?=\{|$|[^{])/g;

function parseIcuBranches(body: string): Record<string, string> {
  const branches: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    let key = "";
    while (i < body.length && !/\s|\{/.test(body[i])) key += body[i++];
    while (i < body.length && /\s/.test(body[i])) i++;
    if (body[i] !== "{") break;
    let depth = 1; i++;
    let val = "";
    while (i < body.length && depth > 0) {
      if (body[i] === "{") depth++;
      else if (body[i] === "}") { depth--; if (depth === 0) break; }
      val += body[i++];
    }
    i++;
    if (key) branches[key.replace(/^=/, "")] = val;
  }
  return branches;
}

export function interpolate(value: string, params?: Record<string, unknown>, locale?: string): string {
  let out = value;
  if (params) {
    out = out.replace(ICU_RE, (_m, name: string, kind: "plural" | "select", body: string) => {
      const branches = parseIcuBranches(body);
      const v = params[name];
      if (kind === "plural") {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) {
          const exact = branches[String(n)];
          if (exact) return interpolate(exact.replace(/#/g, String(n)), params, locale);
          try {
            const cat = new Intl.PluralRules(locale ?? "en").select(n);
            const branch = branches[cat] ?? branches.other ?? "";
            return interpolate(branch.replace(/#/g, String(n)), params, locale);
          } catch {
            return interpolate(branches.other ?? "", params, locale);
          }
        }
        return branches.other ?? "";
      }
      const key = v === undefined || v === null ? "other" : String(v);
      return interpolate(branches[key] ?? branches.other ?? "", params, locale);
    });
    out = out.replace(TEMPLATE_RE, (_m, k: string) => {
      const v = params[k];
      return v === undefined || v === null ? `{{${k}}}` : String(v);
    });
  }
  return out;
}

export interface TranslateOptions {
  locale?: string;
  ns?: Namespace;
  defaultValue?: string;
  params?: Record<string, unknown>;
}

export function translate(key: string, opts: TranslateOptions = {}): string {
  const ns = opts.ns ?? "common";
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const tryLocales = [locale, FALLBACK_LOCALE];
  for (const code of tryLocales) {
    const bundle = STATIC_BUNDLES[code]?.[ns];
    if (!bundle) continue;
    const v = bundle[key];
    if (typeof v === "string") return interpolate(v, opts.params);
  }
  return interpolate(opts.defaultValue ?? key, opts.params);
}

export {
  LANGUAGES,
  LANG_BY_CODE,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isSupported,
  resolveLocale,
  parseAcceptLanguage,
};
