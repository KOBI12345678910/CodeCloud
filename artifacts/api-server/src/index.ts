import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startBackgroundJobs } from "./jobs";
import { startRegionHealthMonitor } from "./services/deployment-region-routing";
import { wsManager, registerChannelHandlers, registerSharedTerminalHandlers, initSocketIO } from "./websocket";
import { initYjsWebSocket } from "./websocket/yjs-server";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

wsManager.init(server);
registerChannelHandlers();
registerSharedTerminalHandlers();
initSocketIO(server);
initYjsWebSocket(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  startBackgroundJobs();
  startRegionHealthMonitor();
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down...");
  wsManager.shutdown();
  server.close(() => process.exit(0));
});
