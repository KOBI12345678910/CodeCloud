export interface TrafficRule {
  id: string;
  name: string;
  type: "weight" | "header" | "cookie" | "geo" | "time";
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  targets: RuleTarget[];
  createdAt: string;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "contains" | "matches" | "in" | "not_in";
  value: string;
}

export interface RuleTarget {
  deploymentId: string;
  weight: number;
  region?: string;
}

export function getTrafficRules(projectId: string): TrafficRule[] {
  return [
    { id: "r1", name: "Canary Release", type: "weight", enabled: true, priority: 1, conditions: [], targets: [{ deploymentId: "v2.1", weight: 10 }, { deploymentId: "v2.0", weight: 90 }], createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "r2", name: "Beta Users", type: "header", enabled: true, priority: 2, conditions: [{ field: "X-Beta-User", operator: "equals", value: "true" }], targets: [{ deploymentId: "v2.1-beta", weight: 100 }], createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: "r3", name: "EU Traffic", type: "geo", enabled: true, priority: 3, conditions: [{ field: "country", operator: "in", value: "DE,FR,NL,ES,IT" }], targets: [{ deploymentId: "v2.0", weight: 100, region: "eu-west-1" }], createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: "r4", name: "Off-Peak Testing", type: "time", enabled: false, priority: 4, conditions: [{ field: "hour", operator: "in", value: "2,3,4,5" }], targets: [{ deploymentId: "v2.1-nightly", weight: 100 }], createdAt: new Date(Date.now() - 345600000).toISOString() },
  ];
}

export function createTrafficRule(projectId: string, rule: Omit<TrafficRule, "id" | "createdAt">): TrafficRule {
  return { ...rule, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function toggleTrafficRule(ruleId: string, enabled: boolean): { success: boolean; ruleId: string; enabled: boolean } {
  return { success: true, ruleId, enabled };
}
