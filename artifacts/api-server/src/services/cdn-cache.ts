export interface CacheRule {
  id: string;
  pattern: string;
  ttl: number;
  enabled: boolean;
  cacheControl: string;
}

export interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  bandwidth: { cached: number; origin: number };
  topCachedPaths: { path: string; hits: number }[];
}

export function getCacheStats(projectId: string): CacheStats {
  return {
    totalRequests: 250000, cacheHits: 212500, cacheMisses: 37500, hitRate: 85,
    bandwidth: { cached: 15000000000, origin: 2500000000 },
    topCachedPaths: [
      { path: "/static/js/main.js", hits: 45000 },
      { path: "/static/css/styles.css", hits: 42000 },
      { path: "/images/logo.png", hits: 38000 },
      { path: "/api/config", hits: 25000 },
      { path: "/favicon.ico", hits: 22000 },
    ],
  };
}

export function getCacheRules(projectId: string): CacheRule[] {
  return [
    { id: "cr1", pattern: "/static/*", ttl: 86400, enabled: true, cacheControl: "public, max-age=86400" },
    { id: "cr2", pattern: "/api/*", ttl: 0, enabled: true, cacheControl: "no-cache" },
    { id: "cr3", pattern: "/images/*", ttl: 604800, enabled: true, cacheControl: "public, max-age=604800, immutable" },
    { id: "cr4", pattern: "*.html", ttl: 300, enabled: true, cacheControl: "public, max-age=300" },
  ];
}

export function purgeCache(projectId: string, patterns?: string[]): { purged: number; patterns: string[] } {
  return { purged: patterns ? patterns.length * 100 : 5000, patterns: patterns || ["*"] };
}
