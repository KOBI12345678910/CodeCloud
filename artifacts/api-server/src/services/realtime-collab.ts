export interface CollabSession {
  id: string;
  projectId: string;
  activeUsers: { userId: string; userName: string; cursor: { file: string; line: number; column: number } | null; color: string; joinedAt: Date }[];
  createdAt: Date;
}

export interface CollabEdit {
  sessionId: string;
  userId: string;
  file: string;
  operation: "insert" | "delete" | "replace";
  position: { line: number; column: number };
  content: string;
  timestamp: Date;
}

class RealtimeCollabService {
  private sessions: Map<string, CollabSession> = new Map();
  private edits: CollabEdit[] = [];
  private colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

  createSession(projectId: string): CollabSession {
    const id = `collab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: CollabSession = { id, projectId, activeUsers: [], createdAt: new Date() };
    this.sessions.set(id, session);
    return session;
  }

  joinSession(sessionId: string, userId: string, userName: string): CollabSession | null {
    const session = this.sessions.get(sessionId); if (!session) return null;
    if (session.activeUsers.find(u => u.userId === userId)) return session;
    session.activeUsers.push({ userId, userName, cursor: null, color: this.colors[session.activeUsers.length % this.colors.length], joinedAt: new Date() });
    return session;
  }

  leaveSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    session.activeUsers = session.activeUsers.filter(u => u.userId !== userId);
    return true;
  }

  updateCursor(sessionId: string, userId: string, file: string, line: number, column: number): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    const user = session.activeUsers.find(u => u.userId === userId); if (!user) return false;
    user.cursor = { file, line, column };
    return true;
  }

  applyEdit(edit: Omit<CollabEdit, "timestamp">): CollabEdit {
    const fullEdit = { ...edit, timestamp: new Date() };
    this.edits.push(fullEdit);
    if (this.edits.length > 10000) this.edits = this.edits.slice(-5000);
    return fullEdit;
  }

  getSession(id: string): CollabSession | null { return this.sessions.get(id) || null; }
  getSessionByProject(projectId: string): CollabSession | null { return Array.from(this.sessions.values()).find(s => s.projectId === projectId) || null; }
  getEdits(sessionId: string, limit: number = 100): CollabEdit[] { return this.edits.filter(e => e.sessionId === sessionId).slice(-limit); }
  endSession(id: string): boolean { return this.sessions.delete(id); }
}

export const realtimeCollabService = new RealtimeCollabService();
