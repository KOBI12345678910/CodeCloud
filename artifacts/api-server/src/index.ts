import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs";
import { startRegionHealthMonitor } from "./services/deployment-region-routing";
import { wsManager, registerChannelHandlers, registerSharedTerminalHandlers, initSocketIO } from "./websocket";
import { initYjsWebSocket } from "./websocket/yjs-server";
import { redisCache } from "./services/redis-cache";
import { observabilityService } from "./services/observability";

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

server.listen(port, async () => {
  logger.info({ port }, "Server listening");
  startBackgroundJobs();
  startRegionHealthMonitor();
  await redisCache.connect();
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, `${signal} received, starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed, no longer accepting connections");
  });

  const drainTimeout = 30_000;
  const drainStart = Date.now();

  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - drainStart;
      if (elapsed >= drainTimeout) {
        logger.warn("Drain timeout reached, forcing shutdown");
        clearInterval(checkInterval);
        resolve();
      } else {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });

  logger.info("Stopping background jobs...");
  stopBackgroundJobs();

  logger.info("Flushing metrics...");
  void observabilityService;

  logger.info("Closing Redis connection...");
  await redisCache.disconnect();

  logger.info("Closing WebSocket connections...");
  wsManager.shutdown();

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
