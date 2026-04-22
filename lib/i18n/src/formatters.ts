import { LANG_BY_CODE, DEFAULT_LOCALE } from "./registry/languages";

function intlLocale(locale: string): string {
  const lang = LANG_BY_CODE[locale];
  if (!lang) return locale;
  if (locale.includes("-")) return locale;
  return lang.region ? `${locale}-${lang.region}` : locale;
}

export function formatNumber(
  locale: string,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), options).format(value);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
  }
}

export function formatCurrency(
  locale: string,
  value: number,
  currency = "USD",
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(locale, value, {
    style: "currency",
    currency,
    ...options,
  });
}

export function formatDate(
  locale: string,
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = value instanceof Date ? value : new Date(value);
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), options).format(d);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(d);
  }
}

export function formatRelativeTime(
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
): string {
  try {
    return new Intl.RelativeTimeFormat(intlLocale(locale), {
      numeric: "auto",
      ...options,
    }).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat(DEFAULT_LOCALE, options).format(value, unit);
  }
}

export function formatList(
  locale: string,
  items: string[],
  options?: Intl.ListFormatOptions,
): string {
  try {
    return new Intl.ListFormat(intlLocale(locale), options).format(items);
  } catch {
    return items.join(", ");
  }
}

const PLURAL_CACHE = new Map<string, Intl.PluralRules>();

export function pluralCategory(
  locale: string,
  n: number,
  type: Intl.PluralRulesOptions["type"] = "cardinal",
): Intl.LDMLPluralRule {
  const key = `${locale}:${type}`;
  let pr = PLURAL_CACHE.get(key);
  if (!pr) {
    try {
      pr = new Intl.PluralRules(intlLocale(locale), { type });
    } catch {
      pr = new Intl.PluralRules(DEFAULT_LOCALE, { type });
    }
    PLURAL_CACHE.set(key, pr);
  }
  return pr.select(n);
}

const TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatTimeAgo(locale: string, date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  for (const { unit, ms } of TIME_UNITS) {
    if (abs >= ms || unit === "second") {
      return formatRelativeTime(locale, Math.round(diff / ms), unit);
    }
  }
  return formatRelativeTime(locale, 0, "second");
}
