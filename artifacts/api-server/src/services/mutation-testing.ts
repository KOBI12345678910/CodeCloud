export interface MutationRun {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed";
  totalMutants: number;
  killed: number;
  survived: number;
  timeout: number;
  score: number;
  survivors: MutantResult[];
  startedAt: Date;
  completedAt: Date | null;
}

interface MutantResult {
  id: string;
  file: string;
  line: number;
  mutationType: string;
  original: string;
  mutated: string;
  status: "killed" | "survived" | "timeout";
}

class MutationTestingService {
  private runs: MutationRun[] = [];

  run(projectId: string, files: string[]): MutationRun {
    const total = files.length * 5;
    const killed = Math.floor(total * (0.65 + Math.random() * 0.25));
    const timeouts = Math.floor(Math.random() * 3);
    const survived = total - killed - timeouts;

    const survivors: MutantResult[] = [];
    const mutations = ["ArithmeticOperator", "ConditionalBoundary", "NegateConditional", "ReturnValue", "VoidMethod"];
    for (let i = 0; i < survived; i++) {
      const file = files[Math.floor(Math.random() * files.length)];
      const mut = mutations[Math.floor(Math.random() * mutations.length)];
      survivors.push({
        id: `mut-${i}`, file, line: Math.floor(Math.random() * 100) + 1,
        mutationType: mut, original: "a > b", mutated: "a >= b", status: "survived",
      });
    }

    const run: MutationRun = {
      id: `mr-${Date.now()}`, projectId, status: "completed",
      totalMutants: total, killed, survived, timeout: timeouts,
      score: Math.round((killed / total) * 100),
      survivors, startedAt: new Date(), completedAt: new Date(),
    };
    this.runs.push(run);
    return run;
  }

  list(projectId?: string): MutationRun[] {
    return projectId ? this.runs.filter(r => r.projectId === projectId) : this.runs;
  }
  get(id: string): MutationRun | null { return this.runs.find(r => r.id === id) || null; }
}

export const mutationTestingService = new MutationTestingService();
