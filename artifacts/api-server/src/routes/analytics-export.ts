import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/projects/:id/analytics/export", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const format = (req.query.format as string) || "json";
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString();
  const to = (req.query.to as string) || new Date().toISOString();

  const data = {
    period: { from, to },
    metrics: {
      pageViews: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], views: Math.floor(Math.random() * 1000) + 500 })),
      uniqueVisitors: Math.floor(Math.random() * 5000) + 2000,
      avgSessionDuration: Math.floor(Math.random() * 300) + 120,
      bounceRate: Math.floor(Math.random() * 30) + 20,
    },
    exportedAt: new Date().toISOString(),
    format,
  };

  if (format === "csv") {
    const csv = "date,views\n" + data.metrics.pageViews.map(p => `${p.date},${p.views}`).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
    res.send(csv);
  } else {
    res.json(data);
  }
});

export default router;
