import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "@clerk/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

interface CollabUser {
  userId: string;
  userName: string;
  color: string;
  cursor: { line: number; column: number } | null;
}

interface UseYjsCollaborationOptions {
  projectId: string;
  fileId: string;
  userId: string;
  userName: string;
  color: string;
  enabled: boolean;
}

export function useYjsCollaboration(options: UseYjsCollaborationOptions) {
  const { session } = useSession();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<CollabUser[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!options.enabled || !options.fileId || !options.projectId || !session) return;

    let cancelled = false;

    (async () => {
      const token = await session.getToken();
      if (!token || cancelled) return;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const docName = `${options.projectId}/${options.fileId}`;
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsBase = apiUrl
        ? apiUrl.replace(/^https?:/, wsProtocol)
        : `${wsProtocol}//${window.location.host}`;
      const wsUrl = `${wsBase}/yjs`;

      const messageAuth = 2;
      function encodeAuthMessage(authToken: string): Uint8Array {
        const tokenBytes = new TextEncoder().encode(authToken);
        const buf: number[] = [];
        let v = messageAuth;
        while (v > 0x7f) { buf.push(0x80 | (v & 0x7f)); v >>>= 7; }
        buf.push(v & 0x7f);
        v = tokenBytes.length;
        while (v > 0x7f) { buf.push(0x80 | (v & 0x7f)); v >>>= 7; }
        buf.push(v & 0x7f);
        const result = new Uint8Array(buf.length + tokenBytes.length);
        result.set(buf, 0);
        result.set(tokenBytes, buf.length);
        return result;
      }
      const AuthWebSocket = class extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          this.addEventListener("open", () => {
            this.send(encodeAuthMessage(token!));
          }, { once: true });
        }
      };

      const provider = new WebsocketProvider(wsUrl, docName, ydoc, {
        connect: true,
        maxBackoffTime: 10000,
        WebSocketPolyfill: AuthWebSocket as unknown as typeof WebSocket,
      });
      providerRef.current = provider;

      provider.awareness.setLocalStateField("user", {
        name: options.userName,
        color: options.color,
        userId: options.userId,
      });

      provider.awareness.on("change", () => {
        const states = provider.awareness.getStates();
        const users: CollabUser[] = [];
        states.forEach((state, clientId) => {
          if (clientId === ydoc.clientID) return;
          const u = state.user;
          if (u) {
            users.push({
              userId: u.userId || String(clientId),
              userName: u.name || "Anonymous",
              color: u.color || "#999",
              cursor: state.cursor || null,
            });
          }
        });
        setRemoteUsers(users);
      });

      provider.on("sync", (isSynced: boolean) => {
        setSynced(isSynced);
      });

      setIsInitialized(true);
    })();

    return () => {
      cancelled = true;
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      setIsInitialized(false);
      setSynced(false);
    };
  }, [options.projectId, options.fileId, options.enabled, options.userId, options.userName, options.color, session]);

  const bindToMonaco = useCallback((editor: import("monaco-editor").editor.IStandaloneCodeEditor, model: import("monaco-editor").editor.ITextModel) => {
    if (!ydocRef.current) return;

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }
    if (undoManagerRef.current) {
      undoManagerRef.current.destroy();
      undoManagerRef.current = null;
    }

    const ytext = ydocRef.current.getText(`file:${options.fileId}`);
    const awareness = providerRef.current?.awareness;

    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      awareness || undefined
    );
    bindingRef.current = binding;

    const undoManager = new Y.UndoManager(ytext, {
      trackedOrigins: new Set([ydocRef.current.clientID, null]),
      captureTimeout: 500,
    });
    undoManagerRef.current = undoManager;

    editor.addAction({
      id: "yjs-undo",
      label: "Undo (Collaborative)",
      keybindings: [2048 | 56],
      run: () => { undoManager.undo(); },
    });
    editor.addAction({
      id: "yjs-redo",
      label: "Redo (Collaborative)",
      keybindings: [2048 | 1024 | 56],
      run: () => { undoManager.redo(); },
    });
  }, [options.fileId]);

  const unbindMonaco = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.destroy();
      undoManagerRef.current = null;
    }
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
  }, []);

  const undo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  const applyRemoteUpdate = useCallback((update: Uint8Array) => {
    if (ydocRef.current) {
      Y.applyUpdate(ydocRef.current, update, "remote");
    }
  }, []);

  const getText = useCallback((): string => {
    if (!ydocRef.current) return "";
    return ydocRef.current.getText(`file:${options.fileId}`).toString();
  }, [options.fileId]);

  const setText = useCallback((content: string) => {
    if (!ydocRef.current) return;
    const ytext = ydocRef.current.getText(`file:${options.fileId}`);
    ydocRef.current.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, content);
    }, options.userId);
  }, [options.fileId, options.userId]);

  return {
    ydoc: ydocRef.current,
    isInitialized,
    synced,
    remoteUsers,
    applyRemoteUpdate,
    bindToMonaco,
    unbindMonaco,
    getText,
    setText,
    undo,
    redo,
  };
}
