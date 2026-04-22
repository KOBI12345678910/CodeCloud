import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function healthPayload() {
  return {
    status: "ok" as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, ...healthPayload() });
});

router.get("/health", (_req, res) => {
  res.json(healthPayload());
});

export default router;
