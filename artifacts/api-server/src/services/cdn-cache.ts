export interface CacheRule {
  id: string;
  pattern: string;
  ttl: number;
  maxAge: number;
  staleWhileRevalidate: number;
  enabled: boolean;
  cacheControl: string;
}

export interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  bandwidthSavedMb: number;
  avgResponseTimeMs: number;
  edgeLocations: number;
  cachedAssets: number;
  totalBandwidthMb: number;
  bandwidth: { cached: number; origin: number };
  topCachedPaths: { path: string; hits: number }[];
}

export interface CdnConfig {
  enabled: boolean;
  provider: string;
  edgeLocations: string[];
  customDomain: string | null;
  sslEnabled: boolean;
  http2Enabled: boolean;
  compressionEnabled: boolean;
  minifyEnabled: boolean;
}

const projectRules = new Map<string, CacheRule[]>();

const defaultRules: CacheRule[] = [
  { id: "cr1", pattern: "/static/*", ttl: 86400, maxAge: 31536000, staleWhileRevalidate: 86400, enabled: true, cacheControl: "public, max-age=31536000, immutable" },
  { id: "cr2", pattern: "/api/*", ttl: 0, maxAge: 0, staleWhileRevalidate: 0, enabled: true, cacheControl: "no-cache, no-store" },
  { id: "cr3", pattern: "/images/*", ttl: 604800, maxAge: 2592000, staleWhileRevalidate: 604800, enabled: true, cacheControl: "public, max-age=2592000, immutable" },
  { id: "cr4", pattern: "*.html", ttl: 300, maxAge: 3600, staleWhileRevalidate: 300, enabled: true, cacheControl: "public, max-age=3600" },
  { id: "cr5", pattern: "*.js,*.css", ttl: 86400, maxAge: 31536000, staleWhileRevalidate: 86400, enabled: true, cacheControl: "public, max-age=31536000, immutable" },
  { id: "cr6", pattern: "*.woff2,*.woff", ttl: 86400, maxAge: 31536000, staleWhileRevalidate: 86400, enabled: true, cacheControl: "public, max-age=31536000, immutable" },
];

export function getCacheStats(projectId: string): CacheStats {
  const totalRequests = Math.floor(50000 + Math.random() * 200000);
  const hitRate = 75 + Math.random() * 20;
  const cacheHits = Math.floor(totalRequests * hitRate / 100);
  return {
    totalRequests,
    cacheHits,
    cacheMisses: totalRequests - cacheHits,
    hitRate: Math.round(hitRate * 100) / 100,
    bandwidthSavedMb: Math.floor(500 + Math.random() * 2000),
    avgResponseTimeMs: Math.floor(10 + Math.random() * 40),
    edgeLocations: 42,
    cachedAssets: Math.floor(100 + Math.random() * 500),
    totalBandwidthMb: Math.floor(2000 + Math.random() * 5000),
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

export function getCacheRules(projectId: string): { rules: CacheRule[]; defaults: CacheRule[] } {
  return {
    rules: projectRules.get(projectId) || [],
    defaults: defaultRules,
  };
}

export function setCacheRules(projectId: string, rules: CacheRule[]): CacheRule[] {
  projectRules.set(projectId, rules);
  return rules;
}

export function addCacheRule(projectId: string, rule: Omit<CacheRule, "id">): CacheRule {
  const rules = projectRules.get(projectId) || [];
  const newRule = { ...rule, id: `cr_${Date.now()}` };
  rules.push(newRule);
  projectRules.set(projectId, rules);
  return newRule;
}

export function removeCacheRule(projectId: string, ruleId: string): boolean {
  const rules = projectRules.get(projectId);
  if (!rules) return false;
  const idx = rules.findIndex(r => r.id === ruleId);
  if (idx === -1) return false;
  rules.splice(idx, 1);
  return true;
}

export function purgeCache(projectId: string, patterns?: string[]): { purged: boolean; patterns: string[]; estimatedKeys: number; completedAt: string } {
  return {
    purged: true,
    patterns: patterns || ["*"],
    estimatedKeys: patterns ? patterns.length * Math.floor(50 + Math.random() * 100) : Math.floor(500 + Math.random() * 2000),
    completedAt: new Date().toISOString(),
  };
}

export function getCdnConfig(_projectId: string): CdnConfig {
  return {
    enabled: true,
    provider: "CloudCloud CDN",
    edgeLocations: ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"],
    customDomain: null,
    sslEnabled: true,
    http2Enabled: true,
    compressionEnabled: true,
    minifyEnabled: true,
  };
}
