export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface EnvComparison {
  environment1: string;
  environment2: string;
  matching: { key: string; value: string }[];
  differing: { key: string; value1: string | null; value2: string | null }[];
  onlyIn1: string[];
  onlyIn2: string[];
  totalVars1: number;
  totalVars2: number;
}

class EnvComparisonService {
  private environments: Map<string, Map<string, EnvVar>> = new Map();

  setEnv(envName: string, vars: EnvVar[]): void {
    const map = new Map<string, EnvVar>();
    for (const v of vars) map.set(v.key, v);
    this.environments.set(envName, map);
  }

  getEnv(envName: string): EnvVar[] {
    const map = this.environments.get(envName);
    return map ? Array.from(map.values()) : [];
  }

  listEnvironments(): string[] { return Array.from(this.environments.keys()); }

  compare(env1: string, env2: string): EnvComparison {
    const map1 = this.environments.get(env1) || new Map();
    const map2 = this.environments.get(env2) || new Map();
    const matching: { key: string; value: string }[] = [];
    const differing: { key: string; value1: string | null; value2: string | null }[] = [];
    const onlyIn1: string[] = [];
    const onlyIn2: string[] = [];
    for (const [key, v] of map1) {
      const v2 = map2.get(key);
      if (!v2) onlyIn1.push(key);
      else if (v.value === v2.value) matching.push({ key, value: v.isSecret ? "***" : v.value });
      else differing.push({ key, value1: v.isSecret ? "***" : v.value, value2: v2.isSecret ? "***" : v2.value });
    }
    for (const key of map2.keys()) { if (!map1.has(key)) onlyIn2.push(key); }
    return { environment1: env1, environment2: env2, matching, differing, onlyIn1, onlyIn2, totalVars1: map1.size, totalVars2: map2.size };
  }
}

export const envComparisonService = new EnvComparisonService();
