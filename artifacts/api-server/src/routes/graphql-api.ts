import { Router, Request, Response } from "express";
import { graphqlApiService } from "../services/graphql-api";
const router = Router();
router.post("/graphql-api", (req: Request, res: Response): void => { res.json(graphqlApiService.execute(req.body.query, req.body.variables)); });
router.get("/graphql-api/schema", (_req: Request, res: Response): void => { res.type("text/plain").send(graphqlApiService.getSchema()); });
router.get("/graphql-api/history", (req: Request, res: Response): void => { res.json(graphqlApiService.getHistory(Number(req.query.limit) || 50)); });
export default router;
