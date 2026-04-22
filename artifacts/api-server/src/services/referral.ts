export interface Referral {
  id: string;
  referrerId: string;
  referredEmail: string;
  referredUserId: string | null;
  code: string;
  status: "pending" | "signed-up" | "converted" | "rewarded";
  reward: { type: "credit" | "discount" | "plan-upgrade"; value: number } | null;
  createdAt: Date;
  convertedAt: Date | null;
}

class ReferralService {
  private referrals: Map<string, Referral> = new Map();
  private codes: Map<string, string> = new Map();

  generateCode(userId: string): string {
    const existing = Array.from(this.codes.entries()).find(([, uid]) => uid === userId);
    if (existing) return existing[0];
    const code = `REF-${userId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    this.codes.set(code, userId);
    return code;
  }

  createReferral(referrerId: string, referredEmail: string): Referral {
    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const code = this.generateCode(referrerId);
    const referral: Referral = { id, referrerId, referredEmail, referredUserId: null, code, status: "pending", reward: null, createdAt: new Date(), convertedAt: null };
    this.referrals.set(id, referral);
    return referral;
  }

  convert(code: string, newUserId: string): Referral | null {
    const referrerId = this.codes.get(code); if (!referrerId) return null;
    const referral = Array.from(this.referrals.values()).find(r => r.code === code && r.status === "pending");
    if (!referral) return null;
    referral.referredUserId = newUserId;
    referral.status = "converted";
    referral.reward = { type: "credit", value: 10 };
    referral.convertedAt = new Date();
    return referral;
  }

  getByUser(userId: string): Referral[] { return Array.from(this.referrals.values()).filter(r => r.referrerId === userId); }
  getStats(userId: string): { totalReferrals: number; converted: number; totalRewards: number; conversionRate: number } {
    const refs = this.getByUser(userId);
    const converted = refs.filter(r => r.status === "converted" || r.status === "rewarded").length;
    return { totalReferrals: refs.length, converted, totalRewards: converted * 10, conversionRate: refs.length > 0 ? converted / refs.length : 0 };
  }
}

export const referralService = new ReferralService();
