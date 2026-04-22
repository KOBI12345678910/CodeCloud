export interface DeployTest {
  id: string;
  deploymentId: string;
  type: "smoke" | "integration" | "e2e" | "health";
  status: "pending" | "running" | "passed" | "failed";
  results: { name: string; passed: boolean; duration: number; error?: string }[];
  startedAt: Date | null;
  completedAt: Date | null;
}

class DeployTestingService {
  private tests: Map<string, DeployTest> = new Map();

  create(deploymentId: string, type: DeployTest["type"]): DeployTest {
    const id = `dt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const test: DeployTest = { id, deploymentId, type, status: "pending", results: [], startedAt: null, completedAt: null };
    this.tests.set(id, test);
    return test;
  }

  run(id: string): DeployTest | null {
    const test = this.tests.get(id); if (!test) return null;
    test.status = "running"; test.startedAt = new Date();
    const testCases = test.type === "smoke" ? ["Health check", "Homepage loads", "API responds"] :
      test.type === "e2e" ? ["Login flow", "Create project", "Deploy project", "Preview loads"] :
      ["DB connection", "Auth service", "File storage"];
    test.results = testCases.map(name => ({ name, passed: Math.random() > 0.1, duration: Math.floor(Math.random() * 2000) + 100, ...(Math.random() > 0.9 ? { error: "Timeout" } : {}) }));
    test.status = test.results.every(r => r.passed) ? "passed" : "failed";
    test.completedAt = new Date();
    return test;
  }

  get(id: string): DeployTest | null { return this.tests.get(id) || null; }
  listByDeployment(deploymentId: string): DeployTest[] { return Array.from(this.tests.values()).filter(t => t.deploymentId === deploymentId); }
}

export const deployTestingService = new DeployTestingService();
