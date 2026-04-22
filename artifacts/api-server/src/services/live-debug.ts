export interface DebugSession {
  id: string;
  containerId: string;
  status: "attached" | "detached" | "paused";
  breakpoints: Breakpoint[];
  watchExpressions: WatchExpression[];
  callStack: StackFrame[];
  variables: Variable[];
  createdAt: Date;
}

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition: string | null;
  hitCount: number;
  enabled: boolean;
}

interface WatchExpression {
  expression: string;
  value: string;
  type: string;
}

interface StackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
}

interface Variable {
  name: string;
  value: string;
  type: string;
  scope: "local" | "global" | "closure";
}

class LiveDebugService {
  private sessions: Map<string, DebugSession> = new Map();

  attach(containerId: string): DebugSession {
    const id = `dbg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const session: DebugSession = {
      id, containerId, status: "attached", breakpoints: [], watchExpressions: [],
      callStack: [
        { id: 0, name: "handleRequest", file: "src/server.ts", line: 42, column: 5 },
        { id: 1, name: "processMiddleware", file: "src/middleware.ts", line: 18, column: 3 },
        { id: 2, name: "main", file: "src/index.ts", line: 7, column: 1 },
      ],
      variables: [
        { name: "req", value: "IncomingMessage {...}", type: "object", scope: "local" },
        { name: "res", value: "ServerResponse {...}", type: "object", scope: "local" },
        { name: "PORT", value: "3000", type: "number", scope: "global" },
      ],
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  detach(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.status = "detached";
    return true;
  }

  addBreakpoint(sessionId: string, file: string, line: number, condition?: string): Breakpoint | null {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    const bp: Breakpoint = { id: `bp-${Date.now()}`, file, line, condition: condition || null, hitCount: 0, enabled: true };
    s.breakpoints.push(bp);
    return bp;
  }

  removeBreakpoint(sessionId: string, bpId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.breakpoints = s.breakpoints.filter(b => b.id !== bpId);
    return true;
  }

  evaluate(sessionId: string, expression: string): { value: string; type: string } | null {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    const mockResults: Record<string, { value: string; type: string }> = {
      "1+1": { value: "2", type: "number" },
      "typeof req": { value: "object", type: "string" },
      "process.env.NODE_ENV": { value: "development", type: "string" },
    };
    return mockResults[expression] || { value: `<evaluated: ${expression}>`, type: "unknown" };
  }

  stepOver(sessionId: string): DebugSession | null {
    const s = this.sessions.get(sessionId);
    if (!s || s.callStack.length === 0) return null;
    s.callStack[0].line++;
    return s;
  }

  getSessions(): DebugSession[] { return Array.from(this.sessions.values()); }
  get(id: string): DebugSession | null { return this.sessions.get(id) || null; }
}

export const liveDebugService = new LiveDebugService();
