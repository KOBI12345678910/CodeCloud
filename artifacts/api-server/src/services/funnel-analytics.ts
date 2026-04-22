export interface FunnelStep {
  id: string;
  name: string;
  order: number;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeInStep: number;
  topDropoffReasons: string[];
}

export interface FunnelData {
  steps: FunnelStep[];
  totalVisitors: number;
  overallConversion: number;
  period: string;
  trends: FunnelTrend[];
  bottlenecks: Bottleneck[];
}

export interface FunnelTrend {
  date: string;
  visitors: number;
  signups: number;
  projectsCreated: number;
  codeRuns: number;
  deploys: number;
}

export interface Bottleneck {
  stepId: string;
  stepName: string;
  severity: "low" | "medium" | "high";
  dropoffPercent: number;
  suggestion: string;
  estimatedImpact: string;
}

const STEPS = [
  { id: "visit", name: "Visit Landing Page" },
  { id: "signup", name: "Sign Up" },
  { id: "create_project", name: "Create Project" },
  { id: "run_code", name: "Run Code" },
  { id: "deploy", name: "Deploy" },
];

export function getFunnelData(period: string = "30d"): FunnelData {
  const totalVisitors = 50000 + Math.floor(Math.random() * 20000);
  let remaining = totalVisitors;

  const dropRates = [0.65, 0.30, 0.25, 0.35];
  const steps: FunnelStep[] = STEPS.map((step, i) => {
    const prev = remaining;
    if (i > 0) remaining = Math.floor(remaining * (1 - dropRates[i - 1]));
    const conversions = i < STEPS.length - 1 ? Math.floor(remaining * (1 - dropRates[i])) : remaining;
    const conversionRate = i === 0 ? 100 : Math.round((remaining / prev) * 100);
    return {
      id: step.id,
      name: step.name,
      order: i + 1,
      visitors: remaining,
      conversions,
      conversionRate,
      dropoffRate: i < dropRates.length ? Math.round(dropRates[i] * 100) : 0,
      avgTimeInStep: [0, 120, 300, 180, 600][i],
      topDropoffReasons: i === 0
        ? ["Bounce", "Pricing concern", "Not relevant"]
        : i === 1
        ? ["Form too long", "No social login", "Email verification"]
        : i === 2
        ? ["No matching template", "Confused by UI", "Feature missing"]
        : i === 3
        ? ["Build errors", "Missing dependencies", "Slow startup"]
        : ["Complex config", "Domain setup", "Cost concerns"],
    };
  });

  const trends: FunnelTrend[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
    visitors: Math.floor(1500 + Math.random() * 500),
    signups: Math.floor(500 + Math.random() * 200),
    projectsCreated: Math.floor(300 + Math.random() * 100),
    codeRuns: Math.floor(200 + Math.random() * 80),
    deploys: Math.floor(100 + Math.random() * 50),
  }));

  const bottlenecks: Bottleneck[] = [];
  steps.forEach((step, i) => {
    if (i > 0 && step.dropoffRate > 25) {
      bottlenecks.push({
        stepId: step.id,
        stepName: step.name,
        severity: step.dropoffRate > 50 ? "high" : step.dropoffRate > 35 ? "medium" : "low",
        dropoffPercent: step.dropoffRate,
        suggestion: i === 1 ? "Add social login options and simplify signup form" : i === 2 ? "Show curated templates immediately after signup" : i === 3 ? "Add one-click run with auto-dependency install" : "Simplify deploy flow with guided wizard",
        estimatedImpact: `+${Math.floor(step.dropoffRate * 0.3)}% conversion if addressed`,
      });
    }
  });

  return {
    steps,
    totalVisitors,
    overallConversion: Math.round((steps[steps.length - 1].visitors / totalVisitors) * 100),
    period,
    trends,
    bottlenecks: bottlenecks.sort((a, b) => b.dropoffPercent - a.dropoffPercent),
  };
}
