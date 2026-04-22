import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

interface Snippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
  isPublic: boolean;
  starred: boolean;
  starCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

const snippets: Snippet[] = [
  {
    id: "snp-1", title: "Express Error Handler", description: "Global error handling middleware for Express.js", language: "typescript",
    code: `import { Request, Response, NextFunction } from "express";\n\nexport function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {\n  console.error(err.stack);\n  res.status(500).json({ error: err.message });\n}`,
    tags: ["express", "middleware", "error-handling"], isPublic: true, starred: false, starCount: 24, authorId: "u1", authorName: "alice", createdAt: "2025-03-10T10:00:00Z", updatedAt: "2025-03-10T10:00:00Z",
  },
  {
    id: "snp-2", title: "React useDebounce Hook", description: "Custom hook for debouncing values in React", language: "typescript",
    code: `import { useState, useEffect } from "react";\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}`,
    tags: ["react", "hooks", "debounce"], isPublic: true, starred: true, starCount: 58, authorId: "u1", authorName: "alice", createdAt: "2025-02-15T14:00:00Z", updatedAt: "2025-02-15T14:00:00Z",
  },
  {
    id: "snp-3", title: "Python FastAPI CRUD", description: "Basic CRUD endpoints with FastAPI and Pydantic", language: "python",
    code: `from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI()\nitems = {}\n\nclass Item(BaseModel):\n    name: str\n    price: float\n\n@app.post("/items/{item_id}")\ndef create_item(item_id: int, item: Item):\n    items[item_id] = item\n    return item\n\n@app.get("/items/{item_id}")\ndef read_item(item_id: int):\n    if item_id not in items:\n        raise HTTPException(status_code=404)\n    return items[item_id]`,
    tags: ["python", "fastapi", "crud", "api"], isPublic: true, starred: false, starCount: 31, authorId: "u2", authorName: "bob", createdAt: "2025-01-20T09:00:00Z", updatedAt: "2025-01-20T09:00:00Z",
  },
  {
    id: "snp-4", title: "Go HTTP Server", description: "Simple HTTP server with routing in Go", language: "go",
    code: `package main\n\nimport (\n\t"fmt"\n\t"log"\n\t"net/http"\n)\n\nfunc main() {\n\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {\n\t\tfmt.Fprintf(w, "Hello, World!")\n\t})\n\tlog.Fatal(http.ListenAndServe(":8080", nil))\n}`,
    tags: ["go", "http", "server"], isPublic: true, starred: false, starCount: 15, authorId: "u3", authorName: "carol", createdAt: "2025-04-01T16:00:00Z", updatedAt: "2025-04-01T16:00:00Z",
  },
  {
    id: "snp-5", title: "SQL Pagination Query", description: "Cursor-based pagination pattern for PostgreSQL", language: "sql",
    code: `SELECT id, name, created_at\nFROM users\nWHERE created_at < :cursor\nORDER BY created_at DESC\nLIMIT :page_size;`,
    tags: ["sql", "postgres", "pagination"], isPublic: true, starred: true, starCount: 42, authorId: "u1", authorName: "alice", createdAt: "2025-03-25T11:00:00Z", updatedAt: "2025-03-25T11:00:00Z",
  },
  {
    id: "snp-6", title: "CSS Grid Layout", description: "Responsive grid layout with auto-fill", language: "css",
    code: `.grid-container {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 1.5rem;\n  padding: 1rem;\n}`,
    tags: ["css", "grid", "responsive"], isPublic: true, starred: false, starCount: 19, authorId: "u2", authorName: "bob", createdAt: "2025-02-28T08:30:00Z", updatedAt: "2025-02-28T08:30:00Z",
  },
];

router.get("/snippets", async (req, res): Promise<void> => {
  const { search, language, tag, starred, mine } = req.query;
  let result = [...snippets];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((s) =>
      s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q))
    );
  }
  if (language) result = result.filter((s) => s.language === language);
  if (tag) result = result.filter((s) => s.tags.includes(String(tag)));
  if (starred === "true") result = result.filter((s) => s.starred);
  if (mine === "true") {
    const userId = (req as any).user?.id || "u1";
    result = result.filter((s) => s.authorId === userId);
  }

  res.json(result);
});

router.get("/snippets/:id", async (req, res): Promise<void> => {
  const snippet = snippets.find((s) => s.id === String(req.params.id));
  if (!snippet) { res.status(404).json({ error: "Snippet not found" }); return; }
  res.json(snippet);
});

router.post("/snippets", requireAuth, async (req, res): Promise<void> => {
  const { title, description, language, code, tags, isPublic } = req.body;
  if (!title?.trim() || !code?.trim()) {
    res.status(400).json({ error: "title and code are required" }); return;
  }
  const newSnippet: Snippet = {
    id: `snp-${Date.now()}`, title: title.trim(), description: description || "",
    language: language || "plaintext", code, tags: tags || [], isPublic: isPublic ?? true,
    starred: false, starCount: 0, authorId: (req as any).user?.id || "u1",
    authorName: (req as any).user?.username || "user",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  snippets.unshift(newSnippet);
  res.status(201).json(newSnippet);
});

router.put("/snippets/:id", requireAuth, async (req, res): Promise<void> => {
  const idx = snippets.findIndex((s) => s.id === String(req.params.id));
  if (idx === -1) { res.status(404).json({ error: "Snippet not found" }); return; }
  const { title, description, language, code, tags, isPublic } = req.body;
  if (title !== undefined) snippets[idx].title = title;
  if (description !== undefined) snippets[idx].description = description;
  if (language !== undefined) snippets[idx].language = language;
  if (code !== undefined) snippets[idx].code = code;
  if (tags !== undefined) snippets[idx].tags = tags;
  if (isPublic !== undefined) snippets[idx].isPublic = isPublic;
  snippets[idx].updatedAt = new Date().toISOString();
  res.json(snippets[idx]);
});

router.delete("/snippets/:id", requireAuth, async (req, res): Promise<void> => {
  const idx = snippets.findIndex((s) => s.id === String(req.params.id));
  if (idx === -1) { res.status(404).json({ error: "Snippet not found" }); return; }
  snippets.splice(idx, 1);
  res.json({ ok: true });
});

router.post("/snippets/:id/star", requireAuth, async (req, res): Promise<void> => {
  const snippet = snippets.find((s) => s.id === String(req.params.id));
  if (!snippet) { res.status(404).json({ error: "Snippet not found" }); return; }
  snippet.starred = !snippet.starred;
  snippet.starCount += snippet.starred ? 1 : -1;
  res.json({ starred: snippet.starred, starCount: snippet.starCount });
});

export default router;
