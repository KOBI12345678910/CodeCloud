import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { verifyToken } from "@clerk/express";
import { db, usersTable, collaboratorsTable, projectsTable, yjsDocumentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;

interface DocEntry {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  saveTimer?: NodeJS.Timeout;
  dirty: boolean;
  loaded: boolean;
}

const docs = new Map<string, DocEntry>();
const docClients = new Map<string, Set<WebSocket>>();
const wsAwarenessIds = new WeakMap<WebSocket, Set<number>>();

const SAVE_DEBOUNCE_MS = 2000;

async function loadPersistedState(docName: string, doc: Y.Doc): Promise<void> {
  try {
    const [row] = await db
      .select({ state: yjsDocumentsTable.state })
      .from(yjsDocumentsTable)
      .where(eq(yjsDocumentsTable.docName, docName));
    if (row?.state) {
      Y.applyUpdate(doc, new Uint8Array(row.state));
      logger.info({ docName, bytes: row.state.length }, "Yjs document restored from storage");
    }
  } catch (err) {
    logger.error({ err, docName }, "Failed to load Yjs state");
  }
}

async function persistDoc(docName: string, doc: Y.Doc): Promise<void> {
  try {
    const update = Y.encodeStateAsUpdate(doc);
    const buf = Buffer.from(update);
    await db
      .insert(yjsDocumentsTable)
      .values({ docName, state: buf, bytes: buf.length, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: yjsDocumentsTable.docName,
        set: { state: buf, bytes: buf.length, updatedAt: new Date() },
      });
  } catch (err) {
    logger.error({ err, docName }, "Failed to persist Yjs state");
  }
}

function scheduleSave(docName: string): void {
  const entry = docs.get(docName);
  if (!entry) return;
  entry.dirty = true;
  if (entry.saveTimer) return;
  entry.saveTimer = setTimeout(() => {
    const e = docs.get(docName);
    if (!e) return;
    e.saveTimer = undefined;
    if (!e.dirty) return;
    e.dirty = false;
    void persistDoc(docName, e.doc);
  }, SAVE_DEBOUNCE_MS);
}

function getYDoc(docName: string): DocEntry {
  let entry = docs.get(docName);
  if (!entry) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);

    awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const msg = encoding.toUint8Array(encoder);
      const clients = docClients.get(docName);
      if (clients) {
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
          }
        });
      }
    });

    entry = { doc, awareness, dirty: false, loaded: false };
    docs.set(docName, entry);

    doc.on("update", () => scheduleSave(docName));

    void loadPersistedState(docName, doc).finally(() => {
      const e = docs.get(docName);
      if (e) e.loaded = true;
    });
  }
  return entry;
}

async function verifyDocAccess(token: string, docName: string): Promise<boolean> {
  try {
    const secretKey = process.env["CLERK_SECRET_KEY"];
    if (!secretKey) return false;
    const payload = await verifyToken(token, { secretKey });
    if (!payload?.sub) return false;

    const projectId = docName.split("/")[0];
    if (!projectId) return false;

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, payload.sub));
    if (!dbUser) return false;

    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) return false;
    if (project.ownerId === dbUser.id) return true;
    if (project.isPublic) return true;

    const [collab] = await db.select().from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, dbUser.id)));
    return !!collab;
  } catch {
    return false;
  }
}

export function initYjsWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: import("stream").Duplex, head: Buffer) => {
    const url = request.url || "";
    if (url.startsWith("/yjs/")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const reqUrl = new URL(req.url || "", `http://${req.headers.host}`);
    const docName = decodeURIComponent(reqUrl.pathname.replace(/^\/yjs\//, ""));

    if (!docName) {
      ws.close(1008, "Missing document name");
      return;
    }

    let authState: "waiting" | "verifying" | "authenticated" | "failed" = "waiting";
    const pendingMessages: Uint8Array[] = [];
    const maxPendingMessages = 100;
    const authTimeout = setTimeout(() => {
      if (authState !== "authenticated") {
        authState = "failed";
        ws.close(1008, "Authentication timeout");
      }
    }, 10000);

    ws.on("message", function authHandler(rawData: Buffer | ArrayBuffer | Buffer[]) {
      if (authState === "authenticated" || authState === "failed") return;

      let data: Uint8Array;
      if (rawData instanceof ArrayBuffer) {
        data = new Uint8Array(rawData);
      } else if (Array.isArray(rawData)) {
        data = new Uint8Array(Buffer.concat(rawData));
      } else {
        data = new Uint8Array(rawData);
      }

      try {
        const decoder = decoding.createDecoder(data);
        const msgType = decoding.readVarUint(decoder);

        if (msgType === messageAuth) {
          if (authState === "verifying") return;
          authState = "verifying";

          const token = decoding.readVarString(decoder);
          verifyDocAccess(token, docName).then((hasAccess) => {
            clearTimeout(authTimeout);
            if (!hasAccess) {
              authState = "failed";
              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, messageAuth);
              encoding.writeVarUint(encoder, 0);
              encoding.writeVarString(encoder, "Access denied");
              ws.send(encoding.toUint8Array(encoder));
              ws.close(1008, "Access denied");
              return;
            }

            authState = "authenticated";
            ws.removeListener("message", authHandler);

            const authOkEncoder = encoding.createEncoder();
            encoding.writeVarUint(authOkEncoder, messageAuth);
            encoding.writeVarUint(authOkEncoder, 1);
            ws.send(encoding.toUint8Array(authOkEncoder));

            setupDocConnection(ws, docName);

            for (const msg of pendingMessages) {
              handleDocMessage(ws, msg, docName);
            }
            pendingMessages.length = 0;
          }).catch(() => {
            authState = "failed";
            clearTimeout(authTimeout);
            ws.close(1008, "Authentication error");
          });
        } else {
          if (pendingMessages.length >= maxPendingMessages) {
            authState = "failed";
            ws.close(1008, "Too many pre-auth messages");
            return;
          }
          pendingMessages.push(data);
        }
      } catch {
        authState = "failed";
        ws.close(1008, "Invalid auth message");
      }
    });
  });

  function handleDocMessage(ws: WebSocket, data: Uint8Array, docName: string): void {
    const entry = docs.get(docName);
    if (!entry) return;
    const { doc, awareness } = entry;

    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          const responseEncoder = encoding.createEncoder();
          encoding.writeVarUint(responseEncoder, messageSync);
          syncProtocol.readSyncMessage(decoder, responseEncoder, doc, ws);
          if (encoding.length(responseEncoder) > 1) {
            ws.send(encoding.toUint8Array(responseEncoder));
          }
          break;
        }
        case messageAwareness: {
          const awarenessData = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, awarenessData, ws);
          break;
        }
      }
    } catch (err) {
      logger.error({ err, docName }, "Error processing Yjs message");
    }
  }

  function setupDocConnection(ws: WebSocket, docName: string): void {
    logger.info({ docName }, "Yjs client connected (authenticated)");

    const { doc, awareness } = getYDoc(docName);

    if (!docClients.has(docName)) {
      docClients.set(docName, new Set());
    }
    docClients.get(docName)!.add(ws);
    wsAwarenessIds.set(ws, new Set());

    const awarenessUpdateHandler = ({ added, updated }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      if (origin === ws) {
        const ids = wsAwarenessIds.get(ws);
        if (ids) {
          added.forEach((id) => ids.add(id));
          updated.forEach((id) => ids.add(id));
        }
      }
    };
    awareness.on("update", awarenessUpdateHandler);

    const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const msg = encoding.toUint8Array(encoder);
      const clients = docClients.get(docName);
      if (clients) {
        clients.forEach((client) => {
          if (client !== origin && client.readyState === WebSocket.OPEN) {
            client.send(msg);
          }
        });
      }
    };
    doc.on("update", docUpdateHandler);

    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      ws.send(encoding.toUint8Array(encoder));
    }

    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awarenessStates.keys())
        )
      );
      ws.send(encoding.toUint8Array(encoder));
    }

    ws.on("message", (rawData: Buffer | ArrayBuffer | Buffer[]) => {
      let data: Uint8Array;
      if (rawData instanceof ArrayBuffer) {
        data = new Uint8Array(rawData);
      } else if (Array.isArray(rawData)) {
        data = new Uint8Array(Buffer.concat(rawData));
      } else {
        data = new Uint8Array(rawData);
      }
      handleDocMessage(ws, data, docName);
    });

    ws.on("close", () => {
      awareness.off("update", awarenessUpdateHandler);
      doc.off("update", docUpdateHandler);
      const clients = docClients.get(docName);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          docClients.delete(docName);
          setTimeout(() => {
            if (!docClients.has(docName) || docClients.get(docName)!.size === 0) {
              const e = docs.get(docName);
              if (e?.dirty || e?.saveTimer) {
                if (e.saveTimer) clearTimeout(e.saveTimer);
                e.saveTimer = undefined;
                e.dirty = false;
                void persistDoc(docName, doc);
              }
              awareness.destroy();
              doc.destroy();
              docs.delete(docName);
              logger.info({ docName }, "Yjs document garbage collected");
            }
          }, 30000);
        }
      }
      const clientIds = wsAwarenessIds.get(ws);
      if (clientIds && clientIds.size > 0) {
        awarenessProtocol.removeAwarenessStates(awareness, Array.from(clientIds), null);
      }
    });

    ws.on("error", (err) => {
      logger.error({ err, docName }, "Yjs WebSocket error");
    });
  }

  logger.info("Yjs WebSocket server initialized on /yjs/*");
}
