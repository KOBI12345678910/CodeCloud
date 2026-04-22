export interface WafRule {
  id: string;
  name: string;
  type: "ddos" | "bot" | "ip_reputation" | "rate_limit" | "custom";
  enabled: boolean;
  action: "block" | "challenge" | "allow" | "log";
  conditions: string;
  hits: number;
}

export interface WafStats {
  totalRequests: number;
  blockedRequests: number;
  challengedRequests: number;
  threatLevel: "low" | "medium" | "high";
  topThreats: { type: string; count: number; lastSeen: string }[];
  rules: WafRule[];
}

export function getWafStats(projectId: string): WafStats {
  return {
    totalRequests: 1500000, blockedRequests: 12500, challengedRequests: 3200, threatLevel: "low",
    topThreats: [
      { type: "SQL Injection", count: 450, lastSeen: new Date(Date.now() - 3600000).toISOString() },
      { type: "XSS Attempt", count: 280, lastSeen: new Date(Date.now() - 7200000).toISOString() },
      { type: "Bot Scraping", count: 8500, lastSeen: new Date(Date.now() - 300000).toISOString() },
      { type: "DDoS Pattern", count: 3200, lastSeen: new Date(Date.now() - 86400000).toISOString() },
    ],
    rules: [
      { id: "w1", name: "DDoS Protection", type: "ddos", enabled: true, action: "block", conditions: ">1000 req/s from single IP", hits: 3200 },
      { id: "w2", name: "Bot Detection", type: "bot", enabled: true, action: "challenge", conditions: "Known bot user-agents", hits: 8500 },
      { id: "w3", name: "IP Reputation", type: "ip_reputation", enabled: true, action: "block", conditions: "Threat score > 80", hits: 450 },
      { id: "w4", name: "Rate Limiting", type: "rate_limit", enabled: true, action: "block", conditions: "100 req/min per IP", hits: 1200 },
      { id: "w5", name: "SQL Injection Filter", type: "custom", enabled: true, action: "block", conditions: "OWASP SQL injection patterns", hits: 450 },
    ],
  };
}

export function toggleWafRule(ruleId: string, enabled: boolean): { success: boolean } { return { success: true }; }
