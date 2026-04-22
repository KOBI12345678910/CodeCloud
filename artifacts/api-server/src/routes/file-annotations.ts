import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";

interface Annotation {
  id: string;
  projectId: string;
  filePath: string;
  line: number;
  text: string;
  author: string;
  shared: boolean;
  color: string;
  createdAt: string;
  replies: { id: string; text: string; author: string; createdAt: string }[];
}

const annotations: Annotation[] = [
  { id: "an1", projectId: "p1", filePath: "src/index.ts", line: 12, text: "This initialization logic should be extracted to a separate module", author: "alice", shared: true, color: "#f59e0b", createdAt: new Date(Date.now() - 3600000).toISOString(), replies: [
    { id: "r1", text: "Agreed, I'll create an init.ts file", author: "bob", createdAt: new Date(Date.now() - 1800000).toISOString() },
  ]},
  { id: "an2", projectId: "p1", filePath: "src/index.ts", line: 45, text: "TODO: Add error handling for edge case when config is missing", author: "bob", shared: true, color: "#ef4444", createdAt: new Date(Date.now() - 7200000).toISOString(), replies: [] },
  { id: "an3", projectId: "p1", filePath: "src/utils/helpers.ts", line: 8, text: "Consider using a more efficient algorithm here - O(n^2) is slow for large datasets", author: "carol", shared: true, color: "#3b82f6", createdAt: new Date(Date.now() - 14400000).toISOString(), replies: [
    { id: "r2", text: "Good point, we can use a hash map for O(n)", author: "alice", createdAt: new Date(Date.now() - 10800000).toISOString() },
    { id: "r3", text: "I'll benchmark both approaches", author: "carol", createdAt: new Date(Date.now() - 7200000).toISOString() },
  ]},
  { id: "an4", projectId: "p1", filePath: "src/utils/helpers.ts", line: 32, text: "Private note: need to review this later", author: "alice", shared: false, color: "#8b5cf6", createdAt: new Date(Date.now() - 28800000).toISOString(), replies: [] },
  { id: "an5", projectId: "p1", filePath: "src/components/App.tsx", line: 5, text: "This component is getting too large, let's split it", author: "bob", shared: true, color: "#f59e0b", createdAt: new Date(Date.now() - 43200000).toISOString(), replies: [] },
];

const router: IRouter = Router();

router.get("/projects/:projectId/annotations", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const filePath = req.query.file as string | undefined;
  let result = annotations.filter(a => a.projectId === projectId || a.projectId === "p1");
  if (filePath) result = result.filter(a => a.filePath === filePath);
  res.json(result);
});

router.post("/projects/:projectId/annotations", requireAuth, async (req, res): Promise<void> => {
  const { filePath, line, text, shared, color } = req.body;
  const ann: Annotation = {
    id: `an${Date.now()}`, projectId: req.params.projectId as string, filePath, line, text,
    author: (req as any).userId || "user", shared: shared ?? true, color: color || "#f59e0b",
    createdAt: new Date().toISOString(), replies: [],
  };
  annotations.push(ann);
  res.json(ann);
});

router.post("/projects/:projectId/annotations/:annId/reply", requireAuth, async (req, res): Promise<void> => {
  const ann = annotations.find(a => a.id === (req.params.annId as string));
  if (!ann) { res.status(404).json({ error: "Annotation not found" }); return; }
  const reply = { id: `r${Date.now()}`, text: req.body.text, author: (req as any).userId || "user", createdAt: new Date().toISOString() };
  ann.replies.push(reply);
  res.json(ann);
});

router.delete("/projects/:projectId/annotations/:annId", requireAuth, async (req, res): Promise<void> => {
  const idx = annotations.findIndex(a => a.id === (req.params.annId as string));
  if (idx < 0) { res.status(404).json({ error: "Not found" }); return; }
  annotations.splice(idx, 1);
  res.json({ success: true });
});

export default router;
