import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { ownershipReportService } from "../services/ownership-report";

const router: IRouter = Router();

router.get("/projects/:projectId/ownership", requireAuth, async (req, res): Promise<void> => {
  const report = await ownershipReportService.generateReport(req.params.projectId as string);
  res.json(report);
});

export default router;
