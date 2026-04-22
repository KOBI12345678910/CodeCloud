import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function generateTimeSeries(days: number, base: number, variance: number) {
  const data = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const value = Math.max(0, Math.round(base + (Math.random() - 0.4) * variance));
    data.push({
      date: date.toISOString().split("T")[0],
      value,
    });
  }
  return data;
}

function generateGeo() {
  const countries = [
    { country: "United States", code: "US", visitors: 4520 },
    { country: "United Kingdom", code: "GB", visitors: 1830 },
    { country: "Germany", code: "DE", visitors: 1240 },
    { country: "India", code: "IN", visitors: 980 },
    { country: "Canada", code: "CA", visitors: 870 },
    { country: "France", code: "FR", visitors: 640 },
    { country: "Japan", code: "JP", visitors: 520 },
    { country: "Brazil", code: "BR", visitors: 480 },
    { country: "Australia", code: "AU", visitors: 390 },
    { country: "Netherlands", code: "NL", visitors: 310 },
  ];
  return countries.map((c) => ({
    ...c,
    visitors: Math.round(c.visitors * (0.7 + Math.random() * 0.6)),
  }));
}

function generateReferrers() {
  return [
    { source: "Google Search", visitors: 3200, percentage: 32 },
    { source: "Direct", visitors: 2400, percentage: 24 },
    { source: "GitHub", visitors: 1800, percentage: 18 },
    { source: "Twitter / X", visitors: 950, percentage: 9.5 },
    { source: "Stack Overflow", visitors: 680, percentage: 6.8 },
    { source: "Reddit", visitors: 420, percentage: 4.2 },
    { source: "Hacker News", visitors: 310, percentage: 3.1 },
    { source: "LinkedIn", visitors: 240, percentage: 2.4 },
  ].map((r) => ({
    ...r,
    visitors: Math.round(r.visitors * (0.8 + Math.random() * 0.4)),
  }));
}

router.get("/projects/:projectId/analytics", requireAuth, async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const views = generateTimeSeries(days, 150, 80);
  const uniqueVisitors = generateTimeSeries(days, 90, 50);
  const stars = generateTimeSeries(days, 5, 8);
  const forks = generateTimeSeries(days, 2, 4);

  const totalViews = views.reduce((s, d) => s + d.value, 0);
  const totalUnique = uniqueVisitors.reduce((s, d) => s + d.value, 0);
  const totalStars = 342 + stars.reduce((s, d) => s + d.value, 0);
  const totalForks = 87 + forks.reduce((s, d) => s + d.value, 0);

  const prevViews = Math.round(totalViews * (0.8 + Math.random() * 0.3));
  const prevUnique = Math.round(totalUnique * (0.8 + Math.random() * 0.3));

  res.json({
    summary: {
      totalViews,
      totalUniqueVisitors: totalUnique,
      totalStars,
      totalForks,
      viewsChange: Math.round(((totalViews - prevViews) / prevViews) * 100),
      visitorsChange: Math.round(((totalUnique - prevUnique) / prevUnique) * 100),
    },
    charts: {
      views: views.map((v, i) => ({
        date: v.date,
        views: v.value,
        unique: uniqueVisitors[i].value,
      })),
      stars: stars.map((s) => ({ date: s.date, stars: s.value })),
      forks: forks.map((f) => ({ date: f.date, forks: f.value })),
    },
    referrers: generateReferrers(),
    geo: generateGeo(),
  });
});

export default router;
