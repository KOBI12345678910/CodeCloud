import type { Provider } from "./registry";

export type CircuitState = "closed" | "open" | "half-open";

interface BreakerEntry {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
  openedAt: number;
}

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

class CircuitBreaker {
  private breakers: Map<Provider, BreakerEntry> = new Map();

  private get(p: Provider): BreakerEntry {
    let b = this.breakers.get(p);
    if (!b) {
      b = { state: "closed", failures: 0, lastFailureAt: 0, openedAt: 0 };
      this.breakers.set(p, b);
    }
    if (b.state === "open" && Date.now() - b.openedAt > COOLDOWN_MS) {
      b.state = "half-open";
    }
    return b;
  }

  isOpen(p: Provider): boolean {
    const b = this.get(p);
    return b.state === "open";
  }

  recordSuccess(p: Provider): void {
    const b = this.get(p);
    b.failures = 0;
    b.state = "closed";
  }

  recordFailure(p: Provider): void {
    const b = this.get(p);
    b.failures++;
    b.lastFailureAt = Date.now();
    if (b.failures >= FAILURE_THRESHOLD) {
      b.state = "open";
      b.openedAt = Date.now();
    }
  }

  status(): Record<string, { state: CircuitState; failures: number; cooldownRemainingMs: number }> {
    const out: Record<string, { state: CircuitState; failures: number; cooldownRemainingMs: number }> = {};
    for (const [p, b] of this.breakers) {
      out[p] = {
        state: b.state,
        failures: b.failures,
        cooldownRemainingMs: b.state === "open" ? Math.max(0, COOLDOWN_MS - (Date.now() - b.openedAt)) : 0,
      };
    }
    return out;
  }

  reset(p?: Provider): void {
    if (p) this.breakers.delete(p);
    else this.breakers.clear();
  }
}

export const circuitBreaker = new CircuitBreaker();
