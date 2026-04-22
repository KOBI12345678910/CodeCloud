import { Router, Request, Response } from "express";
import { aiInfraRecommendService } from "../services/ai-infra-recommend";

const router = Router();

router.post("/infra/recommend", (req: Request, res: Response): void => {
  const {
    projectId, language, framework, hasDatabase, databaseType,
    estimatedTrafficRPS, estimatedStorageGB, hasStaticAssets,
    hasCronJobs, hasWebSockets, hasFileUploads, hasMLWorkloads,
    teamSize, region,
  } = req.body;

  if (!projectId || !language) {
    res.status(400).json({ error: "projectId and language are required" });
    return;
  }

  const profile = {
    projectId,
    language: language || "javascript",
    framework: framework || "express",
    hasDatabase: hasDatabase ?? true,
    databaseType: databaseType || "postgresql",
    estimatedTrafficRPS: estimatedTrafficRPS ?? 50,
    estimatedStorageGB: estimatedStorageGB ?? 5,
    hasStaticAssets: hasStaticAssets ?? true,
    hasCronJobs: hasCronJobs ?? false,
    hasWebSockets: hasWebSockets ?? false,
    hasFileUploads: hasFileUploads ?? false,
    hasMLWorkloads: hasMLWorkloads ?? false,
    teamSize: teamSize ?? 1,
    region: region || "us-east-1",
  };

  const recommendation = aiInfraRecommendService.recommend(profile);
  res.json(recommendation);
});

router.post("/infra/recommend/quick", (req: Request, res: Response): void => {
  const { projectId, language, estimatedTrafficRPS } = req.body;
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  const profile = {
    projectId,
    language: language || "javascript",
    framework: "express",
    hasDatabase: true,
    databaseType: "postgresql",
    estimatedTrafficRPS: estimatedTrafficRPS ?? 50,
    estimatedStorageGB: 5,
    hasStaticAssets: true,
    hasCronJobs: false,
    hasWebSockets: false,
    hasFileUploads: false,
    hasMLWorkloads: false,
    teamSize: 1,
    region: "us-east-1",
  };

  const recommendation = aiInfraRecommendService.recommend(profile);
  res.json({
    compute: recommendation.compute.tier,
    database: recommendation.database.type !== "none" ? `${recommendation.database.type} (${recommendation.database.tier})` : "none",
    cache: recommendation.cache.enabled ? recommendation.cache.type : "none",
    cdn: recommendation.cdn.enabled ? recommendation.cdn.provider : "none",
    estimatedMonthlyCost: `$${recommendation.costEstimate.total.toFixed(2)}`,
    topNote: recommendation.additionalNotes[0] || null,
  });
});

router.post("/infra/recommend/compare", (req: Request, res: Response): void => {
  const { profiles } = req.body;
  if (!Array.isArray(profiles) || profiles.length < 2) {
    res.status(400).json({ error: "profiles must be an array with at least 2 entries" });
    return;
  }

  const recommendations = profiles.map((p: Record<string, unknown>) =>
    aiInfraRecommendService.recommend({
      projectId: (p.projectId as string) || "unknown",
      language: (p.language as string) || "javascript",
      framework: (p.framework as string) || "express",
      hasDatabase: (p.hasDatabase as boolean) ?? true,
      databaseType: (p.databaseType as string) || "postgresql",
      estimatedTrafficRPS: (p.estimatedTrafficRPS as number) ?? 50,
      estimatedStorageGB: (p.estimatedStorageGB as number) ?? 5,
      hasStaticAssets: (p.hasStaticAssets as boolean) ?? true,
      hasCronJobs: (p.hasCronJobs as boolean) ?? false,
      hasWebSockets: (p.hasWebSockets as boolean) ?? false,
      hasFileUploads: (p.hasFileUploads as boolean) ?? false,
      hasMLWorkloads: (p.hasMLWorkloads as boolean) ?? false,
      teamSize: (p.teamSize as number) ?? 1,
      region: (p.region as string) || "us-east-1",
    })
  );

  res.json({ recommendations });
});

export default router;
