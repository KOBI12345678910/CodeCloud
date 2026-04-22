import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "@clerk/express";
import { db, usersTable, collaboratorsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

interface AuthenticatedSocketData {
  userId: string;
  dbUserId: string;
  dbUsername: string;
  dbDisplayName: string;
  dbAvatarUrl: string | null;
}

interface ServerToClientEvents {
  [event: string]: (...args: unknown[]) => void;
}

interface ClientToServerEvents {
  [event: string]: (...args: unknown[]) => void;
}

type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, AuthenticatedSocketData>;

export interface SocketUser {
  userId: string;
  dbUserId: string;
  userName: string;
  avatarUrl: string | null;
  color: string;
  projectId: string | null;
  activeFile: string | null;
  cursor: { line: number; column: number } | null;
  following: string | null;
}

const COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ec4899", "#eab308", "#14b8a6", "#ef4444",
  "#6366f1", "#06b6d4", "#84cc16", "#f43f5e",
];

let colorIndex = 0;

function nextColor(): string {
  const c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

const onlineUsers = new Map<string, SocketUser>();

let io: SocketIOServer | null = null;

async function verifySocketAuth(token: string): Promise<{ clerkId: string } | null> {
  if (!token) return null;
  try {
    const secretKey = process.env["CLERK_SECRET_KEY"];
    if (!secretKey) {
      logger.warn("CLERK_SECRET_KEY not set, socket auth unavailable");
      return null;
    }
    const payload = await verifyToken(token, { secretKey });
    if (payload?.sub) return { clerkId: payload.sub };
    return null;
  } catch (err) {
    logger.debug({ err }, "Socket auth token verification failed");
    return null;
  }
}

async function checkProjectAccess(dbUserId: string, projectId: string): Promise<boolean> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return false;
  if (project.ownerId === dbUserId) return true;
  if (project.isPublic) return true;
  const [collab] = await db.select().from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, dbUserId)));
  return !!collab;
}

export function initSocketIO(server: HttpServer): SocketIOServer {
  const allowedOrigins = process.env["CORS_ORIGIN"]
    ? process.env["CORS_ORIGIN"].split(",")
    : [process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "http://localhost:5173"];

  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error("Session token required"));
    }

    const verified = await verifySocketAuth(token);
    if (!verified) {
      return next(new Error("Invalid session token"));
    }

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, verified.clerkId));
    if (!dbUser) {
      return next(new Error("User not found"));
    }

    socket.data.userId = verified.clerkId;
    socket.data.dbUserId = dbUser.id;
    socket.data.dbUsername = dbUser.username || "";
    socket.data.dbDisplayName = dbUser.displayName || dbUser.username || "";
    socket.data.dbAvatarUrl = dbUser.avatarUrl || null;
    next();
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const clerkId = socket.data.userId;
    const dbUserId = socket.data.dbUserId;
    const userName = socket.data.dbDisplayName || socket.data.dbUsername || "User";
    const avatarUrl = socket.data.dbAvatarUrl;

    logger.info({ socketId: socket.id, userId: clerkId }, "Socket.IO client authenticated");

    const user: SocketUser = {
      userId: clerkId,
      dbUserId,
      userName,
      avatarUrl,
      color: nextColor(),
      projectId: null,
      activeFile: null,
      cursor: null,
      following: null,
    };
    onlineUsers.set(socket.id, user);
    socket.emit("auth:success", { color: user.color, verified: true });

    socket.on("project:join", async (data: { projectId: string }) => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const hasAccess = await checkProjectAccess(user.dbUserId, data.projectId);
      if (!hasAccess) {
        socket.emit("project:error", { error: "Access denied" });
        return;
      }

      if (user.projectId) socket.leave(`project:${user.projectId}`);
      user.projectId = data.projectId;
      socket.join(`project:${data.projectId}`);
      broadcastPresence(data.projectId);
    });

    socket.on("project:leave", () => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      const pid = user.projectId;
      socket.leave(`project:${pid}`);
      user.projectId = null;
      user.activeFile = null;
      user.cursor = null;
      broadcastPresence(pid);
    });

    socket.on("cursor:update", (data: { file: string; line: number; column: number }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      user.activeFile = data.file;
      user.cursor = { line: data.line, column: data.column };
      socket.to(`project:${user.projectId}`).emit("cursor:update", {
        userId: user.userId,
        userName: user.userName,
        color: user.color,
        file: data.file,
        line: data.line,
        column: data.column,
      });
    });

    socket.on("cursor:selection", (data: { file: string; startLine: number; startCol: number; endLine: number; endCol: number }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      socket.to(`project:${user.projectId}`).emit("cursor:selection", {
        userId: user.userId,
        color: user.color,
        ...data,
      });
    });

    socket.on("file:open", (data: { file: string }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      user.activeFile = data.file;
      broadcastPresence(user.projectId);
    });

    socket.on("edit:operation", (data: { file: string; operation: string; position: { line: number; col: number }; content: string }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      socket.to(`project:${user.projectId}`).emit("edit:operation", {
        userId: user.userId,
        userName: user.userName,
        ...data,
      });
    });

    socket.on("yjs:sync", (data: { file: string; update: ArrayBuffer }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      socket.to(`project:${user.projectId}`).emit("yjs:sync", {
        userId: user.userId,
        file: data.file,
        update: data.update,
      });
    });

    socket.on("yjs:awareness", (data: { file: string; update: ArrayBuffer }) => {
      const user = onlineUsers.get(socket.id);
      if (!user?.projectId) return;
      socket.to(`project:${user.projectId}`).emit("yjs:awareness", {
        userId: user.userId,
        file: data.file,
        update: data.update,
      });
    });

    socket.on("deployment:subscribe", async (data: { deploymentId: string; projectId?: string }) => {
      const u = onlineUsers.get(socket.id);
      if (!u) return;
      const { db, deploymentsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const [dep] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, data.deploymentId));
      if (!dep) {
        socket.emit("deployment:error", { error: "Deployment not found" });
        return;
      }
      const ok = await checkProjectAccess(u.dbUserId, dep.projectId);
      if (!ok) {
        socket.emit("deployment:error", { error: "Access denied" });
        return;
      }
      socket.join(`deployment:${data.deploymentId}`);
      socket.emit("deployment:subscribed", { deploymentId: data.deploymentId, projectId: dep.projectId });
    });

    socket.on("deployment:unsubscribe", (data: { deploymentId: string }) => {
      socket.leave(`deployment:${data.deploymentId}`);
    });

    socket.on("follow:start", (data: { targetUserId: string }) => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;
      user.following = data.targetUserId;
      socket.emit("follow:started", { targetUserId: data.targetUserId });
    });

    socket.on("follow:stop", () => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;
      user.following = null;
      socket.emit("follow:stopped");
    });

    socket.on("disconnect", () => {
      const user = onlineUsers.get(socket.id);
      const pid = user?.projectId;
      onlineUsers.delete(socket.id);
      if (pid) broadcastPresence(pid);
    });
  });

  initTerminalNamespace(io);

  logger.info("Socket.IO server initialized on /socket.io");
  return io;
}

interface TerminalSession {
  id: string;
  scrollback: string[];
  participants: Set<string>;
  cwd: string;
  env: Record<string, string>;
  inputBuffer: string;
}

const terminalSessions = new Map<string, TerminalSession>();

function simulateCommand(command: string, session: TerminalSession): string {
  const cmd = command.trim();
  const parts = cmd.split(/\s+/);
  const base = parts[0] || "";
  const args = parts.slice(1);

  switch (base) {
    case "":
      return "";
    case "echo":
      return args.join(" ") + "\r\n";
    case "pwd":
      return session.cwd + "\r\n";
    case "whoami":
      return (session.env["USER"] || "developer") + "\r\n";
    case "date":
      return new Date().toString() + "\r\n";
    case "ls":
      return "src/  package.json  tsconfig.json  node_modules/  README.md\r\n";
    case "cd": {
      const target = args[0] || "~";
      if (target === "..") {
        const parts = session.cwd.split("/").filter(Boolean);
        parts.pop();
        session.cwd = "/" + parts.join("/");
      } else if (target.startsWith("/")) {
        session.cwd = target;
      } else if (target === "~") {
        session.cwd = "/home/developer";
      } else {
        session.cwd = session.cwd === "/" ? `/${target}` : `${session.cwd}/${target}`;
      }
      return "";
    }
    case "env":
    case "printenv":
      return Object.entries(session.env).map(([k, v]) => `${k}=${v}`).join("\r\n") + "\r\n";
    case "cat":
      return args.length > 0
        ? `cat: ${args[0]}: simulated file system\r\n`
        : "cat: missing operand\r\n";
    case "mkdir":
      return args.length > 0 ? "" : "mkdir: missing operand\r\n";
    case "touch":
      return args.length > 0 ? "" : "touch: missing operand\r\n";
    case "clear":
      return "\x1b[2J\x1b[H";
    case "help":
      return "Available commands: echo, pwd, whoami, date, ls, cd, env, cat, mkdir, touch, clear, help, exit\r\n";
    case "exit":
      return "";
    case "node":
      if (args[0] === "-e" && args.length > 1) {
        try {
          return String(args.slice(1).join(" ")) + "\r\n";
        } catch {
          return "Error evaluating expression\r\n";
        }
      }
      return "node: interactive mode not available in simulated terminal\r\n";
    default:
      return `${base}: command not found\r\n`;
  }
}

function initTerminalNamespace(server: SocketIOServer): void {
  const terminalNs = server.of("/terminal");

  terminalNs.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error("Session token required"));

    const verified = await verifySocketAuth(token);
    if (!verified) return next(new Error("Invalid session token"));

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, verified.clerkId));
    if (!dbUser) return next(new Error("User not found"));

    socket.data.userId = verified.clerkId;
    socket.data.dbUserId = dbUser.id;
    socket.data.dbUsername = dbUser.username || "";
    socket.data.dbDisplayName = dbUser.displayName || dbUser.username || "";
    socket.data.dbAvatarUrl = dbUser.avatarUrl || null;
    next();
  });

  terminalNs.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    const userName = socket.data.dbDisplayName || socket.data.dbUsername || "User";

    socket.on("create", async (data: { sessionId: string; projectId: string; shared?: boolean }) => {
      if (!data.sessionId.startsWith(`${data.projectId}::terminal::`)) {
        socket.emit("error", { error: "Invalid session ID format" });
        return;
      }
      const hasAccess = await checkProjectAccess(socket.data.dbUserId, data.projectId);
      if (!hasAccess) {
        socket.emit("error", { error: "Access denied to project" });
        return;
      }
      socket.join(`session:${data.sessionId}`);

      const existing = terminalSessions.get(data.sessionId);
      if (existing) {
        existing.participants.add(socket.id);
        socket.emit("created", { sessionId: data.sessionId });
        if (existing.scrollback.length > 0) {
          socket.emit("scrollback", { sessionId: data.sessionId, lines: existing.scrollback });
        }
        return;
      }

      const session: TerminalSession = {
        id: data.sessionId,
        scrollback: [],
        participants: new Set([socket.id]),
        cwd: `/home/developer/projects/${data.projectId}`,
        env: { USER: userName, HOME: "/home/developer", TERM: "xterm-256color", SHELL: "/bin/bash" },
        inputBuffer: "",
      };
      terminalSessions.set(data.sessionId, session);
      const prompt = `\x1b[32m${userName}@codecloud\x1b[0m:\x1b[34m${session.cwd}\x1b[0m$ `;
      appendScrollback(session, prompt);
      socket.emit("created", { sessionId: data.sessionId });
      terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: prompt });
    });

    socket.on("join", async (data: { sessionId: string; projectId: string }) => {
      if (!data.sessionId.startsWith(`${data.projectId}::terminal::`)) {
        socket.emit("error", { error: "Invalid session ID format" });
        return;
      }
      const hasAccess = await checkProjectAccess(socket.data.dbUserId, data.projectId);
      if (!hasAccess) {
        socket.emit("error", { error: "Access denied to project" });
        return;
      }
      let session = terminalSessions.get(data.sessionId);
      if (!session) {
        session = {
          id: data.sessionId,
          scrollback: [],
          participants: new Set(),
          cwd: `/home/developer/projects/${data.projectId}`,
          env: { USER: userName, HOME: "/home/developer", TERM: "xterm-256color", SHELL: "/bin/bash" },
          inputBuffer: "",
        };
        terminalSessions.set(data.sessionId, session);
        const prompt = `\x1b[32m${userName}@codecloud\x1b[0m:\x1b[34m${session.cwd}\x1b[0m$ `;
        appendScrollback(session, prompt);
      }
      socket.join(`session:${data.sessionId}`);
      session.participants.add(socket.id);
      socket.emit("scrollback", { sessionId: data.sessionId, lines: session.scrollback });
    });

    socket.on("input", (data: { sessionId: string; data: string }) => {
      const session = terminalSessions.get(data.sessionId);
      if (!session || !session.participants.has(socket.id)) return;

      for (const ch of data.data) {
        if (ch === "\r" || ch === "\n") {
          const command = session.inputBuffer;
          session.inputBuffer = "";
          const echo = "\r\n";
          appendScrollback(session, echo);
          terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: echo });

          const output = simulateCommand(command, session);
          if (output) {
            appendScrollback(session, output);
            terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: output });
          }

          const prompt = `\x1b[32m${userName}@codecloud\x1b[0m:\x1b[34m${session.cwd}\x1b[0m$ `;
          appendScrollback(session, prompt);
          terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: prompt });
        } else if (ch === "\x7f" || ch === "\b") {
          if (session.inputBuffer.length > 0) {
            session.inputBuffer = session.inputBuffer.slice(0, -1);
            const backspace = "\b \b";
            appendScrollback(session, backspace);
            terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: backspace });
          }
        } else if (ch === "\x03") {
          session.inputBuffer = "";
          const ctrlC = "^C\r\n";
          appendScrollback(session, ctrlC);
          terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: ctrlC });
          const prompt = `\x1b[32m${userName}@codecloud\x1b[0m:\x1b[34m${session.cwd}\x1b[0m$ `;
          appendScrollback(session, prompt);
          terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: prompt });
        } else {
          session.inputBuffer += ch;
          appendScrollback(session, ch);
          terminalNs.to(`session:${data.sessionId}`).emit("output", { sessionId: data.sessionId, data: ch });
        }
      }
    });

    socket.on("resize", (data: { sessionId: string; cols: number; rows: number }) => {
      const session = terminalSessions.get(data.sessionId);
      if (!session) return;
      terminalNs.to(`session:${data.sessionId}`).emit("resized", data);
    });

    socket.on("leave", (data: { sessionId: string }) => {
      socket.leave(`session:${data.sessionId}`);
      const session = terminalSessions.get(data.sessionId);
      if (session) {
        session.participants.delete(socket.id);
        if (session.participants.size === 0) terminalSessions.delete(data.sessionId);
      }
    });

    socket.on("disconnect", () => {
      for (const [id, session] of terminalSessions) {
        session.participants.delete(socket.id);
        if (session.participants.size === 0) terminalSessions.delete(id);
      }
    });
  });
}

function appendScrollback(session: TerminalSession, data: string): void {
  session.scrollback.push(data);
  if (session.scrollback.length > 5000) session.scrollback.splice(0, session.scrollback.length - 3000);
}

function broadcastPresence(projectId: string): void {
  if (!io) return;
  const users: Array<Omit<SocketUser, "following">> = [];
  for (const [, user] of onlineUsers) {
    if (user.projectId === projectId) {
      const { following: _f, ...rest } = user;
      users.push(rest);
    }
  }
  io.to(`project:${projectId}`).emit("presence:update", { users });
}

export function getIO(): SocketIOServer | null { return io; }
export function getOnlineUsers(): Map<string, SocketUser> { return onlineUsers; }
