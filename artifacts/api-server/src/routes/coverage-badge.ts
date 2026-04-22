import { Router, type IRouter } from "express";
import { optionalAuth } from "../middlewares/requireAuth";

interface CoverageData {
  projectId: string;
  percentage: number;
  lines: { covered: number; total: number };
  branches: { covered: number; total: number };
  functions: { covered: number; total: number };
  statements: { covered: number; total: number };
  trend: number[];
  lastRunAt: string;
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
}

const coverageStore: Record<string, CoverageData> = {
  p1: {
    projectId: "p1", percentage: 78.4,
    lines: { covered: 2840, total: 3622 }, branches: { covered: 412, total: 580 },
    functions: { covered: 310, total: 385 }, statements: { covered: 3120, total: 3980 },
    trend: [65.2, 68.1, 70.5, 72.8, 74.1, 75.9, 76.3, 78.4],
    lastRunAt: new Date(Date.now() - 1800000).toISOString(),
    testsPassed: 342, testsFailed: 8, testsTotal: 350,
  },
};

function getBadgeColor(pct: number): string {
  if (pct >= 90) return "#4c1";
  if (pct >= 80) return "#97ca00";
  if (pct >= 70) return "#a4a61d";
  if (pct >= 60) return "#dfb317";
  if (pct >= 40) return "#fe7d37";
  return "#e05d44";
}

function generateSvgBadge(label: string, value: string, color: string): string {
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
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

const router: IRouter = Router();

router.get("/projects/:projectId/coverage/badge.svg", optionalAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const data = coverageStore[projectId] || coverageStore["p1"];
  const label = (req.query.label as string) || "coverage";
  const value = `${data.percentage}%`;
  const color = getBadgeColor(data.percentage);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(generateSvgBadge(label, value, color));
});

router.get("/projects/:projectId/coverage", optionalAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const data = coverageStore[projectId] || coverageStore["p1"];
  res.json(data);
});

router.post("/projects/:projectId/coverage", optionalAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const existing = coverageStore[projectId];
  const trend = existing ? [...existing.trend.slice(-7), req.body.percentage] : [req.body.percentage];
  coverageStore[projectId] = {
    projectId, percentage: req.body.percentage ?? 0,
    lines: req.body.lines ?? { covered: 0, total: 0 },
    branches: req.body.branches ?? { covered: 0, total: 0 },
    functions: req.body.functions ?? { covered: 0, total: 0 },
    statements: req.body.statements ?? { covered: 0, total: 0 },
    trend, lastRunAt: new Date().toISOString(),
    testsPassed: req.body.testsPassed ?? 0, testsFailed: req.body.testsFailed ?? 0,
    testsTotal: req.body.testsTotal ?? 0,
  };
  res.json(coverageStore[projectId]);
});

export default router;
