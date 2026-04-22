export interface TranslationEntry {
  key: string;
  locale: string;
  value: string;
  namespace: string;
}

export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
}

class I18nService {
  private translations: Map<string, Map<string, string>> = new Map();
  private config: I18nConfig = { defaultLocale: "en", supportedLocales: ["en", "es", "fr", "de", "ja", "zh"], fallbackLocale: "en" };

  setTranslation(locale: string, key: string, value: string): void {
    if (!this.translations.has(locale)) this.translations.set(locale, new Map());
    this.translations.get(locale)!.set(key, value);
  }

  getTranslation(locale: string, key: string): string {
    const localeMap = this.translations.get(locale);
    if (localeMap?.has(key)) return localeMap.get(key)!;
    const fallback = this.translations.get(this.config.fallbackLocale);
    return fallback?.get(key) || key;
  }

  getLocale(locale: string): Record<string, string> {
    const map = this.translations.get(locale);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  bulkSet(locale: string, entries: Record<string, string>): number {
    let count = 0;
    for (const [key, value] of Object.entries(entries)) { this.setTranslation(locale, key, value); count++; }
    return count;
  }

  getMissingKeys(locale: string): string[] {
    const defaultKeys = this.translations.get(this.config.defaultLocale);
    if (!defaultKeys) return [];
    const localeKeys = this.translations.get(locale);
    if (!localeKeys) return Array.from(defaultKeys.keys());
    return Array.from(defaultKeys.keys()).filter(k => !localeKeys.has(k));
  }

  getConfig(): I18nConfig { return this.config; }
  updateConfig(updates: Partial<I18nConfig>): I18nConfig { Object.assign(this.config, updates); return this.config; }
  getSupportedLocales(): string[] { return this.config.supportedLocales; }
}

export const i18nService = new I18nService();
