import { Router, Request, Response } from "express";
import { runtimeInspectService } from "../services/runtime-inspect";

const router = Router();

router.get("/runtime-inspect/:containerId", (req: Request, res: Response): void => {
  res.json(runtimeInspectService.inspect(req.params.containerId as string));
});

export default router;
