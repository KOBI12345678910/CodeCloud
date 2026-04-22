import { wsManager } from "./manager";
import type { ClientInfo, WsMessage } from "./manager";
import { fileWatcher } from "../services/file-watcher";
import type { ChangeSource } from "../services/file-watcher";

export function registerChannelHandlers(): void {
  wsManager.on("terminal:input", handleTerminalInput);
  wsManager.on("terminal:resize", handleTerminalResize);
  wsManager.on("collab:cursor", handleCollabCursor);
  wsManager.on("collab:edit", handleCollabEdit);
  wsManager.on("collab:selection", handleCollabSelection);
  wsManager.on("deployment:subscribe", handleDeploymentSubscribe);
  wsManager.on("container:subscribe", handleContainerSubscribe);
  wsManager.on("filewatcher:subscribe", handleFileWatcherSubscribe);
  wsManager.on("filewatcher:change", handleFileWatcherChange);
  wsManager.on("filewatcher:resolve-conflict", handleFileWatcherResolveConflict);

  fileWatcher.on("file:changes", (data) => {
    broadcastFileChanges(data.projectId, data.changes, data.batchId);
  });

  fileWatcher.on("file:conflict", (conflict) => {
    broadcastFileConflict(conflict.projectId, conflict);
  });

  fileWatcher.on("conflict:resolved", (conflict) => {
    wsManager.broadcastToProject(conflict.projectId, "file-watcher", {
      type: "filewatcher:conflict-resolved",
      payload: conflict,
    });
  });

  console.log("[ws] Channel handlers registered");
}

function handleTerminalInput(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId) return;

  const payload = message.payload as { data?: string } | undefined;
  if (!payload?.data) return;

  wsManager.sendToClient(client, {
    type: "terminal:output",
    channel: "terminal",
    payload: {
      data: payload.data,
      timestamp: Date.now(),
    },
  });
}

function handleTerminalResize(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId) return;

  const payload = message.payload as { cols?: number; rows?: number } | undefined;
  if (!payload?.cols || !payload?.rows) return;

  wsManager.broadcastToProject(client.projectId, "terminal", {
    type: "terminal:resized",
    payload: { cols: payload.cols, rows: payload.rows },
  }, client.id);
}

function handleCollabCursor(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    file?: string;
    line?: number;
    column?: number;
    userName?: string;
    color?: string;
  } | undefined;

  if (!payload?.file) return;

  wsManager.broadcastToProject(client.projectId, "collaboration", {
    type: "collab:cursor",
    payload: {
      userId: client.userId,
      clientId: client.id,
      file: payload.file,
      line: payload.line,
      column: payload.column,
      userName: payload.userName,
      color: payload.color,
      timestamp: Date.now(),
    },
  }, client.id);
}

function handleCollabEdit(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    file?: string;
    changes?: unknown[];
    version?: number;
  } | undefined;

  if (!payload?.file || !payload?.changes) return;

  wsManager.broadcastToProject(client.projectId, "collaboration", {
    type: "collab:edit",
    payload: {
      userId: client.userId,
      clientId: client.id,
      file: payload.file,
      changes: payload.changes,
      version: payload.version,
      timestamp: Date.now(),
    },
  }, client.id);
}

function handleCollabSelection(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    file?: string;
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
  } | undefined;

  if (!payload?.file) return;

  wsManager.broadcastToProject(client.projectId, "collaboration", {
    type: "collab:selection",
    payload: {
      userId: client.userId,
      clientId: client.id,
      ...payload,
      timestamp: Date.now(),
    },
  }, client.id);
}

function handleDeploymentSubscribe(client: ClientInfo, message: WsMessage): void {
  const payload = message.payload as { deploymentId?: string } | undefined;
  if (!payload?.deploymentId) return;

  client.metadata["deploymentId"] = payload.deploymentId;
  client.channels.add("deployment-logs");

  wsManager.sendToClient(client, {
    type: "deployment:subscribed",
    payload: { deploymentId: payload.deploymentId },
  });
}

function handleContainerSubscribe(client: ClientInfo, message: WsMessage): void {
  const payload = message.payload as { containerId?: string } | undefined;
  if (!payload?.containerId) return;

  client.metadata["containerId"] = payload.containerId;
  client.channels.add("container-status");

  wsManager.sendToClient(client, {
    type: "container:subscribed",
    payload: { containerId: payload.containerId },
  });
}

export function sendNotification(
  userId: string,
  notification: { id: string; title: string; body: string; type: string }
): void {
  wsManager.broadcastToUser(userId, {
    type: "notification",
    channel: "notifications",
    payload: notification,
  });
}

export function sendDeploymentLog(
  deploymentId: string,
  log: { level: string; message: string; timestamp: number }
): void {
  for (const client of wsManager.getClientsInChannel("deployment-logs")) {
    if (client.metadata["deploymentId"] === deploymentId) {
      wsManager.sendToClient(client, {
        type: "deployment:log",
        channel: "deployment-logs",
        payload: log,
      });
    }
  }
}

export function sendContainerUpdate(
  containerId: string,
  status: { health: string; cpuPercent: number; memoryMb: number; status: string }
): void {
  for (const client of wsManager.getClientsInChannel("container-status")) {
    if (client.metadata["containerId"] === containerId) {
      wsManager.sendToClient(client, {
        type: "container:update",
        channel: "container-status",
        payload: { containerId, ...status, timestamp: Date.now() },
      });
    }
  }
}

function handleFileWatcherSubscribe(client: ClientInfo, _message: WsMessage): void {
  if (!client.projectId) return;

  client.channels.add("file-watcher");

  const state = fileWatcher.getWatcherState(client.projectId);
  if (!state) {
    fileWatcher.startWatching(client.projectId);
  }

  wsManager.sendToClient(client, {
    type: "filewatcher:subscribed",
    payload: {
      projectId: client.projectId,
      state: fileWatcher.getWatcherState(client.projectId),
      conflicts: fileWatcher.getConflicts(client.projectId),
    },
  });
}

function handleFileWatcherChange(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    filePath?: string;
    changeType?: string;
    source?: string;
    oldPath?: string;
    content?: string;
  } | undefined;

  if (!payload?.filePath || !payload?.changeType) return;

  const contentHash = payload.content
    ? fileWatcher.computeContentHash(payload.content)
    : undefined;

  fileWatcher.reportChange({
    projectId: client.projectId,
    filePath: payload.filePath,
    changeType: payload.changeType as "created" | "modified" | "deleted" | "renamed",
    source: (payload.source as ChangeSource) || "editor",
    oldPath: payload.oldPath,
    contentHash,
    userId: client.userId,
  });
}

function handleFileWatcherResolveConflict(client: ClientInfo, message: WsMessage): void {
  if (!client.projectId || !client.userId) return;

  const payload = message.payload as {
    conflictId?: string;
    resolution?: string;
  } | undefined;

  if (!payload?.conflictId || !payload?.resolution) return;

  fileWatcher.resolveConflict(
    client.projectId,
    payload.conflictId,
    payload.resolution as "local" | "remote" | "merge" | "skip",
    client.userId
  );
}

function broadcastFileChanges(
  projectId: string,
  changes: unknown[],
  batchId: string
): void {
  wsManager.broadcastToProject(projectId, "file-watcher", {
    type: "filewatcher:changes",
    payload: { changes, batchId, timestamp: Date.now() },
  });
}

function broadcastFileConflict(projectId: string, conflict: unknown): void {
  wsManager.broadcastToProject(projectId, "file-watcher", {
    type: "filewatcher:conflict",
    payload: conflict,
  });
}

export function sendFileChange(
  projectId: string,
  change: { filePath: string; changeType: string; source: string }
): void {
  wsManager.broadcastToProject(projectId, "file-watcher", {
    type: "filewatcher:change-detected",
    payload: { ...change, timestamp: Date.now() },
  });
}
