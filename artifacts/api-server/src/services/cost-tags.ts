export interface CostTag {
  id: string;
  key: string;
  value: string;
  resourceType: "container" | "storage" | "bandwidth" | "compute";
  resourceId: string;
  monthlyCost: number;
}

export interface CostTagReport {
  tags: { key: string; value: string; totalCost: number; resources: number }[];
  totalCost: number;
  period: string;
  budgets: { tagKey: string; tagValue: string; budget: number; spent: number; remaining: number }[];
}

export function getCostTagReport(projectId: string): CostTagReport {
  return {
    totalCost: 2450, period: "2024-01",
    tags: [
      { key: "department", value: "engineering", totalCost: 1800, resources: 12 },
      { key: "department", value: "marketing", totalCost: 350, resources: 3 },
      { key: "team", value: "platform", totalCost: 1200, resources: 8 },
      { key: "team", value: "frontend", totalCost: 600, resources: 4 },
      { key: "environment", value: "production", totalCost: 1500, resources: 6 },
      { key: "environment", value: "staging", totalCost: 950, resources: 9 },
    ],
    budgets: [
      { tagKey: "department", tagValue: "engineering", budget: 2000, spent: 1800, remaining: 200 },
      { tagKey: "department", tagValue: "marketing", budget: 500, spent: 350, remaining: 150 },
    ],
  };
}

export function addCostTag(projectId: string, tag: Omit<CostTag, "id">): CostTag {
  return { ...tag, id: crypto.randomUUID() };
}
