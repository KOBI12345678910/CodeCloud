import type { Request, Response, NextFunction } from "express";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LANG_BY_CODE,
  isSupported,
  parseAcceptLanguage,
  resolveLocale,
  interpolate,
} from "@workspace/i18n";
import { loadServerBundle } from "../services/i18n";

declare global {
  namespace Express {
    interface Request {
      locale?: string;
      dir?: "ltr" | "rtl";
      t?: (key: string, params?: Record<string, unknown> & { defaultValue?: string }) => string;
    }
  }
}

const COOKIE_NAME = "cc_locale";

function readCookieLocale(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE_NAME && v) return decodeURIComponent(v);
  }
  return null;
}

function pathLocale(url: string): { locale: string | null; rest: string } {
  const m = url.match(/^\/([a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?)(\/.*|$)/);
  if (m && isSupported(m[1])) {
    return { locale: m[1], rest: m[2] || "/" };
  }
  return { locale: null, rest: url };
}

export function i18nMiddleware(req: Request, res: Response, next: NextFunction): void {
  const queryLang =
    typeof req.query.lang === "string" ? req.query.lang : null;
  const cookieLang = readCookieLocale(req);
  const headerLang = req.headers["accept-language"];
  const fromPath = pathLocale(req.url || "/");
  const candidates = [
    fromPath.locale,
    queryLang,
    cookieLang,
    ...(headerLang ? parseAcceptLanguage(String(headerLang)) : []),
    DEFAULT_LOCALE,
  ];
  const locale = resolveLocale(candidates);
  req.locale = locale;
  req.dir = LANG_BY_CODE[locale]?.dir ?? "ltr";
  res.setHeader("Content-Language", locale);
  res.setHeader("Vary", "Accept-Language, Cookie");

  // Strip the locale prefix from the URL so downstream routes see canonical paths.
  if (fromPath.locale) {
    req.url = fromPath.rest;
  }

  req.t = (key: string, params?: Record<string, unknown> & { defaultValue?: string }) => {
    const tryLocales = [locale, FALLBACK_LOCALE];
    for (const code of tryLocales) {
      const bundle = loadServerBundle(code);
      const v = bundle?.[key];
      if (typeof v === "string") return interpolate(v, params, locale);
    }
    const dv = params?.defaultValue;
    return interpolate(dv ?? key, params, locale);
  };
  next();
}
