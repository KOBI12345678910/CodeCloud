export interface CostBreakdown {
  compute: number;
  storage: number;
  bandwidth: number;
  database: number;
  thirdParty: number;
  total: number;
  currency: string;
}

export interface CostRecommendation {
  id: string;
  category: string;
  description: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

class CostOptimizerService {
  getCosts(projectId: string): CostBreakdown {
    return {
      compute: 45.00 + Math.random() * 20,
      storage: 12.50 + Math.random() * 5,
      bandwidth: 8.75 + Math.random() * 10,
      database: 25.00 + Math.random() * 15,
      thirdParty: 5.00 + Math.random() * 5,
      total: 0, currency: "USD",
    };
  }

  getRecommendations(projectId: string): CostRecommendation[] {
    return [
      { id: "rec-1", category: "compute", description: "Right-size container: reduce from 2GB to 1GB RAM", currentCost: 45, projectedCost: 22.5, savings: 22.5, effort: "low", impact: "high" },
      { id: "rec-2", category: "storage", description: "Enable compression for stored artifacts", currentCost: 12.5, projectedCost: 8, savings: 4.5, effort: "low", impact: "medium" },
      { id: "rec-3", category: "bandwidth", description: "Enable CDN for static assets", currentCost: 8.75, projectedCost: 3, savings: 5.75, effort: "medium", impact: "medium" },
      { id: "rec-4", category: "database", description: "Add read replicas to reduce primary load", currentCost: 25, projectedCost: 18, savings: 7, effort: "high", impact: "medium" },
    ];
  }

  forecast(projectId: string, months: number = 3): { month: string; projected: number }[] {
    const base = 96;
    return Array.from({ length: months }, (_, i) => ({
      month: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString().slice(0, 7),
      projected: base * (1 + i * 0.05 + Math.random() * 0.1),
    }));
  }
}

export const costOptimizerService = new CostOptimizerService();
