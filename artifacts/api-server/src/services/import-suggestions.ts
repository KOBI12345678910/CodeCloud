export interface ImportSuggestion {
  symbol: string;
  module: string;
  isDefault: boolean;
  confidence: number;
}

class ImportSuggestionsService {
  private registry: Map<string, { module: string; isDefault: boolean }[]> = new Map();

  register(symbol: string, module: string, isDefault: boolean = false): void {
    if (!this.registry.has(symbol)) this.registry.set(symbol, []);
    const entries = this.registry.get(symbol)!;
    if (!entries.find(e => e.module === module)) entries.push({ module, isDefault });
  }

  suggest(symbol: string): ImportSuggestion[] {
    const exact = this.registry.get(symbol);
    if (exact) return exact.map(e => ({ symbol, module: e.module, isDefault: e.isDefault, confidence: 1.0 }));
    const results: ImportSuggestion[] = [];
    const lower = symbol.toLowerCase();
    for (const [key, entries] of this.registry) {
      if (key.toLowerCase().includes(lower)) {
        for (const e of entries) results.push({ symbol: key, module: e.module, isDefault: e.isDefault, confidence: 0.7 });
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  scanFile(content: string): string[] {
    const used = new Set<string>();
    const importedRe = /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g;
    const imported = new Set<string>();
    let m;
    while ((m = importedRe.exec(content))) {
      if (m[1]) m[1].split(",").forEach(s => imported.add(s.trim()));
      if (m[2]) imported.add(m[2]);
    }
    const identRe = /\b([A-Z]\w+)\b/g;
    while ((m = identRe.exec(content))) { if (!imported.has(m[1])) used.add(m[1]); }
    return Array.from(used);
  }

  seedDefaults(): void {
    const defaults: [string, string, boolean][] = [
      ["useState", "react", false], ["useEffect", "react", false], ["useRef", "react", false],
      ["React", "react", true], ["Router", "express", false], ["Request", "express", false],
      ["Response", "express", false], ["Button", "@/components/ui/button", false],
      ["Input", "@/components/ui/input", false], ["cn", "@/lib/utils", false],
    ];
    for (const [sym, mod, isDef] of defaults) this.register(sym, mod, isDef);
  }
}

export const importSuggestionsService = new ImportSuggestionsService();
importSuggestionsService.seedDefaults();
