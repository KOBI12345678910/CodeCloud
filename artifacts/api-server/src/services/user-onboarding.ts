export interface OnboardingProgress { userId: string; completed: string[]; currentStep: string | null; skipped: string[]; startedAt: Date; completedAt: Date | null; }
class UserOnboardingService {
  private steps = ["welcome", "create-project", "write-code", "run-preview", "invite-collaborator", "deploy", "explore-community"];
  private progress: Map<string, OnboardingProgress> = new Map();
  start(userId: string): OnboardingProgress { const p: OnboardingProgress = { userId, completed: [], currentStep: this.steps[0], skipped: [], startedAt: new Date(), completedAt: null }; this.progress.set(userId, p); return p; }
  completeStep(userId: string, step: string): OnboardingProgress | null {
    const p = this.progress.get(userId); if (!p) return null;
    if (!p.completed.includes(step)) p.completed.push(step);
    const nextIdx = this.steps.indexOf(step) + 1;
    p.currentStep = nextIdx < this.steps.length ? this.steps[nextIdx] : null;
    if (p.completed.length >= this.steps.length) p.completedAt = new Date();
    return p;
  }
  skipStep(userId: string, step: string): OnboardingProgress | null { const p = this.progress.get(userId); if (!p) return null; if (!p.skipped.includes(step)) p.skipped.push(step); return this.completeStep(userId, step); }
  get(userId: string): OnboardingProgress | null { return this.progress.get(userId) || null; }
  getSteps(): string[] { return [...this.steps]; }
  reset(userId: string): OnboardingProgress { return this.start(userId); }
}
export const userOnboardingService = new UserOnboardingService();
