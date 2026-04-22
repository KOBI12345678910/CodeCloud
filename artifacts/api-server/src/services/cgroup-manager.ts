export interface CgroupConfig {
  containerId: string;
  cpu: { shares: number; quota: number; period: number };
  memory: { limit: number; softLimit: number; swapLimit: number };
  io: { readBps: number; writeBps: number; readIops: number; writeIops: number };
  pids: { max: number; current: number };
  network: { ingressBandwidth: number; egressBandwidth: number };
}

export function getCgroupConfig(projectId: string): CgroupConfig {
  return {
    containerId: "ctr-1",
    cpu: { shares: 1024, quota: 100000, period: 100000 },
    memory: { limit: 536870912, softLimit: 402653184, swapLimit: 268435456 },
    io: { readBps: 104857600, writeBps: 52428800, readIops: 1000, writeIops: 500 },
    pids: { max: 256, current: 42 },
    network: { ingressBandwidth: 104857600, egressBandwidth: 52428800 },
  };
}

export function updateCgroupConfig(projectId: string, config: Partial<CgroupConfig>): CgroupConfig {
  return { ...getCgroupConfig(projectId), ...config };
}
