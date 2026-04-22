export interface WebhookRetryPolicy {
  id: string;
  webhookUrl: string;
  maxRetries: number;
  backoffType: "fixed" | "exponential" | "linear";
  initialDelayMs: number;
  maxDelayMs: number;
  enabled: boolean;
}

export interface WebhookDelivery {
  id: string;
  policyId: string;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "retrying" | "failed" | "dead_letter";
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseCode: number | null;
  error: string | null;
  createdAt: Date;
}

class WebhookRetryService {
  private policies: Map<string, WebhookRetryPolicy> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private deadLetterQueue: WebhookDelivery[] = [];

  createPolicy(policy: Omit<WebhookRetryPolicy, "id">): WebhookRetryPolicy {
    const id = `wrp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: WebhookRetryPolicy = { ...policy, id };
    this.policies.set(id, entry);
    return entry;
  }

  getPolicies(): WebhookRetryPolicy[] {
    return Array.from(this.policies.values());
  }

  updatePolicy(id: string, updates: Partial<WebhookRetryPolicy>): WebhookRetryPolicy | null {
    const policy = this.policies.get(id);
    if (!policy) return null;
    Object.assign(policy, updates);
    return policy;
  }

  enqueue(policyId: string, payload: Record<string, unknown>): WebhookDelivery {
    const id = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const delivery: WebhookDelivery = {
      id, policyId, payload, status: "pending", attempts: 0,
      lastAttemptAt: null, nextRetryAt: new Date(), responseCode: null,
      error: null, createdAt: new Date(),
    };
    this.deliveries.set(id, delivery);
    return delivery;
  }

  recordAttempt(deliveryId: string, success: boolean, responseCode: number | null, error: string | null): WebhookDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;
    const policy = this.policies.get(delivery.policyId);

    delivery.attempts++;
    delivery.lastAttemptAt = new Date();
    delivery.responseCode = responseCode;
    delivery.error = error;

    if (success) {
      delivery.status = "delivered";
      delivery.nextRetryAt = null;
    } else if (policy && delivery.attempts >= policy.maxRetries) {
      delivery.status = "dead_letter";
      delivery.nextRetryAt = null;
      this.deadLetterQueue.push(delivery);
    } else {
      delivery.status = "retrying";
      const delay = policy ? this.calculateDelay(policy, delivery.attempts) : 5000;
      delivery.nextRetryAt = new Date(Date.now() + delay);
    }
    return delivery;
  }

  retryManual(deliveryId: string): WebhookDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;
    delivery.status = "pending";
    delivery.nextRetryAt = new Date();
    return delivery;
  }

  getDeliveries(policyId?: string, status?: string): WebhookDelivery[] {
    let results = Array.from(this.deliveries.values());
    if (policyId) results = results.filter(d => d.policyId === policyId);
    if (status) results = results.filter(d => d.status === status);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getDeadLetterQueue(): WebhookDelivery[] {
    return [...this.deadLetterQueue];
  }

  getStats(): { total: number; delivered: number; retrying: number; failed: number; deadLetter: number } {
    const all = Array.from(this.deliveries.values());
    return {
      total: all.length,
      delivered: all.filter(d => d.status === "delivered").length,
      retrying: all.filter(d => d.status === "retrying").length,
      failed: all.filter(d => d.status === "failed").length,
      deadLetter: this.deadLetterQueue.length,
    };
  }

  private calculateDelay(policy: WebhookRetryPolicy, attempt: number): number {
    let delay: number;
    switch (policy.backoffType) {
      case "exponential": delay = policy.initialDelayMs * Math.pow(2, attempt - 1); break;
      case "linear": delay = policy.initialDelayMs * attempt; break;
      default: delay = policy.initialDelayMs;
    }
    return Math.min(delay, policy.maxDelayMs);
  }
}

export const webhookRetryService = new WebhookRetryService();
