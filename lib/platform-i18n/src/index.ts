import { IntlMessageFormat } from "intl-messageformat";

export interface LocaleInfo {
  code: string;
  name: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
] as const;

export const DEFAULT_LOCALE = "en";

export function isRtl(locale: string): boolean {
  return LOCALES.find((l) => l.code === locale)?.dir === "rtl";
}

export function resolveLocale(input: string | undefined): string {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase().split("-")[0];
  return LOCALES.some((l) => l.code === lower) ? lower : DEFAULT_LOCALE;
}

export function formatMessage(
  message: string,
  values: Record<string, unknown>,
  locale: string,
): string {
  const fmt = new IntlMessageFormat(message, locale);
  return String(fmt.format(values));
}

export function formatDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(date);
}

export function formatNumber(
  n: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(n);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}
