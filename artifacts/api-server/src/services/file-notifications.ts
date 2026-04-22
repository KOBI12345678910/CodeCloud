export interface FileWatch {
  id: string;
  userId: string;
  filePath: string;
  addedAt: string;
}

export interface FileChangeNotification {
  id: string;
  filePath: string;
  changedBy: string;
  changeType: "modified" | "created" | "deleted" | "renamed";
  summary: string;
  timestamp: string;
  read: boolean;
  linesAdded: number;
  linesRemoved: number;
}

const watches = new Map<string, FileWatch[]>();

export function getWatchList(projectId: string, userId: string): FileWatch[] {
  const key = `${projectId}:${userId}`;
  if (!watches.has(key)) {
    watches.set(key, [
      { id: "w1", userId, filePath: "src/index.ts", addedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: "w2", userId, filePath: "src/routes/auth.ts", addedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: "w3", userId, filePath: "package.json", addedAt: new Date(Date.now() - 86400000).toISOString() },
    ]);
  }
  return watches.get(key)!;
}

export function addWatch(projectId: string, userId: string, filePath: string): FileWatch {
  const key = `${projectId}:${userId}`;
  const list = watches.get(key) || [];
  const watch: FileWatch = { id: crypto.randomUUID(), userId, filePath, addedAt: new Date().toISOString() };
  list.push(watch);
  watches.set(key, list);
  return watch;
}

export function removeWatch(projectId: string, userId: string, watchId: string): { success: boolean } {
  const key = `${projectId}:${userId}`;
  const list = watches.get(key) || [];
  watches.set(key, list.filter(w => w.id !== watchId));
  return { success: true };
}

export function getFileNotifications(projectId: string, userId: string): FileChangeNotification[] {
  return [
    { id: "n1", filePath: "src/index.ts", changedBy: "alice", changeType: "modified", summary: "Updated error handling in main entry point", timestamp: new Date(Date.now() - 1800000).toISOString(), read: false, linesAdded: 12, linesRemoved: 3 },
    { id: "n2", filePath: "package.json", changedBy: "bob", changeType: "modified", summary: "Added express@5.0.0 dependency", timestamp: new Date(Date.now() - 3600000).toISOString(), read: false, linesAdded: 1, linesRemoved: 0 },
    { id: "n3", filePath: "src/routes/auth.ts", changedBy: "carol", changeType: "modified", summary: "Fixed token refresh logic", timestamp: new Date(Date.now() - 7200000).toISOString(), read: true, linesAdded: 8, linesRemoved: 5 },
    { id: "n4", filePath: "src/index.ts", changedBy: "dave", changeType: "modified", summary: "Added graceful shutdown handler", timestamp: new Date(Date.now() - 86400000).toISOString(), read: true, linesAdded: 20, linesRemoved: 0 },
  ];
}

export function markNotificationRead(notificationId: string): { success: boolean } {
  return { success: true };
}
