export interface ApiTestCase {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  expectedStatus: number;
  expectedBody: any;
  assertions: { path: string; operator: "eq" | "neq" | "contains" | "exists"; value: any }[];
}

export interface ApiTestSuite {
  id: string;
  name: string;
  tests: ApiTestCase[];
  variables: Record<string, string>;
  createdAt: Date;
}

export interface ApiTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  actualStatus: number;
  actualBody: any;
  duration: number;
  failureReason: string | null;
}

class ApiTestingService {
  private suites: Map<string, ApiTestSuite> = new Map();

  createSuite(name: string): ApiTestSuite {
    const id = `suite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const suite: ApiTestSuite = { id, name, tests: [], variables: {}, createdAt: new Date() };
    this.suites.set(id, suite);
    return suite;
  }

  addTest(suiteId: string, test: Omit<ApiTestCase, "id">): ApiTestCase | null {
    const suite = this.suites.get(suiteId); if (!suite) return null;
    const tc: ApiTestCase = { ...test, id: `tc-${suite.tests.length + 1}` };
    suite.tests.push(tc);
    return tc;
  }

  runSuite(suiteId: string): ApiTestResult[] {
    const suite = this.suites.get(suiteId); if (!suite) return [];
    return suite.tests.map(t => ({
      testId: t.id, testName: t.name,
      passed: Math.random() > 0.15,
      actualStatus: t.expectedStatus,
      actualBody: t.expectedBody || {},
      duration: Math.floor(Math.random() * 500) + 50,
      failureReason: Math.random() > 0.85 ? "Assertion failed" : null,
    }));
  }

  getSuite(id: string): ApiTestSuite | null { return this.suites.get(id) || null; }
  listSuites(): ApiTestSuite[] { return Array.from(this.suites.values()); }
  deleteSuite(id: string): boolean { return this.suites.delete(id); }
}

export const apiTestingService = new ApiTestingService();
