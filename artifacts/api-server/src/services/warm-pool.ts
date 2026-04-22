export interface WarmPool {
  language: string;
  poolSize: number;
  available: number;
  inUse: number;
  warming: number;
  avgStartupTime: number;
  coldStartTime: number;
  savings: string;
  config: PoolConfig;
}

export interface PoolConfig {
  minSize: number;
  maxSize: number;
  warmupScript?: string;
  ttl: number;
  autoReplenish: boolean;
}

export function getWarmPools(): WarmPool[] {
  return [
    { language: "Node.js 20", poolSize: 10, available: 6, inUse: 3, warming: 1, avgStartupTime: 0.8, coldStartTime: 4.2, savings: "81%", config: { minSize: 5, maxSize: 15, ttl: 3600, autoReplenish: true } },
    { language: "Python 3.12", poolSize: 8, available: 5, inUse: 2, warming: 1, avgStartupTime: 1.1, coldStartTime: 5.8, savings: "81%", config: { minSize: 3, maxSize: 12, ttl: 3600, autoReplenish: true } },
    { language: "Go 1.22", poolSize: 5, available: 4, inUse: 1, warming: 0, avgStartupTime: 0.3, coldStartTime: 2.1, savings: "86%", config: { minSize: 2, maxSize: 8, ttl: 7200, autoReplenish: true } },
    { language: "Rust 1.75", poolSize: 3, available: 2, inUse: 1, warming: 0, avgStartupTime: 0.5, coldStartTime: 8.5, savings: "94%", config: { minSize: 1, maxSize: 5, ttl: 7200, autoReplenish: true } },
    { language: "Java 21", poolSize: 6, available: 3, inUse: 2, warming: 1, avgStartupTime: 1.5, coldStartTime: 12.0, savings: "88%", config: { minSize: 3, maxSize: 10, ttl: 3600, autoReplenish: true } },
  ];
}

export function updatePoolConfig(language: string, config: Partial<PoolConfig>): { success: boolean; language: string; config: PoolConfig } {
  const pool = getWarmPools().find(p => p.language === language);
  if (!pool) throw new Error("Pool not found");
  return { success: true, language, config: { ...pool.config, ...config } };
}
