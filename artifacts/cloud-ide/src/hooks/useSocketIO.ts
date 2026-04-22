import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "@clerk/react";
import { io, Socket } from "socket.io-client";

interface SocketIOOptions {
  userId: string;
  userName: string;
  avatarUrl?: string;
  projectId?: string;
}

interface PresenceUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  color: string;
  activeFile: string | null;
  cursor: { line: number; column: number } | null;
}

interface CursorUpdate {
  userId: string;
  userName: string;
  color: string;
  file: string;
  line: number;
  column: number;
}

interface SelectionUpdate {
  userId: string;
  color: string;
  file: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export function useSocketIO(options: SocketIOOptions | null) {
  const socketRef = useRef<Socket | null>(null);
  const terminalSocketRef = useRef<Socket | null>(null);
  const { session } = useSession();
  const [connected, setConnected] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorUpdate>>(new Map());
  const [remoteSelections, setRemoteSelections] = useState<Map<string, SelectionUpdate>>(new Map());
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const followingUserRef = useRef<string | null>(null);
  followingUserRef.current = followingUser;
  const [followTarget, setFollowTarget] = useState<{ file: string; line: number; column: number } | null>(null);

  useEffect(() => {
    if (!options || !session) return;

    let cancelled = false;

    (async () => {
      const token = await session.getToken();
      if (!token || cancelled) {
        console.error("Failed to get session token for Socket.IO auth");
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "";
      const socket = io(apiUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        withCredentials: true,
        auth: {
          token,
          userName: options.userName,
          avatarUrl: options.avatarUrl,
        },
      });

      if (cancelled) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
      });

      socket.on("auth:success", () => {
        if (options.projectId) {
          socket.emit("project:join", { projectId: options.projectId });
        }
      });

      socket.on("connect_error", (err: Error) => {
        console.error("Socket.IO connection error:", err.message);
      });

      socket.on("presence:update", (data: { users: PresenceUser[] }) => {
        setPresenceUsers(data.users.filter(u => u.userId !== options.userId));
      });

      socket.on("cursor:update", (data: CursorUpdate) => {
        setRemoteCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });

        if (followingUserRef.current === data.userId) {
          setFollowTarget({ file: data.file, line: data.line, column: data.column });
        }
      });

      socket.on("cursor:selection", (data: SelectionUpdate) => {
        setRemoteSelections(prev => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });
      });

      socket.on("disconnect", () => setConnected(false));
      socket.io.on("reconnect_attempt", async () => {
        const freshToken = await session.getToken();
        if (freshToken) {
          socket.auth = {
            token: freshToken,
            userName: options.userName,
            avatarUrl: options.avatarUrl,
          };
        }
      });
      socket.io.on("reconnect", () => {
        setConnected(true);
      });

      const termSocket = io(`${apiUrl}/terminal`, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        withCredentials: true,
        auth: { token, userName: options.userName, avatarUrl: options.avatarUrl },
      });

      if (!cancelled) {
        terminalSocketRef.current = termSocket;
      } else {
        termSocket.disconnect();
      }

      termSocket.on("connect", () => {
        setTerminalConnected(true);
      });
      termSocket.on("disconnect", () => {
        setTerminalConnected(false);
      });
      termSocket.on("connect_error", (err: Error) => {
        console.error("Terminal namespace connection error:", err.message);
        setTerminalConnected(false);
      });
      termSocket.io.on("reconnect_attempt", async () => {
        const freshToken = await session.getToken();
        if (freshToken) {
          termSocket.auth = { token: freshToken, userName: options.userName, avatarUrl: options.avatarUrl };
        }
      });
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (terminalSocketRef.current) {
        terminalSocketRef.current.disconnect();
        terminalSocketRef.current = null;
      }
      setConnected(false);
      setTerminalConnected(false);
    };
  }, [options?.userId, options?.projectId, session]);

  const sendCursorUpdate = useCallback((file: string, line: number, column: number) => {
    socketRef.current?.emit("cursor:update", { file, line, column });
  }, []);

  const sendSelection = useCallback((file: string, startLine: number, startCol: number, endLine: number, endCol: number) => {
    socketRef.current?.emit("cursor:selection", { file, startLine, startCol, endLine, endCol });
  }, []);

  const sendFileOpen = useCallback((file: string) => {
    socketRef.current?.emit("file:open", { file });
  }, []);

  const sendEditOperation = useCallback((file: string, operation: string, position: { line: number; col: number }, content: string) => {
    socketRef.current?.emit("edit:operation", { file, operation, position, content });
  }, []);

  const sendYjsSync = useCallback((file: string, update: Uint8Array) => {
    socketRef.current?.emit("yjs:sync", { file, update: update.buffer });
  }, []);

  const sendYjsAwareness = useCallback((file: string, update: Uint8Array) => {
    socketRef.current?.emit("yjs:awareness", { file, update: update.buffer });
  }, []);

  const sendTerminalInput = useCallback((sessionId: string, data: string) => {
    terminalSocketRef.current?.emit("input", { sessionId, data });
  }, []);

  const sendTerminalResize = useCallback((sessionId: string, cols: number, rows: number) => {
    terminalSocketRef.current?.emit("resize", { sessionId, cols, rows });
  }, []);

  const createTerminal = useCallback((sessionId: string, shared: boolean = false) => {
    const projectId = options?.projectId;
    if (!projectId) return;
    terminalSocketRef.current?.emit("create", { sessionId, projectId, shared });
  }, [options?.projectId]);

  const joinTerminal = useCallback((sessionId: string) => {
    const projectId = options?.projectId;
    if (!projectId) return;
    terminalSocketRef.current?.emit("join", { sessionId, projectId });
  }, [options?.projectId]);

  const startFollowing = useCallback((targetUserId: string) => {
    setFollowingUser(targetUserId);
    socketRef.current?.emit("follow:start", { targetUserId });
  }, []);

  const stopFollowing = useCallback(() => {
    setFollowingUser(null);
    setFollowTarget(null);
    socketRef.current?.emit("follow:stop");
  }, []);

  const leaveTerminal = useCallback((sessionId: string) => {
    terminalSocketRef.current?.emit("leave", { sessionId });
  }, []);

  const resizeTerminal = useCallback((sessionId: string, cols: number, rows: number) => {
    terminalSocketRef.current?.emit("resize", { sessionId, cols, rows });
  }, []);

  const onTerminalOutput = useCallback((handler: (data: { sessionId: string; data: string; userId?: string }) => void) => {
    terminalSocketRef.current?.on("output", handler);
    return () => { terminalSocketRef.current?.off("output", handler); };
  }, []);

  const onTerminalCreated = useCallback((handler: (data: { sessionId: string }) => void) => {
    terminalSocketRef.current?.on("created", handler);
    return () => { terminalSocketRef.current?.off("created", handler); };
  }, []);

  const onTerminalScrollback = useCallback((handler: (data: { sessionId: string; lines: string[] }) => void) => {
    terminalSocketRef.current?.on("scrollback", handler);
    return () => { terminalSocketRef.current?.off("scrollback", handler); };
  }, []);

  const onYjsSync = useCallback((handler: (data: { userId: string; file: string; update: ArrayBuffer }) => void) => {
    socketRef.current?.on("yjs:sync", handler);
    return () => { socketRef.current?.off("yjs:sync", handler); };
  }, []);

  const onEditOperation = useCallback((handler: (data: { userId: string; userName: string; file: string; operation: string; position: { line: number; col: number }; content: string }) => void) => {
    socketRef.current?.on("edit:operation", handler);
    return () => { socketRef.current?.off("edit:operation", handler); };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    terminalConnected,
    presenceUsers,
    remoteCursors,
    remoteSelections,
    followingUser,
    followTarget,
    sendCursorUpdate,
    sendSelection,
    sendFileOpen,
    sendEditOperation,
    sendYjsSync,
    sendYjsAwareness,
    sendTerminalInput,
    sendTerminalResize,
    createTerminal,
    joinTerminal,
    leaveTerminal,
    resizeTerminal,
    startFollowing,
    stopFollowing,
    onTerminalOutput,
    onTerminalCreated,
    onTerminalScrollback,
    onYjsSync,
    onEditOperation,
  };
}
