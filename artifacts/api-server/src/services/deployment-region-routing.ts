import { db, deploymentRegionsTable, deploymentsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export type RegionCode = "us-east" | "eu-west" | "ap-southeast";
export type RegionHealth = "healthy" | "degraded" | "down";

export interface RegionPreset {
  code: RegionCode;
  name: string;
  location: string;
  lat: number;
  lon: number;
}

export const REGION_PRESETS: RegionPreset[] = [
  { code: "us-east", name: "US East", location: "Virginia, USA", lat: 37.5, lon: -77.5 },
  { code: "eu-west", name: "EU West", location: "Dublin, Ireland", lat: 53.3, lon: -6.3 },
  { code: "ap-southeast", name: "Asia Pacific", location: "Singapore", lat: 1.35, lon: 103.8 },
];

const COUNTRY_TO_COORDS: Record<string, { lat: number; lon: number }> = {
  US: { lat: 39.8, lon: -98.6 },
  CA: { lat: 56.1, lon: -106.3 },
  GB: { lat: 55.4, lon: -3.4 },
  DE: { lat: 51.2, lon: 10.5 },
  FR: { lat: 46.2, lon: 2.2 },
  IE: { lat: 53.4, lon: -8.2 },
  JP: { lat: 36.2, lon: 138.3 },
  CN: { lat: 35.9, lon: 104.2 },
  IN: { lat: 20.6, lon: 78.96 },
  SG: { lat: 1.35, lon: 103.8 },
  AU: { lat: -25.3, lon: 133.8 },
  BR: { lat: -14.2, lon: -51.9 },
  ZA: { lat: -30.6, lon: 22.9 },
};

// IPv4 first-octet → RIR mapping (public IANA allocation data, simplified).
// ARIN ≈ North America, RIPE ≈ Europe, APNIC ≈ Asia-Pacific,
// LACNIC ≈ South America, AfriNIC ≈ Africa.
// Source: IANA IPv4 address space registry (allocation registries).
type Rir = "ARIN" | "RIPE" | "APNIC" | "LACNIC" | "AFRINIC";
const FIRST_OCTET_RIR: Record<number, Rir> = (() => {
  const m: Record<number, Rir> = {};
  const set = (rir: Rir, ranges: Array<[number, number] | number>) => {
    for (const r of ranges) {
      if (typeof r === "number") m[r] = rir;
      else for (let i = r[0]; i <= r[1]; i++) m[i] = rir;
    }
  };
  set("APNIC",   [1, 14, 27, 36, 39, 42, 43, 49, [58, 61], [101, 126], 153, 163, 171, 175, 180, 182, 183, 202, 203, [210, 211], [218, 223]]);
  set("RIPE",    [2, 5, 31, 37, 46, 51, 62, [77, 95], 109, 141, 145, 146, 151, 176, 178, 185, 188, [193, 195], 212, 213, 217]);
  set("ARIN",    [[3, 4], 6, 7, 8, 9, [11, 13], [15, 26], [28, 30], [32, 35], 38, [40, 45], [47, 50], [52, 57], [63, 76], [96, 100], 104, 107, 108, [128, 140], [142, 144], [147, 150], 152, [155, 162], [164, 170], [172, 174], [184, 184], [192, 192], [198, 199], [204, 209], 216]);
  set("LACNIC",  [177, 179, 181, 186, 187, 189, 190, 191, 200, 201]);
  set("AFRINIC", [41, 102, 105, 154, 196, 197]);
  return m;
})();

const RIR_TO_COUNTRY: Record<Rir, string> = {
  ARIN: "US",
  RIPE: "DE",
  APNIC: "SG",
  LACNIC: "BR",
  AFRINIC: "ZA",
};

export function geolocateIp(ip: string): { country: string; lat: number; lon: number } {
  const cleaned = ip.replace(/^::ffff:/, "");
  if (cleaned === "127.0.0.1" || cleaned === "::1" || cleaned.startsWith("10.") || cleaned.startsWith("192.168.") || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleaned)) {
    return { country: "US", ...COUNTRY_TO_COORDS.US };
  }
  const parts = cleaned.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return { country: "US", ...COUNTRY_TO_COORDS.US };
  }
  const rir = FIRST_OCTET_RIR[parts[0]];
  const country = rir ? RIR_TO_COUNTRY[rir] : "US";
  return { country, ...COUNTRY_TO_COORDS[country] };
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestRegion(coords: { lat: number; lon: number }, candidates: RegionPreset[]): RegionPreset {
  let best = candidates[0];
  let bestDist = Infinity;
  for (const r of candidates) {
    const d = haversineKm(coords, { lat: r.lat, lon: r.lon });
    if (d < bestDist) { bestDist = d; best = r; }
  }
  return best;
}

export async function resolveRouteForDeployment(deploymentId: string, ip: string) {
  const regions = await db.select().from(deploymentRegionsTable)
    .where(eq(deploymentRegionsTable.deploymentId, deploymentId));

  const live = regions.filter((r) => r.status === "live" && r.health === "healthy");
  if (live.length === 0) {
    return { region: null as RegionCode | null, reason: "no_healthy_region", ip };
  }
  const presets = live
    .map((r) => REGION_PRESETS.find((p) => p.code === r.region))
    .filter((p): p is RegionPreset => !!p);
  const geo = geolocateIp(ip);
  const chosen = nearestRegion(geo, presets);
  const row = live.find((r) => r.region === chosen.code)!;
  return {
    region: chosen.code,
    regionName: chosen.name,
    endpoint: row.endpoint,
    latencyMs: row.latencyMs,
    health: row.health,
    clientCountry: geo.country,
    ip,
  };
}

export async function runHealthCheck(regionRowId: string) {
  const [row] = await db.select().from(deploymentRegionsTable).where(eq(deploymentRegionsTable.id, regionRowId));
  if (!row) return null;

  const baseLatency: Record<RegionCode, number> = {
    "us-east": 25,
    "eu-west": 60,
    "ap-southeast": 110,
  };
  const jitter = Math.floor(Math.random() * 40);
  const failureChance = Math.random();
  const latency = baseLatency[row.region as RegionCode] + jitter;

  let health: RegionHealth = "healthy";
  let consecutive = row.consecutiveFailures;

  if (failureChance < 0.05) {
    health = "down";
    consecutive += 1;
  } else if (failureChance < 0.15 || latency > 130) {
    health = "degraded";
  } else {
    consecutive = 0;
  }

  const now = new Date();
  const [updated] = await db.update(deploymentRegionsTable)
    .set({
      health,
      latencyMs: latency,
      lastHealthCheckAt: now,
      lastHealthyAt: health === "healthy" ? now : row.lastHealthyAt,
      consecutiveFailures: consecutive,
    })
    .where(eq(deploymentRegionsTable.id, regionRowId))
    .returning();
  recordLatencySample(regionRowId, { t: now.getTime(), latencyMs: latency, health });
  return updated;
}

export async function runHealthChecksForDeployment(deploymentId: string) {
  const rows = await db.select().from(deploymentRegionsTable)
    .where(eq(deploymentRegionsTable.deploymentId, deploymentId));
  const results = [];
  for (const r of rows) {
    const updated = await runHealthCheck(r.id);
    if (updated) results.push(updated);
  }
  return results;
}

interface LatencySample { t: number; latencyMs: number; health: RegionHealth; }
const LATENCY_HISTORY: Map<string, LatencySample[]> = new Map();
const HISTORY_LIMIT = 60;

export function recordLatencySample(regionRowId: string, sample: LatencySample) {
  const arr = LATENCY_HISTORY.get(regionRowId) || [];
  arr.push(sample);
  if (arr.length > HISTORY_LIMIT) arr.shift();
  LATENCY_HISTORY.set(regionRowId, arr);
}

export function getLatencyHistory(regionRowId: string): LatencySample[] {
  return LATENCY_HISTORY.get(regionRowId) || [];
}

export function summarizeLatency(samples: LatencySample[]) {
  if (samples.length === 0) return { count: 0, p50: 0, p95: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...samples].map((s) => s.latencyMs).sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    p50: pick(0.5),
    p95: pick(0.95),
    avg: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startRegionHealthMonitor(intervalMs = 60_000) {
  if (monitorInterval) return;
  monitorInterval = setInterval(async () => {
    try {
      const liveDeployments = await db.select({ id: deploymentsTable.id })
        .from(deploymentsTable)
        .where(eq(deploymentsTable.status, "live"));
      for (const d of liveDeployments) {
        await runHealthChecksForDeployment(d.id);
      }
    } catch (e) {
      console.error("[geo-routing] health monitor error", e);
    }
  }, intervalMs);
}

export function stopRegionHealthMonitor() {
  if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
}

export async function createRegionsForDeployment(
  deploymentId: string,
  regions: RegionCode[],
): Promise<void> {
  const subset = REGION_PRESETS.filter((p) => regions.includes(p.code));
  if (subset.length === 0) return;
  await db.insert(deploymentRegionsTable).values(
    subset.map((p) => ({
      deploymentId,
      region: p.code,
      status: "deploying" as const,
      health: "healthy" as const,
      latencyMs: 0,
      endpoint: `https://${p.code}.deploy.example.com/${deploymentId.slice(0, 8)}`,
    })),
  );
}

export async function markRegionsLive(deploymentId: string) {
  const now = new Date();
  await db.update(deploymentRegionsTable)
    .set({ status: "live", completedAt: now, lastHealthyAt: now, lastHealthCheckAt: now })
    .where(and(
      eq(deploymentRegionsTable.deploymentId, deploymentId),
      inArray(deploymentRegionsTable.status, ["pending", "deploying"]),
    ));
}
