export interface SlaTarget {
  metric: "uptime" | "response_time" | "error_rate";
  target: number;
  current: number;
  status: "met" | "at_risk" | "breached";
  unit: string;
}

export interface SlaDashboard {
  projectId: string;
  period: string;
  targets: SlaTarget[];
  uptimeHistory: { date: string; uptime: number }[];
  breaches: { metric: string; timestamp: string; value: number; target: number; duration: number }[];
  credits: number;
}

export function getSlaDashboard(projectId: string): SlaDashboard {
  return {
    projectId, period: "current_month",
    targets: [
      { metric: "uptime", target: 99.9, current: 99.95, status: "met", unit: "%" },
      { metric: "response_time", target: 200, current: 145, status: "met", unit: "ms" },
      { metric: "error_rate", target: 0.1, current: 0.08, status: "met", unit: "%" },
    ],
    uptimeHistory: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], uptime: 99.5 + Math.random() * 0.5 })),
    breaches: [{ metric: "uptime", timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), value: 99.2, target: 99.9, duration: 45 }],
    credits: 0,
  };
}
