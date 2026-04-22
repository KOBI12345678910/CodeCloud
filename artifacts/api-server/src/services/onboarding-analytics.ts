export interface OnboardingStep {
  id: string;
  name: string;
  order: number;
  completedCount: number;
  dropoffCount: number;
  dropoffRate: number;
  avgTimeToComplete: number;
}

export interface OnboardingFunnel {
  steps: OnboardingStep[];
  totalUsers: number;
  completionRate: number;
  avgCompletionTime: number;
  abTests: ABTest[];
}

export interface ABTest {
  id: string;
  name: string;
  variants: { id: string; name: string; conversionRate: number; sampleSize: number }[];
  status: "running" | "completed" | "paused";
  startedAt: string;
  winner?: string;
}

const STEPS = ["signup", "email_verified", "first_project", "first_file", "first_run", "first_deploy"];

export function getOnboardingFunnel(): OnboardingFunnel {
  const totalUsers = 10000 + Math.floor(Math.random() * 5000);
  let remaining = totalUsers;

  const steps: OnboardingStep[] = STEPS.map((name, i) => {
    const dropoffRate = 0.05 + Math.random() * 0.15;
    const dropoff = Math.floor(remaining * dropoffRate);
    const completed = remaining - dropoff;
    const step: OnboardingStep = {
      id: name,
      name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      order: i + 1,
      completedCount: completed,
      dropoffCount: dropoff,
      dropoffRate: Math.round(dropoffRate * 100),
      avgTimeToComplete: Math.floor(Math.random() * 300) + 30,
    };
    remaining = completed;
    return step;
  });

  return {
    steps,
    totalUsers,
    completionRate: Math.round((remaining / totalUsers) * 100),
    avgCompletionTime: steps.reduce((s, st) => s + st.avgTimeToComplete, 0),
    abTests: [
      {
        id: "onb-1", name: "Welcome Tour vs Quick Start", status: "running",
        variants: [
          { id: "a", name: "Welcome Tour", conversionRate: 67, sampleSize: 2500 },
          { id: "b", name: "Quick Start", conversionRate: 72, sampleSize: 2500 },
        ],
        startedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: "onb-2", name: "Template First vs Blank Project", status: "completed",
        variants: [
          { id: "a", name: "Template First", conversionRate: 78, sampleSize: 3000 },
          { id: "b", name: "Blank Project", conversionRate: 61, sampleSize: 3000 },
        ],
        startedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        winner: "a",
      },
    ],
  };
}

export function trackOnboardingEvent(userId: string, step: string, metadata?: Record<string, any>) {
  return { success: true, userId, step, trackedAt: new Date().toISOString(), metadata };
}
