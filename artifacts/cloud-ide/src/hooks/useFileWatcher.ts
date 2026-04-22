import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export type FileChangeType = "created" | "modified" | "deleted" | "renamed";
export type ChangeSource = "filesystem" | "editor" | "git" | "upload" | "api";
export type ConflictResolution = "local" | "remote" | "merge" | "skip";

export interface FileChange {
  id: string;
  projectId: string;
  filePath: string;
  changeType: FileChangeType;
  source: ChangeSource;
  oldPath?: string;
  contentHash?: string;
  sizeBytes?: number;
  timestamp: number;
  userId?: string;
}

export interface FileConflict {
  id: string;
  projectId: string;
  filePath: string;
  localChange: FileChange;
  remoteChange: FileChange;
  detectedAt: number;
  resolved: boolean;
  resolution?: ConflictResolution;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface WatcherState {
  projectId: string;
  active: boolean;
  startedAt: number;
  lastSyncAt: number;
  totalChanges: number;
  pendingChanges: number;
  conflicts: number;
}

interface UseFileWatcherOptions {
  projectId: string;
  onFileChange?: (changes: FileChange[]) => void;
  onConflict?: (conflict: FileConflict) => void;
  onConflictResolved?: (conflict: FileConflict) => void;
  autoConnect?: boolean;
}

export function useFileWatcher({
  projectId,
  onFileChange,
  onConflict,
  onConflictResolved,
  autoConnect = true,
}: UseFileWatcherOptions) {
  const [watcherState, setWatcherState] = useState<WatcherState | null>(null);
  const [conflicts, setConflicts] = useState<FileConflict[]>([]);
  const [recentChanges, setRecentChanges] = useState<FileChange[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onFileChangeRef = useRef(onFileChange);
  const onConflictRef = useRef(onConflict);
  const onConflictResolvedRef = useRef(onConflictResolved);

  onFileChangeRef.current = onFileChange;
  onConflictRef.current = onConflict;
  onConflictResolvedRef.current = onConflictResolved;

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?projectId=${projectId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: "subscribe",
        channel: "file-watcher",
      }));
      ws.send(JSON.stringify({
        type: "filewatcher:subscribe",
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "filewatcher:subscribed":
            if (msg.payload?.state) {
              setWatcherState(msg.payload.state);
            }
            if (msg.payload?.conflicts) {
              setConflicts(msg.payload.conflicts);
            }
            break;

          case "filewatcher:changes":
            if (msg.payload?.changes) {
              const changes = msg.payload.changes as FileChange[];
              setRecentChanges((prev) => [...changes, ...prev].slice(0, 100));
              onFileChangeRef.current?.(changes);
            }
            break;

          case "filewatcher:conflict":
            if (msg.payload) {
              const conflict = msg.payload as FileConflict;
              setConflicts((prev) => [conflict, ...prev]);
              onConflictRef.current?.(conflict);
            }
            break;

          case "filewatcher:conflict-resolved":
            if (msg.payload) {
              const resolved = msg.payload as FileConflict;
              setConflicts((prev) =>
                prev.map((c) => (c.id === resolved.id ? resolved : c))
              );
              onConflictResolvedRef.current?.(resolved);
            }
            break;

          case "filewatcher:change-detected":
            if (msg.payload) {
              setRecentChanges((prev) =>
                [msg.payload as FileChange, ...prev].slice(0, 100)
              );
            }
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => connectWs(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [projectId]);

  useEffect(() => {
    if (autoConnect && projectId) {
      connectWs();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [projectId, autoConnect, connectWs]);

  const reportChange = useCallback(
    (filePath: string, changeType: FileChangeType, source: ChangeSource = "editor", content?: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "filewatcher:change",
            payload: { filePath, changeType, source, content },
          })
        );
      }
    },
    []
  );

  const resolveConflict = useCallback(
    async (conflictId: string, resolution: ConflictResolution) => {
      const res = await fetch(
        `${API_URL}/api/file-watcher/${projectId}/conflicts/${conflictId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ resolution }),
        }
      );
      if (res.ok) {
        const resolved = await res.json();
        setConflicts((prev) =>
          prev.map((c) => (c.id === resolved.id ? resolved : c))
        );
        return resolved;
      }
      return null;
    },
    [projectId]
  );

  const startWatcher = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/file-watcher/${projectId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const state = await res.json();
      setWatcherState(state);
      return state;
    }
    return null;
  }, [projectId]);

  const stopWatcher = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/file-watcher/${projectId}/stop`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setWatcherState(null);
    }
  }, [projectId]);

  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  return {
    watcherState,
    conflicts,
    unresolvedConflicts,
    recentChanges,
    connected,
    reportChange,
    resolveConflict,
    startWatcher,
    stopWatcher,
  };
}
