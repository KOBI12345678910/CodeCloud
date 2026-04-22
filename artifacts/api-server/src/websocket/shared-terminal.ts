import { wsManager } from "./manager";
import type { ClientInfo, WsMessage } from "./manager";

interface TerminalSession {
  id: string;
  projectId: string;
  createdBy: string;
  mode: "shared" | "private";
  participants: Map<string, ParticipantInfo>;
  scrollback: string[];
  cols: number;
  rows: number;
  createdAt: number;
}

interface ParticipantInfo {
  clientId: string;
  userId: string;
  userName: string;
  color: string;
  isTyping: boolean;
  lastActivity: number;
  cursorPosition?: { x: number; y: number };
}

const MAX_SCROLLBACK = 5000;
const TYPING_TIMEOUT = 3000;
const PARTICIPANT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#6366f1", "#84cc16", "#e11d48",
];

const sessions = new Map<string, TerminalSession>();
const clientSessionMap = new Map<string, string>();

function getSessionKey(projectId: string, sessionId: string): string {
  return `${projectId}:${sessionId}`;
}

function assignColor(session: TerminalSession): string {
  const usedColors = new Set(
    Array.from(session.participants.values()).map((p) => p.color)
  );
  for (const color of PARTICIPANT_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return PARTICIPANT_COLORS[session.participants.size % PARTICIPANT_COLORS.length]!;
}

function handleSharedTerminalCreate(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    sessionId?: string;
    userName?: string;
    cols?: number;
    rows?: number;
  } | undefined;

  const sessionId = payload?.sessionId || `term-${Date.now().toString(36)}`;
  const key = getSessionKey(client.projectId, sessionId);

  if (sessions.has(key)) {
    wsManager.sendToClient(client, {
      type: "shared-terminal:error",
      channel: "terminal",
      payload: { error: "Session already exists", sessionId },
    });
    return;
  }

  const session: TerminalSession = {
    id: sessionId,
    projectId: client.projectId,
    createdBy: client.userId,
    mode: "shared",
    participants: new Map(),
    scrollback: [],
    cols: payload?.cols || 80,
    rows: payload?.rows || 24,
    createdAt: Date.now(),
  };

  const participant: ParticipantInfo = {
    clientId: client.id,
    userId: client.userId,
    userName: payload?.userName || "Anonymous",
    color: assignColor(session),
    isTyping: false,
    lastActivity: Date.now(),
  };

  session.participants.set(client.id, participant);
  sessions.set(key, session);
  clientSessionMap.set(client.id, key);

  wsManager.sendToClient(client, {
    type: "shared-terminal:created",
    channel: "terminal",
    payload: {
      sessionId,
      mode: session.mode,
      cols: session.cols,
      rows: session.rows,
      participants: [{ userId: participant.userId, userName: participant.userName, color: participant.color }],
    },
  });
}

function handleSharedTerminalJoin(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    sessionId?: string;
    userName?: string;
  } | undefined;

  if (!payload?.sessionId) return;

  const key = getSessionKey(client.projectId, payload.sessionId);
  const session = sessions.get(key);

  if (!session) {
    wsManager.sendToClient(client, {
      type: "shared-terminal:error",
      channel: "terminal",
      payload: { error: "Session not found", sessionId: payload.sessionId },
    });
    return;
  }

  const participant: ParticipantInfo = {
    clientId: client.id,
    userId: client.userId,
    userName: payload.userName || "Anonymous",
    color: assignColor(session),
    isTyping: false,
    lastActivity: Date.now(),
  };

  session.participants.set(client.id, participant);
  clientSessionMap.set(client.id, key);

  wsManager.sendToClient(client, {
    type: "shared-terminal:joined",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      mode: session.mode,
      cols: session.cols,
      rows: session.rows,
      scrollback: session.scrollback.join(""),
      participants: Array.from(session.participants.values()).map((p) => ({
        userId: p.userId,
        userName: p.userName,
        color: p.color,
        isTyping: p.isTyping,
      })),
    },
  });

  broadcastToSession(session, client.id, {
    type: "shared-terminal:participant-joined",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      userId: participant.userId,
      userName: participant.userName,
      color: participant.color,
    },
  });
}

function handleSharedTerminalInput(client: ClientInfo, message: WsMessage): void {
  const key = clientSessionMap.get(client.id);
  if (!key) return;

  const session = sessions.get(key);
  if (!session || session.mode === "private") return;

  const payload = message.payload as { data?: string } | undefined;
  if (!payload?.data) return;

  const participant = session.participants.get(client.id);
  if (participant) {
    participant.lastActivity = Date.now();
    participant.isTyping = true;

    setTimeout(() => {
      if (participant.isTyping && Date.now() - participant.lastActivity > TYPING_TIMEOUT) {
        participant.isTyping = false;
        broadcastToSession(session, undefined, {
          type: "shared-terminal:typing-update",
          channel: "terminal",
          payload: {
            sessionId: session.id,
            userId: participant.userId,
            isTyping: false,
          },
        });
      }
    }, TYPING_TIMEOUT);
  }

  broadcastToSession(session, client.id, {
    type: "shared-terminal:input",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      userId: client.userId,
      userName: participant?.userName || "Anonymous",
      color: participant?.color || "#999",
      data: payload.data,
      timestamp: Date.now(),
    },
  });

  broadcastToSession(session, client.id, {
    type: "shared-terminal:typing-update",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      userId: client.userId,
      isTyping: true,
    },
  });
}

function handleSharedTerminalOutput(client: ClientInfo, message: WsMessage): void {
  const key = clientSessionMap.get(client.id);
  if (!key) return;

  const session = sessions.get(key);
  if (!session) return;

  const payload = message.payload as { data?: string } | undefined;
  if (!payload?.data) return;

  session.scrollback.push(payload.data);
  if (session.scrollback.length > MAX_SCROLLBACK) {
    session.scrollback.splice(0, session.scrollback.length - MAX_SCROLLBACK);
  }

  broadcastToSession(session, client.id, {
    type: "shared-terminal:output",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      data: payload.data,
      timestamp: Date.now(),
    },
  });
}

function handleSharedTerminalResize(client: ClientInfo, message: WsMessage): void {
  const key = clientSessionMap.get(client.id);
  if (!key) return;

  const session = sessions.get(key);
  if (!session) return;

  const payload = message.payload as { cols?: number; rows?: number } | undefined;
  if (!payload?.cols || !payload?.rows) return;

  session.cols = payload.cols;
  session.rows = payload.rows;

  broadcastToSession(session, client.id, {
    type: "shared-terminal:resized",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      cols: payload.cols,
      rows: payload.rows,
    },
  });
}

function handleSharedTerminalMode(client: ClientInfo, message: WsMessage): void {
  const key = clientSessionMap.get(client.id);
  if (!key) return;

  const session = sessions.get(key);
  if (!session) return;

  if (session.createdBy !== client.userId) {
    wsManager.sendToClient(client, {
      type: "shared-terminal:error",
      channel: "terminal",
      payload: { error: "Only the session creator can change mode" },
    });
    return;
  }

  const payload = message.payload as { mode?: "shared" | "private" } | undefined;
  if (!payload?.mode) return;

  session.mode = payload.mode;

  broadcastToSession(session, undefined, {
    type: "shared-terminal:mode-changed",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      mode: session.mode,
      changedBy: client.userId,
    },
  });
}

function handleSharedTerminalLeave(client: ClientInfo, _message: WsMessage): void {
  removeClientFromSession(client);
}

function handleSharedTerminalList(client: ClientInfo, _message: WsMessage): void {
  if (!client.projectId) return;

  const projectSessions: Array<{
    sessionId: string;
    mode: string;
    participantCount: number;
    createdBy: string;
    createdAt: number;
  }> = [];

  for (const [key, session] of sessions) {
    if (session.projectId === client.projectId) {
      projectSessions.push({
        sessionId: session.id,
        mode: session.mode,
        participantCount: session.participants.size,
        createdBy: session.createdBy,
        createdAt: session.createdAt,
      });
    }
  }

  wsManager.sendToClient(client, {
    type: "shared-terminal:list",
    channel: "terminal",
    payload: { sessions: projectSessions },
  });
}

function removeClientFromSession(client: ClientInfo): void {
  const key = clientSessionMap.get(client.id);
  if (!key) return;

  const session = sessions.get(key);
  if (!session) {
    clientSessionMap.delete(client.id);
    return;
  }

  const participant = session.participants.get(client.id);
  session.participants.delete(client.id);
  clientSessionMap.delete(client.id);

  if (session.participants.size === 0) {
    sessions.delete(key);
    return;
  }

  broadcastToSession(session, undefined, {
    type: "shared-terminal:participant-left",
    channel: "terminal",
    payload: {
      sessionId: session.id,
      userId: participant?.userId || client.userId,
      userName: participant?.userName || "Anonymous",
    },
  });
}

function broadcastToSession(
  session: TerminalSession,
  excludeClientId: string | undefined,
  message: WsMessage
): void {
  for (const [clientId, _participant] of session.participants) {
    if (clientId === excludeClientId) continue;
    const clientInfo = wsManager.getClient(clientId);
    if (clientInfo) {
      wsManager.sendToClient(clientInfo, message);
    }
  }
}

export function registerSharedTerminalHandlers(): void {
  wsManager.on("shared-terminal:create", handleSharedTerminalCreate);
  wsManager.on("shared-terminal:join", handleSharedTerminalJoin);
  wsManager.on("shared-terminal:input", handleSharedTerminalInput);
  wsManager.on("shared-terminal:output", handleSharedTerminalOutput);
  wsManager.on("shared-terminal:resize", handleSharedTerminalResize);
  wsManager.on("shared-terminal:mode", handleSharedTerminalMode);
  wsManager.on("shared-terminal:leave", handleSharedTerminalLeave);
  wsManager.on("shared-terminal:list", handleSharedTerminalList);

  wsManager.on("disconnect", (client: ClientInfo) => {
    removeClientFromSession(client);
  });

  console.log("[ws] Shared terminal handlers registered");
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

export function getSessionInfo(projectId: string, sessionId: string) {
  const key = getSessionKey(projectId, sessionId);
  const session = sessions.get(key);
  if (!session) return null;

  return {
    id: session.id,
    projectId: session.projectId,
    mode: session.mode,
    participantCount: session.participants.size,
    participants: Array.from(session.participants.values()).map((p) => ({
      userId: p.userId,
      userName: p.userName,
      color: p.color,
      isTyping: p.isTyping,
    })),
    createdBy: session.createdBy,
    createdAt: session.createdAt,
    scrollbackSize: session.scrollback.length,
  };
}
