import { Router } from "express";
const r = Router();

interface KnowledgeDoc {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category: "context" | "rules" | "api-docs" | "style-guide" | "architecture" | "custom";
  format: "markdown" | "text" | "url";
  sourceUrl: string | null;
  tokens: number;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const docs = new Map<string, KnowledgeDoc>();

r.get("/knowledge/:projectId", (req, res) => {
  const list = [...docs.values()].filter(d => d.projectId === req.params.projectId);
  const totalTokens = list.reduce((s, d) => s + d.tokens, 0);
  res.json({ documents: list, total: list.length, totalTokens, maxTokens: 100000 });
});

r.post("/knowledge/:projectId", (req, res) => {
  const { projectId } = req.params;
  const { title, content, category = "context", format = "markdown", sourceUrl, priority = 0 } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title and content required" });
  const tokens = Math.ceil(content.length / 4);
  const existing = [...docs.values()].filter(d => d.projectId === projectId);
  const totalTokens = existing.reduce((s, d) => s + d.tokens, 0);
  if (totalTokens + tokens > 100000) return res.status(400).json({ error: "token limit exceeded", current: totalTokens, adding: tokens, max: 100000 });
  const id = `kb_${Date.now()}`;
  const doc: KnowledgeDoc = {
    id, projectId, title, content, category, format, sourceUrl: sourceUrl || null,
    tokens, enabled: true, priority,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  docs.set(id, doc);
  res.status(201).json(doc);
});

r.patch("/knowledge/:projectId/:docId", (req, res) => {
  const d = docs.get(req.params.docId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  if (req.body.title) d.title = req.body.title;
  if (req.body.content) { d.content = req.body.content; d.tokens = Math.ceil(req.body.content.length / 4); }
  if (req.body.category) d.category = req.body.category;
  if (req.body.enabled !== undefined) d.enabled = req.body.enabled;
  if (req.body.priority !== undefined) d.priority = req.body.priority;
  d.updatedAt = new Date().toISOString();
  res.json(d);
});

r.delete("/knowledge/:projectId/:docId", (req, res) => {
  const d = docs.get(req.params.docId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  docs.delete(req.params.docId);
  res.json({ deleted: true });
});

r.get("/knowledge/:projectId/context", (req, res) => {
  const list = [...docs.values()]
    .filter(d => d.projectId === req.params.projectId && d.enabled)
    .sort((a, b) => b.priority - a.priority);
  const combined = list.map(d => `### ${d.title}\n${d.content}`).join("\n\n---\n\n");
  res.json({ context: combined, documents: list.length, tokens: list.reduce((s, d) => s + d.tokens, 0) });
});

r.post("/knowledge/:projectId/import-url", (req, res) => {
  const { url, title, category = "api-docs" } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  const id = `kb_${Date.now()}`;
  const content = `Imported from: ${url}\n\nContent would be fetched and indexed from the URL.`;
  const doc: KnowledgeDoc = {
    id, projectId: req.params.projectId, title: title || url,
    content, category, format: "url", sourceUrl: url,
    tokens: Math.ceil(content.length / 4), enabled: true, priority: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  docs.set(id, doc);
  res.status(201).json(doc);
});

export default r;
