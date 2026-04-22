import { Router, Request, Response } from "express";
import { db, projectsTable, starsTable, deploymentsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router = Router();

const BADGE_COLORS: Record<string, string> = {
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  gray: "#6b7280",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#06b6d4",
};

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: "#f7df1e",
  typescript: "#3178c6",
  python: "#3572a5",
  go: "#00add8",
  rust: "#dea584",
  ruby: "#cc342d",
  java: "#b07219",
  php: "#4f5d95",
  html: "#e34c26",
  css: "#563d7c",
  "c++": "#f34b7d",
  c: "#555555",
  swift: "#fa7343",
  kotlin: "#a97bff",
};

function generateSvgBadge(label: string, value: string, color: string): string {
  const labelWidth = Math.max(label.length * 6.5 + 12, 30);
  const valueWidth = Math.max(value.length * 6.5 + 12, 30);
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

router.get("/badges/:projectId/build", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.type("image/svg+xml").send(generateSvgBadge("build", "unknown", BADGE_COLORS.gray));
    return;
  }
  const status = project.containerStatus === "running" ? "passing" : project.containerStatus === "error" ? "failing" : "idle";
  const color = status === "passing" ? BADGE_COLORS.green : status === "failing" ? BADGE_COLORS.red : BADGE_COLORS.gray;
  res.type("image/svg+xml").set("Cache-Control", "no-cache, no-store, must-revalidate").send(generateSvgBadge("build", status, color));
});

router.get("/badges/:projectId/deploy", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(1);
  let status = "none";
  let color = BADGE_COLORS.gray;
  if (deployment) {
    status = deployment.status;
    color = status === "live" ? BADGE_COLORS.green : status === "building" ? BADGE_COLORS.yellow : status === "failed" ? BADGE_COLORS.red : BADGE_COLORS.gray;
  }
  res.type("image/svg+xml").set("Cache-Control", "no-cache, no-store, must-revalidate").send(generateSvgBadge("deploy", status, color));
});

router.get("/badges/:projectId/language", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.type("image/svg+xml").send(generateSvgBadge("language", "unknown", BADGE_COLORS.gray));
    return;
  }
  const lang = project.language.toLowerCase();
  const color = LANGUAGE_COLORS[lang] || BADGE_COLORS.blue;
  res.type("image/svg+xml").set("Cache-Control", "max-age=3600").send(generateSvgBadge("language", project.language, color));
});

router.get("/badges/:projectId/stars", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const [result] = await db.select({ count: count() }).from(starsTable).where(eq(starsTable.projectId, projectId));
  const starCount = result?.count || 0;
  const display = starCount >= 1000 ? `${(starCount / 1000).toFixed(1)}k` : String(starCount);
  res.type("image/svg+xml").set("Cache-Control", "no-cache, no-store, must-revalidate").send(generateSvgBadge("stars", display, BADGE_COLORS.yellow));
});

router.get("/badges/:projectId/license", async (req: Request, res: Response): Promise<void> => {
  const license = (req.query["license"] as string) || "MIT";
  res.type("image/svg+xml").set("Cache-Control", "max-age=86400").send(generateSvgBadge("license", license, BADGE_COLORS.blue));
});

router.get("/badges/:projectId/all", async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const baseUrl = `${req.protocol}://${req.get("host")}/api/badges/${projectId}`;
  res.json({
    build: { svg: `${baseUrl}/build`, markdown: `![Build Status](${baseUrl}/build)`, html: `<img src="${baseUrl}/build" alt="Build Status" />` },
    deploy: { svg: `${baseUrl}/deploy`, markdown: `![Deploy Status](${baseUrl}/deploy)`, html: `<img src="${baseUrl}/deploy" alt="Deploy Status" />` },
    language: { svg: `${baseUrl}/language`, markdown: `![Language](${baseUrl}/language)`, html: `<img src="${baseUrl}/language" alt="Language" />` },
    stars: { svg: `${baseUrl}/stars`, markdown: `![Stars](${baseUrl}/stars)`, html: `<img src="${baseUrl}/stars" alt="Stars" />` },
    license: { svg: `${baseUrl}/license`, markdown: `![License](${baseUrl}/license)`, html: `<img src="${baseUrl}/license" alt="License" />` },
  });
});

export default router;
