export interface RevenueMetrics {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  churnRate: number;
  ltv: number;
  arpu: number;
  totalCustomers: number;
  newCustomers: number;
  churned: number;
  expansionRevenue: number;
  contractionRevenue: number;
  netNewMRR: number;
  mrrHistory: { month: string; mrr: number; newMRR: number; churnedMRR: number; expansionMRR: number; contractionMRR: number }[];
  revenueByPlan: { plan: string; revenue: number; customers: number; percentage: number }[];
  revenueByRegion: { region: string; revenue: number; customers: number; percentage: number }[];
  cohorts: { cohort: string; month0: number; month1: number; month2: number; month3: number; month4: number; month5: number }[];
  forecast: { month: string; projected: number; low: number; high: number }[];
}

const METRICS: RevenueMetrics = {
  mrr: 487500,
  mrrGrowth: 8.2,
  arr: 5850000,
  churnRate: 2.1,
  ltv: 23214,
  arpu: 48.75,
  totalCustomers: 10000,
  newCustomers: 842,
  churned: 210,
  expansionRevenue: 32400,
  contractionRevenue: 8100,
  netNewMRR: 41040,
  mrrHistory: [
    { month: "2025-07", mrr: 312000, newMRR: 28000, churnedMRR: 8200, expansionMRR: 12000, contractionMRR: 3400 },
    { month: "2025-08", mrr: 340400, newMRR: 31500, churnedMRR: 7800, expansionMRR: 14200, contractionMRR: 4100 },
    { month: "2025-09", mrr: 368200, newMRR: 33000, churnedMRR: 9100, expansionMRR: 18500, contractionMRR: 5200 },
    { month: "2025-10", mrr: 394600, newMRR: 35200, churnedMRR: 10800, expansionMRR: 22400, contractionMRR: 6800 },
    { month: "2025-11", mrr: 421400, newMRR: 38100, churnedMRR: 11200, expansionMRR: 24800, contractionMRR: 5400 },
    { month: "2025-12", mrr: 446460, newMRR: 36800, churnedMRR: 12400, expansionMRR: 28600, contractionMRR: 7200 },
    { month: "2026-01", mrr: 462300, newMRR: 34200, churnedMRR: 14100, expansionMRR: 26400, contractionMRR: 8100 },
    { month: "2026-02", mrr: 475800, newMRR: 37500, churnedMRR: 12800, expansionMRR: 30200, contractionMRR: 6500 },
    { month: "2026-03", mrr: 487500, newMRR: 39600, churnedMRR: 11400, expansionMRR: 32400, contractionMRR: 8100 },
  ],
  revenueByPlan: [
    { plan: "Free", revenue: 0, customers: 4200, percentage: 0 },
    { plan: "Pro", revenue: 234500, customers: 4690, percentage: 48.1 },
    { plan: "Team", revenue: 253000, customers: 1110, percentage: 51.9 },
  ],
  revenueByRegion: [
    { region: "North America", revenue: 214500, customers: 4400, percentage: 44.0 },
    { region: "Europe", revenue: 146250, customers: 3000, percentage: 30.0 },
    { region: "Asia Pacific", revenue: 78000, customers: 1600, percentage: 16.0 },
    { region: "Latin America", revenue: 29250, customers: 600, percentage: 6.0 },
    { region: "Other", revenue: 19500, customers: 400, percentage: 4.0 },
  ],
  cohorts: [
    { cohort: "2025-10", month0: 100, month1: 88, month2: 82, month3: 78, month4: 75, month5: 73 },
    { cohort: "2025-11", month0: 100, month1: 90, month2: 84, month3: 80, month4: 77, month5: 0 },
    { cohort: "2025-12", month0: 100, month1: 87, month2: 81, month3: 76, month4: 0, month5: 0 },
    { cohort: "2026-01", month0: 100, month1: 91, month2: 85, month3: 0, month4: 0, month5: 0 },
    { cohort: "2026-02", month0: 100, month1: 89, month2: 0, month3: 0, month4: 0, month5: 0 },
    { cohort: "2026-03", month0: 100, month1: 0, month2: 0, month3: 0, month4: 0, month5: 0 },
  ],
  forecast: [
    { month: "2026-04", projected: 510000, low: 492000, high: 528000 },
    { month: "2026-05", projected: 535000, low: 510000, high: 560000 },
    { month: "2026-06", projected: 562000, low: 528000, high: 596000 },
    { month: "2026-07", projected: 591000, low: 548000, high: 634000 },
    { month: "2026-08", projected: 622000, low: 568000, high: 676000 },
    { month: "2026-09", projected: 655000, low: 588000, high: 722000 },
  ],
};

export class RevenueAnalyticsService {
  async getMetrics(): Promise<RevenueMetrics> {
    return METRICS;
  }
}

export const revenueAnalyticsService = new RevenueAnalyticsService();
