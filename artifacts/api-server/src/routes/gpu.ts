import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import {
  allocateGpu,
  releaseGpu,
  getGpuStatus,
  getGpuMetrics,
  checkProPlan,
  getCudaEnvironment,
  getNvidiaRuntimeFlags,
} from "../services/gpu-container";

const router: IRouter = Router();

router.post("/projects/:id/gpu/enable", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = req.params.id as string;

  const isPro = await checkProPlan(userId);
  if (!isPro) {
    res.status(403).json({
      error: "GPU access requires a Pro plan",
      upgradeRequired: true,
      upgradeUrl: "/settings/billing",
    });
    return;
  }

  const allocation = await allocateGpu(projectId, userId);

  res.json({
    gpuEnabled: true,
    allocation: {
      id: allocation.id,
      gpuModel: allocation.gpuModel,
      status: allocation.status,
      memoryTotalMb: allocation.memoryTotalMb,
      allocatedAt: allocation.allocatedAt,
    },
    cudaEnvironment: getCudaEnvironment(),
    runtimeFlags: getNvidiaRuntimeFlags(),
  });
});

router.post("/projects/:id/gpu/disable", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;

  await releaseGpu(projectId);

  res.json({ gpuEnabled: false });
});

router.get("/projects/:id/gpu/status", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;

  const status = await getGpuStatus(projectId);

  if (!status) {
    res.json({
      gpuEnabled: false,
      allocation: null,
    });
    return;
  }

  res.json({
    gpuEnabled: true,
    allocation: {
      id: status.id,
      gpuModel: status.gpuModel,
      status: status.status,
      memoryTotalMb: status.memoryTotalMb,
      memoryUsedMb: status.memoryUsedMb,
      utilizationPercent: status.utilizationPercent,
      temperatureCelsius: status.temperatureCelsius,
      powerWatts: status.powerWatts,
      allocatedAt: status.allocatedAt,
    },
  });
});

router.get("/projects/:id/gpu/metrics", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;

  const metrics = await getGpuMetrics(projectId);

  if (!metrics) {
    res.json({
      available: false,
      metrics: null,
    });
    return;
  }

  res.json({
    available: true,
    metrics,
  });
});

export default router;
