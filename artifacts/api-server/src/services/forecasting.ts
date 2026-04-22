export interface ResourceForecast {
  projectId: string;
  timeframe: string;
  currentUsage: ResourceMetrics;
  predicted: ForecastPoint[];
  recommendations: Recommendation[];
  planUpgradeNeeded: boolean;
  estimatedUpgradeDate?: string;
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
  requests: number;
}

export interface ForecastPoint {
  date: string;
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
  requests: number;
  confidence: number;
}

export interface Recommendation {
  type: "upgrade" | "optimize" | "alert";
  resource: string;
  message: string;
  urgency: "low" | "medium" | "high";
  estimatedImpact: string;
}

export function getResourceForecast(projectId: string, days: number = 30): ResourceForecast {
  const current: ResourceMetrics = {
    cpu: 35 + Math.random() * 30,
    memory: 40 + Math.random() * 25,
    storage: 20 + Math.random() * 40,
    bandwidth: 15 + Math.random() * 35,
    requests: Math.floor(Math.random() * 50000) + 10000,
  };

  const predicted: ForecastPoint[] = Array.from({ length: days }, (_, i) => {
    const growthFactor = 1 + (i * 0.01) + (Math.random() * 0.005);
    return {
      date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split("T")[0],
      cpu: Math.min(100, current.cpu * growthFactor),
      memory: Math.min(100, current.memory * growthFactor),
      storage: Math.min(100, current.storage * (1 + i * 0.005)),
      bandwidth: Math.min(100, current.bandwidth * growthFactor),
      requests: Math.floor(current.requests * growthFactor),
      confidence: Math.max(50, 95 - i * 1.5),
    };
  });

  const recommendations: Recommendation[] = [];
  if (current.cpu > 60) recommendations.push({ type: "alert", resource: "CPU", message: "CPU usage trending high — consider scaling", urgency: "medium", estimatedImpact: "Prevent throttling" });
  if (current.memory > 55) recommendations.push({ type: "optimize", resource: "Memory", message: "Optimize memory usage or upgrade plan", urgency: "low", estimatedImpact: "Save ~20% memory" });
  if (current.storage > 50) recommendations.push({ type: "upgrade", resource: "Storage", message: "Storage will exceed limit in ~14 days", urgency: "high", estimatedImpact: "Prevent data loss" });

  const upgradeNeeded = predicted.some(p => p.cpu > 85 || p.memory > 85 || p.storage > 85);

  return {
    projectId,
    timeframe: `${days} days`,
    currentUsage: current,
    predicted,
    recommendations,
    planUpgradeNeeded: upgradeNeeded,
    estimatedUpgradeDate: upgradeNeeded ? predicted.find(p => p.cpu > 85 || p.memory > 85)?.date : undefined,
  };
}
