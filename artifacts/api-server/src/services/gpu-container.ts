import { db, gpuUsageTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface GpuAllocation {
  id: string;
  projectId: string;
  gpuModel: string;
  status: "available" | "allocated" | "releasing" | "error";
  utilizationPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  temperatureCelsius: number;
  powerWatts: number;
  allocatedAt: Date | null;
}

export interface GpuMetrics {
  gpuModel: string;
  utilizationPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  temperatureCelsius: number;
  powerWatts: number;
  status: string;
}

const GPU_MODEL = "NVIDIA Tesla T4";
const GPU_MEMORY_TOTAL_MB = 15360;

const activeSimulations = new Map<string, ReturnType<typeof setInterval>>();

function simulateGpuMetrics(projectId: string): void {
  if (activeSimulations.has(projectId)) return;

  const interval = setInterval(async () => {
    const [existing] = await db.select()
      .from(gpuUsageTable)
      .where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "allocated")));

    if (!existing) {
      clearInterval(interval);
      activeSimulations.delete(projectId);
      return;
    }

    const utilization = Math.min(100, Math.max(5, existing.utilizationPercent + (Math.random() - 0.45) * 20));
    const memUsed = Math.min(GPU_MEMORY_TOTAL_MB, Math.max(512, existing.memoryUsedMb + Math.round((Math.random() - 0.45) * 500)));
    const temp = Math.min(95, Math.max(30, existing.temperatureCelsius + (Math.random() - 0.48) * 5));
    const power = Math.min(70, Math.max(15, existing.powerWatts + (Math.random() - 0.48) * 8));

    await db.update(gpuUsageTable).set({
      utilizationPercent: Math.round(utilization * 10) / 10,
      memoryUsedMb: memUsed,
      temperatureCelsius: Math.round(temp * 10) / 10,
      powerWatts: Math.round(power * 10) / 10,
    }).where(eq(gpuUsageTable.id, existing.id));
  }, 3000);

  activeSimulations.set(projectId, interval);
}

export async function checkProPlan(userId: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return false;
  return user.plan === "pro" || user.plan === "team";
}

export async function allocateGpu(projectId: string, userId: string): Promise<GpuAllocation> {
  const [existing] = await db.select()
    .from(gpuUsageTable)
    .where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "allocated")));

  if (existing) {
    return existing as GpuAllocation;
  }

  await db.update(projectsTable).set({ gpuEnabled: true }).where(eq(projectsTable.id, projectId));

  const [allocation] = await db.insert(gpuUsageTable).values({
    projectId,
    userId,
    gpuModel: GPU_MODEL,
    status: "allocated",
    utilizationPercent: 0,
    memoryUsedMb: 0,
    memoryTotalMb: GPU_MEMORY_TOTAL_MB,
    temperatureCelsius: 35,
    powerWatts: 20,
    allocatedAt: new Date(),
  }).returning();

  simulateGpuMetrics(projectId);

  return allocation as GpuAllocation;
}

export async function releaseGpu(projectId: string): Promise<void> {
  const interval = activeSimulations.get(projectId);
  if (interval) {
    clearInterval(interval);
    activeSimulations.delete(projectId);
  }

  await db.update(gpuUsageTable).set({
    status: "releasing",
  }).where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "allocated")));

  await db.update(projectsTable).set({ gpuEnabled: false }).where(eq(projectsTable.id, projectId));

  setTimeout(async () => {
    await db.update(gpuUsageTable).set({
      status: "available",
      releasedAt: new Date(),
      utilizationPercent: 0,
      memoryUsedMb: 0,
      temperatureCelsius: 0,
      powerWatts: 0,
    }).where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "releasing")));
  }, 2000);
}

export async function getGpuStatus(projectId: string): Promise<GpuAllocation | null> {
  const [allocation] = await db.select()
    .from(gpuUsageTable)
    .where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "allocated")));

  return allocation as GpuAllocation | null;
}

export async function getGpuMetrics(projectId: string): Promise<GpuMetrics | null> {
  const [allocation] = await db.select()
    .from(gpuUsageTable)
    .where(and(eq(gpuUsageTable.projectId, projectId), eq(gpuUsageTable.status, "allocated")));

  if (!allocation) return null;

  return {
    gpuModel: allocation.gpuModel,
    utilizationPercent: allocation.utilizationPercent,
    memoryUsedMb: allocation.memoryUsedMb,
    memoryTotalMb: allocation.memoryTotalMb,
    temperatureCelsius: allocation.temperatureCelsius,
    powerWatts: allocation.powerWatts,
    status: allocation.status,
  };
}

export function getCudaEnvironment(): Record<string, string> {
  return {
    CUDA_VERSION: "12.2",
    CUDA_HOME: "/usr/local/cuda-12.2",
    PATH: "/usr/local/cuda-12.2/bin:${PATH}",
    LD_LIBRARY_PATH: "/usr/local/cuda-12.2/lib64:${LD_LIBRARY_PATH}",
    NVIDIA_VISIBLE_DEVICES: "all",
    NVIDIA_DRIVER_CAPABILITIES: "compute,utility",
  };
}

export function getNvidiaRuntimeFlags(): string[] {
  return [
    "--runtime=nvidia",
    "--gpus=1",
    "-e", "NVIDIA_VISIBLE_DEVICES=all",
    "-e", "NVIDIA_DRIVER_CAPABILITIES=compute,utility",
    "-e", "CUDA_VERSION=12.2",
  ];
}
