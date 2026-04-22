export interface KPIDashboard {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalDeployments: number;
  revenue: { monthly: number; annual: number; mrr: number; arr: number };
  growth: { userGrowth: number; projectGrowth: number; revenueGrowth: number };
  usage: { cpuUtilization: number; memoryUtilization: number; storageUsed: number; bandwidthUsed: number };
  health: { uptime: number; avgResponseTime: number; errorRate: number; p99Latency: number };
  topPlans: { plan: string; count: number; revenue: number }[];
}

class AdminKpiService {
  getDashboard(): KPIDashboard {
    return {
      totalUsers: 12450 + Math.floor(Math.random() * 100),
      activeUsers: 3200 + Math.floor(Math.random() * 50),
      totalProjects: 28700 + Math.floor(Math.random() * 200),
      activeProjects: 8500 + Math.floor(Math.random() * 100),
      totalDeployments: 156000 + Math.floor(Math.random() * 500),
      revenue: { monthly: 89500, annual: 1074000, mrr: 89500, arr: 1074000 },
      growth: { userGrowth: 12.5, projectGrowth: 8.3, revenueGrowth: 15.2 },
      usage: { cpuUtilization: 65 + Math.random() * 10, memoryUtilization: 72 + Math.random() * 8, storageUsed: 2.4, bandwidthUsed: 1.8 },
      health: { uptime: 99.95 + Math.random() * 0.04, avgResponseTime: 45 + Math.random() * 20, errorRate: 0.05 + Math.random() * 0.03, p99Latency: 200 + Math.random() * 50 },
      topPlans: [
        { plan: "pro", count: 2100, revenue: 52500 },
        { plan: "team", count: 450, revenue: 31500 },
        { plan: "free", count: 9900, revenue: 0 },
      ],
    };
  }

  getTimeSeries(metric: string, days: number = 30): { date: string; value: number }[] {
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString().slice(0, 10),
      value: Math.floor(Math.random() * 1000) + 500,
    }));
  }
}

export const adminKpiService = new AdminKpiService();
