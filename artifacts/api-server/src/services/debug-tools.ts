export interface DebugSession {
  id: string;
  containerId: string;
  status: "active" | "paused" | "ended";
  breakpoints: Breakpoint[];
  variables: Variable[];
  callStack: StackFrame[];
  startedAt: Date;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition: string | null;
  hitCount: number;
  enabled: boolean;
}

export interface Variable { name: string; value: string; type: string; scope: string; }
export interface StackFrame { id: number; name: string; file: string; line: number; column: number; }

class DebugToolsService {
  private sessions: Map<string, DebugSession> = new Map();

  startSession(containerId: string): DebugSession {
    const id = `dbg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: DebugSession = { id, containerId, status: "active", breakpoints: [], variables: [], callStack: [], startedAt: new Date() };
    this.sessions.set(id, session);
    return session;
  }

  addBreakpoint(sessionId: string, file: string, line: number, condition?: string): Breakpoint | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const bp: Breakpoint = { id: `bp-${session.breakpoints.length + 1}`, file, line, condition: condition || null, hitCount: 0, enabled: true };
    session.breakpoints.push(bp);
    return bp;
  }

  removeBreakpoint(sessionId: string, bpId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const idx = session.breakpoints.findIndex(b => b.id === bpId);
    if (idx === -1) return false;
    session.breakpoints.splice(idx, 1);
    return true;
  }

  evaluate(sessionId: string, expression: string): { result: string; type: string } | null {
    if (!this.sessions.has(sessionId)) return null;
    return { result: `<evaluated: ${expression}>`, type: "string" };
  }

  getSession(id: string): DebugSession | null { return this.sessions.get(id) || null; }
  endSession(id: string): boolean {
    const s = this.sessions.get(id); if (!s) return false; s.status = "ended"; return true;
  }
  listSessions(): DebugSession[] { return Array.from(this.sessions.values()); }
}

export const debugToolsService = new DebugToolsService();
