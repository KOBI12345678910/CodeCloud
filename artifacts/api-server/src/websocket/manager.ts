import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { Server as HttpServer } from "http";
import { randomUUID } from "crypto";

export type ChannelType =
  | "terminal"
  | "collaboration"
  | "notifications"
  | "deployment-logs"
  | "container-status"
  | "file-watcher";

export interface ClientInfo {
  id: string;
  ws: WebSocket;
  userId: string | null;
  projectId: string | null;
  channels: Set<ChannelType>;
  connectedAt: number;
  lastPong: number;
  metadata: Record<string, string>;
}

export interface WsMessage {
  type: string;
  channel?: ChannelType;
  payload?: unknown;
  requestId?: string;
}

export interface ManagerStats {
  totalConnections: number;
  authenticatedConnections: number;
  channelCounts: Record<ChannelType, number>;
  uptime: number;
  messagesIn: number;
  messagesOut: number;
}

type MessageHandler = (client: ClientInfo, message: WsMessage) => void;

const HEARTBEAT_INTERVAL = 30_000;
const PONG_TIMEOUT = 10_000;
const MAX_CONNECTIONS_PER_USER = 10;
const MAX_MESSAGE_SIZE = 64 * 1024;

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientInfo>();
  private handlers = new Map<string, MessageHandler[]>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private messagesIn = 0;
  private messagesOut = 0;

  init(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      maxPayload: MAX_MESSAGE_SIZE,
    });

    this.startTime = Date.now();

    this.wss.on("connection", (ws, req) => {
      const clientId = randomUUID();
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const userId = url.searchParams.get("userId");
      const projectId = url.searchParams.get("projectId");

      if (userId && this.getConnectionCountForUser(userId) >= MAX_CONNECTIONS_PER_USER) {
        ws.close(4029, "Too many connections");
        return;
      }

      const client: ClientInfo = {
        id: clientId,
        ws,
        userId,
        projectId,
        channels: new Set(),
        connectedAt: Date.now(),
        lastPong: Date.now(),
        metadata: {},
      };

      this.clients.set(clientId, client);
      this.emit("connection", client, { type: "connection" });

      ws.on("message", (raw: RawData) => {
        this.messagesIn++;
        try {
          const message: WsMessage = JSON.parse(raw.toString());
          this.handleMessage(client, message);
        } catch {
          this.sendToClient(client, {
            type: "error",
            payload: { message: "Invalid message format" },
          });
        }
      });

      ws.on("pong", () => {
        client.lastPong = Date.now();
      });

      ws.on("close", () => {
        this.emit("disconnect", client, { type: "disconnect" });
        this.clients.delete(clientId);
      });

      ws.on("error", (err) => {
        console.error(`[ws] Client ${clientId} error:`, err.message);
        this.clients.delete(clientId);
      });

      this.sendToClient(client, {
        type: "connected",
        payload: {
          clientId,
          serverTime: Date.now(),
          heartbeatInterval: HEARTBEAT_INTERVAL,
        },
      });
    });

    this.startHeartbeat();
    console.log("[ws] WebSocket manager initialized");
  }

  private handleMessage(client: ClientInfo, message: WsMessage): void {
    switch (message.type) {
      case "subscribe":
        if (message.channel && this.isValidChannel(message.channel)) {
          client.channels.add(message.channel);
          this.sendToClient(client, {
            type: "subscribed",
            channel: message.channel,
            requestId: message.requestId,
          });
        }
        break;

      case "unsubscribe":
        if (message.channel) {
          client.channels.delete(message.channel);
          this.sendToClient(client, {
            type: "unsubscribed",
            channel: message.channel,
            requestId: message.requestId,
          });
        }
        break;

      case "ping":
        this.sendToClient(client, {
          type: "pong",
          payload: { serverTime: Date.now() },
          requestId: message.requestId,
        });
        break;

      case "auth":
        if (message.payload && typeof message.payload === "object" && "userId" in message.payload) {
          client.userId = (message.payload as { userId: string }).userId;
          this.sendToClient(client, {
            type: "authenticated",
            requestId: message.requestId,
          });
        }
        break;

      default:
        this.emit(message.type, client, message);
        break;
    }
  }

  private isValidChannel(channel: string): channel is ChannelType {
    const valid: ChannelType[] = [
      "terminal",
      "collaboration",
      "notifications",
      "deployment-logs",
      "container-status",
      "file-watcher",
    ];
    return valid.includes(channel as ChannelType);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, client] of this.clients.entries()) {
        if (now - client.lastPong > HEARTBEAT_INTERVAL + PONG_TIMEOUT) {
          console.log(`[ws] Client ${id} timed out, terminating`);
          client.ws.terminate();
          this.clients.delete(id);
          continue;
        }
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  sendToClient(client: ClientInfo, message: WsMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      this.messagesOut++;
    }
  }

  broadcast(channel: ChannelType, message: WsMessage, excludeClientId?: string): void {
    for (const client of this.clients.values()) {
      if (client.channels.has(channel) && client.id !== excludeClientId) {
        this.sendToClient(client, { ...message, channel });
      }
    }
  }

  broadcastToProject(
    projectId: string,
    channel: ChannelType,
    message: WsMessage,
    excludeClientId?: string
  ): void {
    for (const client of this.clients.values()) {
      if (
        client.projectId === projectId &&
        client.channels.has(channel) &&
        client.id !== excludeClientId
      ) {
        this.sendToClient(client, { ...message, channel });
      }
    }
  }

  broadcastToUser(userId: string, message: WsMessage): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.sendToClient(client, message);
      }
    }
  }

  on(messageType: string, handler: MessageHandler): void {
    const existing = this.handlers.get(messageType) || [];
    existing.push(handler);
    this.handlers.set(messageType, existing);
  }

  off(messageType: string, handler: MessageHandler): void {
    const existing = this.handlers.get(messageType);
    if (existing) {
      this.handlers.set(
        messageType,
        existing.filter((h) => h !== handler)
      );
    }
  }

  private emit(messageType: string, client: ClientInfo, message: WsMessage): void {
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(client, message);
        } catch (err) {
          console.error(`[ws] Handler error for ${messageType}:`, err);
        }
      }
    }
  }

  getClient(clientId: string): ClientInfo | undefined {
    return this.clients.get(clientId);
  }

  getClientsInChannel(channel: ChannelType): ClientInfo[] {
    const result: ClientInfo[] = [];
    for (const client of this.clients.values()) {
      if (client.channels.has(channel)) {
        result.push(client);
      }
    }
    return result;
  }

  getClientsForProject(projectId: string): ClientInfo[] {
    const result: ClientInfo[] = [];
    for (const client of this.clients.values()) {
      if (client.projectId === projectId) {
        result.push(client);
      }
    }
    return result;
  }

  getConnectionCountForUser(userId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) count++;
    }
    return count;
  }

  getStats(): ManagerStats {
    const channelCounts: Record<ChannelType, number> = {
      terminal: 0,
      collaboration: 0,
      notifications: 0,
      "deployment-logs": 0,
      "container-status": 0,
      "file-watcher": 0,
    };

    let authenticated = 0;
    for (const client of this.clients.values()) {
      if (client.userId) authenticated++;
      for (const channel of client.channels) {
        channelCounts[channel]++;
      }
    }

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticated,
      channelCounts,
      uptime: Date.now() - this.startTime,
      messagesIn: this.messagesIn,
      messagesOut: this.messagesOut,
    };
  }

  disconnectUser(userId: string): number {
    let count = 0;
    for (const [id, client] of this.clients.entries()) {
      if (client.userId === userId) {
        client.ws.close(4000, "Disconnected by server");
        this.clients.delete(id);
        count++;
      }
    }
    return count;
  }

  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const client of this.clients.values()) {
      client.ws.close(1001, "Server shutting down");
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log("[ws] WebSocket manager shut down");
  }
}

export const wsManager = new WebSocketManager();
