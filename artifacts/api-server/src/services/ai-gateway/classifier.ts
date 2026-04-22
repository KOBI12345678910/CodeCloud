import type { TaskType } from "./registry";

const RULES: Array<{ type: TaskType; patterns: RegExp[] }> = [
  { type: "code", patterns: [/\b(refactor|debug|implement|function|class|method|stack ?trace|TypeError|null|undefined|fix the bug|compile|syntax)\b/i, /```/, /\b(typescript|javascript|python|rust|go|java|c\+\+)\b/i] },
  { type: "math", patterns: [/\b(integral|derivative|equation|theorem|prove|matrix|vector|probability|integral|sum of|=\s*\d+)\b/i, /\d+\s*[+\-*/]\s*\d+/] },
  { type: "vision", patterns: [/\b(image|photo|screenshot|diagram|chart|picture|describe.*image)\b/i] },
  { type: "reasoning", patterns: [/\b(why|explain|analy[sz]e|compare|trade.?off|step by step|root cause|chain of thought)\b/i] },
  { type: "content", patterns: [/\b(write|draft|blog|email|tweet|landing page|marketing|copy|headline|tagline|article|story)\b/i] },
];

export function classify(prompt: string): TaskType {
  const scores: Record<TaskType, number> = { code: 0, content: 0, math: 0, vision: 0, reasoning: 0, general: 0 };
  for (const rule of RULES) {
    for (const re of rule.patterns) if (re.test(prompt)) scores[rule.type]++;
  }
  const best = (Object.entries(scores) as Array<[TaskType, number]>).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "general";
}

interface OverrideRecord { userId: string; suggested: string; chosen: string; taskType: TaskType; ts: number; }

class RecommendationService {
  private overrides: OverrideRecord[] = [];

  recordOverride(userId: string, suggested: string, chosen: string, taskType: TaskType): void {
    this.overrides.push({ userId, suggested, chosen, taskType, ts: Date.now() });
    if (this.overrides.length > 5000) this.overrides.shift();
  }

  preferenceFor(userId: string, taskType: TaskType): string | null {
    const recent = this.overrides.filter(o => o.userId === userId && o.taskType === taskType).slice(-20);
    if (recent.length < 2) return null;
    const counts = new Map<string, number>();
    for (const r of recent) counts.set(r.chosen, (counts.get(r.chosen) ?? 0) + 1);
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return top && top[1] >= 2 ? top[0] : null;
  }

  globalCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const o of this.overrides) counts[o.chosen] = (counts[o.chosen] ?? 0) + 1;
    return counts;
  }

  userCounts(userId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const o of this.overrides) if (o.userId === userId) counts[o.chosen] = (counts[o.chosen] ?? 0) + 1;
    return counts;
  }
}

export const recommendations = new RecommendationService();
