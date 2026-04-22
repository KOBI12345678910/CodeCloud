export interface BandwidthRule {
  id: string;
  containerId: string;
  ingressLimitKBs: number;
  egressLimitKBs: number;
  burstAllowanceKB: number;
  qosPriority: "low" | "normal" | "high";
  enabled: boolean;
}

export interface BandwidthUsage {
  containerId: string;
  timestamp: Date;
  ingressKBs: number;
  egressKBs: number;
  throttled: boolean;
  burstUsedKB: number;
}

class BandwidthLimiterService {
  private rules: Map<string, BandwidthRule> = new Map();
  private usage: BandwidthUsage[] = [];

  setRule(rule: Omit<BandwidthRule, "id">): BandwidthRule {
    const id = `bw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: BandwidthRule = { ...rule, id };
    this.rules.set(rule.containerId, entry);
    return entry;
  }

  getRules(): BandwidthRule[] {
    return Array.from(this.rules.values());
  }

  getRule(containerId: string): BandwidthRule | null {
    return this.rules.get(containerId) || null;
  }

  deleteRule(containerId: string): boolean {
    return this.rules.delete(containerId);
  }

  checkBandwidth(containerId: string, ingressKBs: number, egressKBs: number): { allowed: boolean; throttled: boolean; reason: string } {
    const rule = this.rules.get(containerId);
    if (!rule || !rule.enabled) {
      this.usage.push({ containerId, timestamp: new Date(), ingressKBs, egressKBs, throttled: false, burstUsedKB: 0 });
      return { allowed: true, throttled: false, reason: "No rule applied" };
    }

    const throttled = ingressKBs > rule.ingressLimitKBs || egressKBs > rule.egressLimitKBs;
    const burstUsed = throttled ? Math.max(0, (ingressKBs - rule.ingressLimitKBs) + (egressKBs - rule.egressLimitKBs)) : 0;
    const allowed = !throttled || burstUsed <= rule.burstAllowanceKB;

    this.usage.push({ containerId, timestamp: new Date(), ingressKBs, egressKBs, throttled, burstUsedKB: burstUsed });
    if (this.usage.length > 10000) this.usage = this.usage.slice(-5000);

    return {
      allowed,
      throttled,
      reason: throttled ? `Bandwidth limit exceeded (${ingressKBs}/${rule.ingressLimitKBs} KB/s ingress, ${egressKBs}/${rule.egressLimitKBs} KB/s egress)` : "Within limits",
    };
  }

  getUsage(containerId: string, limit = 100): BandwidthUsage[] {
    return this.usage.filter(u => u.containerId === containerId).slice(-limit);
  }

  getStats(containerId: string): { avgIngress: number; avgEgress: number; peakIngress: number; peakEgress: number; throttleCount: number } {
    const records = this.usage.filter(u => u.containerId === containerId);
    if (records.length === 0) return { avgIngress: 0, avgEgress: 0, peakIngress: 0, peakEgress: 0, throttleCount: 0 };
    return {
      avgIngress: records.reduce((s, r) => s + r.ingressKBs, 0) / records.length,
      avgEgress: records.reduce((s, r) => s + r.egressKBs, 0) / records.length,
      peakIngress: Math.max(...records.map(r => r.ingressKBs)),
      peakEgress: Math.max(...records.map(r => r.egressKBs)),
      throttleCount: records.filter(r => r.throttled).length,
    };
  }
}

export const bandwidthLimiterService = new BandwidthLimiterService();
