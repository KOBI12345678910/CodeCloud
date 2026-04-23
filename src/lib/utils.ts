import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ILS"): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(amount);
}

export function formatDate(date: string | Date, locale = "he-IL"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(date));
}

export function truncate(str: string, len = 100): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 50) + "-" + Date.now().toString(36);
}
