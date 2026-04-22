import { Router, type IRouter } from "express";
import {
  db,
  aiConversationsTable,
  aiRequestsTable,
  projectsTable,
  collaboratorsTable,
  filesTable,
} from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  team: 2000,
};

const SYSTEM_PROMPTS = {
  chat: `You are an expert AI coding assistant embedded in a cloud IDE. You help developers write, debug, refactor, and understand code. You have access to the project context (language, file tree, active file, recent errors). Provide concise, accurate answers. When you suggest code, wrap it in fenced code blocks with the language tag. Prefer clear, idiomatic solutions.`,
  generate: `You are an expert code generator. Given a description and context, produce production-quality code. Output ONLY a fenced code block with the requested language tag, followed by a brief one-paragraph explanation. Do not include placeholder TODOs unless explicitly requested.`,
  debug: `You are an expert debugger. Given an error message and code context, diagnose the root cause and propose a concrete fix. Respond with: (1) "Root cause:" one paragraph, (2) "Fix:" a fenced code block showing the corrected code, (3) "Why:" a short explanation of why the fix works.`,
  explain: `You are an expert code explainer. Given a snippet of code, explain what it does in plain English. Walk through it step by step. Highlight non-obvious behaviour, side effects, and complexity.`,
  refactor: `You are an expert refactorer. Given code and instructions, return improved code that preserves behaviour. Output ONLY a fenced code block with the language tag, followed by a short bullet list of the changes you made.`,
  review: `You are a senior code reviewer. Review the provided code (or set of files) and produce a structured review with sections: Summary, Strengths, Issues (with severity: critical/high/medium/low), and Suggestions. Be specific and actionable. Reference line numbers or function names where possible.`,
  architecture: `You are a senior software architect. Given a project description, produce a complete architecture plan. Respond ONLY with a single JSON object (no prose, no fences) matching this shape:
{
  "name": string,
  "summary": string,
  "techStack": { "frontend": string[], "backend": string[], "database": string[], "infrastructure": string[] },
  "dbSchema": [{ "table": string, "columns": [{ "name": string, "type": string, "notes": string }] }],
  "apiRoutes": [{ "method": string, "path": string, "purpose": string }],
  "fileStructure": [{ "path": string, "purpose": string }],
  "components": [{ "name": string, "responsibility": string }],
  "phases": [{ "name": string, "tasks": string[], "estimateHours": number }]
}`,
  test: `You are a test generation expert. Given a source file, generate a complete, runnable test file using the conventional testing framework for the language (Vitest/Jest for TS/JS, pytest for Python, Go's testing package for Go, etc.). Output ONLY a fenced code block with the language tag containing the full test file. Cover happy paths, edge cases, and error conditions.`,
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TokenCount {
  input: number;
  output: number;
}

async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return false;
  if (project.ownerId === userId || project.isPublic) return true;
  const [collab] = await db
    .select()
    .from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)));
  return !!collab;
}

async function checkProjectWriteAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const [collab] = await db
    .select()
    .from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)));
  if (!collab) return false;
  const role = (collab as { role?: string }).role ?? "viewer";
  return role === "owner" || role === "editor" || role === "admin";
}

async function checkRateLimit(userId: string, plan: string): Promise<{ ok: boolean; used: number; limit: number }> {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiRequestsTable)
    .where(and(eq(aiRequestsTable.userId, userId), gte(aiRequestsTable.createdAt, since)));
  const used = row?.count ?? 0;
  return { ok: used < limit, used, limit };
}

async function recordRequest(userId: string, endpoint: string, usage: TokenCount): Promise<void> {
  await db.insert(aiRequestsTable).values({
    userId,
    endpoint,
    inputTokens: usage.input,
    outputTokens: usage.output,
  });
}

async function gatherProjectContext(projectId: string, activeFilePath?: string): Promise<string> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return "";

  const files = await db
    .select({ path: filesTable.path, isDirectory: filesTable.isDirectory, content: filesTable.content })
    .from(filesTable)
    .where(eq(filesTable.projectId, projectId))
    .limit(200);

  const tree = files
    .map((f) => `${f.isDirectory ? "[D]" : "   "} ${f.path}`)
    .sort()
    .join("\n");

  let activeFileBlock = "";
  if (activeFilePath) {
    const active = files.find((f) => f.path === activeFilePath && !f.isDirectory);
    if (active && active.content) {
      const truncated = active.content.length > 8000 ? active.content.slice(0, 8000) + "\n... [truncated]" : active.content;
      activeFileBlock = `\n\n## Active file: ${activeFilePath}\n\`\`\`\n${truncated}\n\`\`\``;
    }
  }

  return `## Project: ${project.name} (${project.language})\n\n## File tree\n${tree}${activeFileBlock}`;
}

async function callAnthropic(systemPrompt: string, userContent: string, history: ChatMessage[] = []): Promise<{ text: string; usage: TokenCount }> {
  const messages = [...history, { role: "user" as const, content: userContent }];
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
  const block = message.content[0];
  const text = block && block.type === "text" ? block.text : "";
  return {
    text,
    usage: {
      input: message.usage?.input_tokens ?? 0,
      output: message.usage?.output_tokens ?? 0,
    },
  };
}

router.get("/ai/conversations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = req.query.projectId as string | undefined;
  const conditions = [eq(aiConversationsTable.userId, userId)];
  if (projectId) conditions.push(eq(aiConversationsTable.projectId, projectId));
  const conversations = await db
    .select()
    .from(aiConversationsTable)
    .where(and(...conditions))
    .orderBy(desc(aiConversationsTable.updatedAt))
    .limit(50);
  res.json(conversations);
});

router.get("/ai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const convId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [conv] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, convId), eq(aiConversationsTable.userId, userId)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conv);
});

router.post("/ai/conversations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, title } = req.body ?? {};
  if (projectId && !(await checkProjectAccess(projectId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const [conversation] = await db
    .insert(aiConversationsTable)
    .values({ userId, projectId: projectId || null, title: title || "New Chat", messages: [] })
    .returning();
  res.status(201).json(conversation);
});

router.delete("/ai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const convId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db
    .delete(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, convId), eq(aiConversationsTable.userId, userId)));
  res.sendStatus(204);
});

async function persistTurn(
  convId: string | null,
  userId: string,
  projectId: string | null,
  userText: string,
  assistantText: string,
  usage: TokenCount,
  titleFallback: string,
  endpoint: string,
): Promise<string> {
  await recordRequest(userId, endpoint, usage);
  if (convId) {
    const [conv] = await db
      .select()
      .from(aiConversationsTable)
      .where(and(eq(aiConversationsTable.id, convId), eq(aiConversationsTable.userId, userId)));
    if (conv) {
      const messages = ((conv.messages as ChatMessage[]) || []).slice();
      messages.push({ role: "user", content: userText });
      messages.push({ role: "assistant", content: assistantText });
      const prev = (conv.tokenCount as TokenCount) || { input: 0, output: 0 };
      await db
        .update(aiConversationsTable)
        .set({
          messages,
          tokenCount: { input: prev.input + usage.input, output: prev.output + usage.output },
        })
        .where(eq(aiConversationsTable.id, convId));
      return convId;
    }
  }
  const [created] = await db
    .insert(aiConversationsTable)
    .values({
      userId,
      projectId,
      title: titleFallback.slice(0, 80),
      messages: [
        { role: "user", content: userText },
        { role: "assistant", content: assistantText },
      ],
      tokenCount: usage,
    })
    .returning();
  return created.id;
}

async function runEndpoint(
  req: AuthenticatedRequest,
  res: import("express").Response,
  endpoint: string,
  systemPrompt: string,
  buildPrompt: (body: Record<string, unknown>, ctx: string) => string,
  buildUserDisplay: (body: Record<string, unknown>) => string,
  options: { useHistory?: boolean; titlePrefix: string },
): Promise<void> {
  const { userId, user } = req;
  const limit = await checkRateLimit(userId, user.plan);
  if (!limit.ok) {
    res.status(429).json({
      error: "Daily AI request limit reached",
      used: limit.used,
      limit: limit.limit,
      plan: user.plan,
    });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const projectId = (body.projectId as string | undefined) ?? null;
  const conversationId = (body.conversationId as string | undefined) ?? null;
  const activeFilePath = body.activeFilePath as string | undefined;

  if (projectId && !(await checkProjectAccess(projectId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const ctx = projectId ? await gatherProjectContext(projectId, activeFilePath) : "";
  const userPrompt = buildPrompt(body, ctx);

  let history: ChatMessage[] = [];
  if (options.useHistory && conversationId) {
    const [conv] = await db
      .select()
      .from(aiConversationsTable)
      .where(and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.userId, userId)));
    if (conv) history = ((conv.messages as ChatMessage[]) || []).slice(-10);
  }

  try {
    const { text, usage } = await callAnthropic(systemPrompt, userPrompt, history);
    const userDisplay = buildUserDisplay(body);
    const titleFallback = `${options.titlePrefix}: ${userDisplay.slice(0, 60)}`;
    const convId = await persistTurn(conversationId, userId, projectId, userDisplay, text, usage, titleFallback, endpoint);
    res.json({ content: text, conversationId: convId, usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[ai] anthropic error:", msg);
    res.status(502).json({ error: "AI provider error", details: msg });
  }
}

router.post("/ai/chat", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "chat",
    SYSTEM_PROMPTS.chat,
    (body, ctx) => {
      const message = String(body.message ?? "");
      const errors = body.errors ? `\n\n## Recent terminal errors\n\`\`\`\n${String(body.errors).slice(0, 4000)}\n\`\`\`` : "";
      return ctx ? `${ctx}${errors}\n\n## User message\n${message}` : message;
    },
    (body) => String(body.message ?? ""),
    { useHistory: true, titlePrefix: "Chat" },
  );
});

router.post("/ai/generate", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "generate",
    SYSTEM_PROMPTS.generate,
    (body, ctx) => {
      const description = String(body.description ?? body.prompt ?? "");
      const language = String(body.language ?? "typescript");
      const target = body.targetPath ? `\nTarget file: ${body.targetPath}` : "";
      return `${ctx}\n\nLanguage: ${language}${target}\n\n## Generate\n${description}`;
    },
    (body) => String(body.description ?? body.prompt ?? ""),
    { titlePrefix: "Generate" },
  );
});

router.post("/ai/debug", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "debug",
    SYSTEM_PROMPTS.debug,
    (body, ctx) => {
      const error = String(body.error ?? "");
      const code = String(body.code ?? "");
      return `${ctx}\n\n## Error\n\`\`\`\n${error}\n\`\`\`\n\n## Code\n\`\`\`\n${code}\n\`\`\``;
    },
    (body) => `Debug error: ${String(body.error ?? "").slice(0, 120)}`,
    { titlePrefix: "Debug" },
  );
});

router.post("/ai/explain", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "explain",
    SYSTEM_PROMPTS.explain,
    (body) => {
      const code = String(body.code ?? "");
      const language = String(body.language ?? "typescript");
      return `Language: ${language}\n\n\`\`\`${language}\n${code}\n\`\`\``;
    },
    () => `Explain selected code`,
    { titlePrefix: "Explain" },
  );
});

router.post("/ai/refactor", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "refactor",
    SYSTEM_PROMPTS.refactor,
    (body) => {
      const code = String(body.code ?? "");
      const language = String(body.language ?? "typescript");
      const instructions = String(body.instructions ?? "Improve readability and performance.");
      return `Language: ${language}\nInstructions: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\``;
    },
    (body) => `Refactor: ${String(body.instructions ?? "improve").slice(0, 120)}`,
    { titlePrefix: "Refactor" },
  );
});

router.post("/ai/review", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "review",
    SYSTEM_PROMPTS.review,
    (body, ctx) => {
      const code = body.code ? String(body.code) : "";
      const scope = body.scope === "project" ? "Review the entire project context above." : "";
      const language = String(body.language ?? "typescript");
      const codeBlock = code ? `\n\n\`\`\`${language}\n${code}\n\`\`\`` : "";
      return `${ctx}\n\n${scope}${codeBlock}`;
    },
    (body) => `Review ${body.scope === "project" ? "project" : "active file"}`,
    { titlePrefix: "Review" },
  );
});

router.post("/ai/architecture", requireAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;
  const limit = await checkRateLimit(userId, user.plan);
  if (!limit.ok) {
    res.status(429).json({ error: "Daily AI request limit reached", used: limit.used, limit: limit.limit, plan: user.plan });
    return;
  }

  const description = String(req.body?.description ?? "");
  const projectId = (req.body?.projectId as string | undefined) ?? null;
  const autoScaffold = !!req.body?.autoScaffold;

  if (projectId && !(await checkProjectAccess(projectId, userId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (autoScaffold) {
    if (!projectId) {
      res.status(400).json({ error: "autoScaffold requires projectId" });
      return;
    }
    if (!(await checkProjectWriteAccess(projectId, userId))) {
      res.status(403).json({ error: "Write access required to scaffold files" });
      return;
    }
  }
  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  try {
    const { text, usage } = await callAnthropic(SYSTEM_PROMPTS.architecture, description);
    let plan: Record<string, unknown>;
    try {
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      plan = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: "AI returned invalid JSON", raw: text });
      return;
    }

    let scaffolded: string[] = [];
    if (autoScaffold && projectId && Array.isArray(plan.fileStructure)) {
      const dirs = new Set<string>();
      for (const entry of plan.fileStructure as Array<{ path: string; purpose: string }>) {
        if (!entry.path) continue;
        const parts = entry.path.split("/");
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join("/"));
        }
      }
      for (const dirPath of dirs) {
        const name = dirPath.split("/").pop() || dirPath;
        await db.insert(filesTable).values({
          projectId,
          path: dirPath,
          name,
          isDirectory: true,
          sizeBytes: 0,
        }).onConflictDoNothing();
      }
      for (const entry of plan.fileStructure as Array<{ path: string; purpose: string }>) {
        if (!entry.path) continue;
        const name = entry.path.split("/").pop() || entry.path;
        const content = `// ${entry.purpose ?? ""}\n`;
        const result = await db.insert(filesTable).values({
          projectId,
          path: entry.path,
          name,
          isDirectory: false,
          content,
          sizeBytes: content.length,
        }).onConflictDoNothing().returning({ id: filesTable.id });
        if (result.length) scaffolded.push(entry.path);
      }
    }

    const titleFallback = `Architecture: ${description.slice(0, 60)}`;
    const convId = await persistTurn(null, userId, projectId, description, JSON.stringify(plan), usage, titleFallback, "architecture");
    res.json({ plan, conversationId: convId, usage, scaffolded });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[ai] architecture error:", msg);
    res.status(502).json({ error: "AI provider error", details: msg });
  }
});

router.post("/ai/test", requireAuth, async (req, res): Promise<void> => {
  await runEndpoint(
    req as AuthenticatedRequest,
    res,
    "test",
    SYSTEM_PROMPTS.test,
    (body) => {
      const code = String(body.code ?? "");
      const language = String(body.language ?? "typescript");
      const filename = body.filename ? String(body.filename) : "source";
      return `Language: ${language}\nSource file: ${filename}\n\n\`\`\`${language}\n${code}\n\`\`\``;
    },
    (body) => `Generate tests for ${String(body.filename ?? "source")}`,
    { titlePrefix: "Tests" },
  );
});

router.get("/ai/usage", requireAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;
  const limit = await checkRateLimit(userId, user.plan);
  res.json({ plan: user.plan, used: limit.used, limit: limit.limit, remaining: Math.max(0, limit.limit - limit.used) });
});

// Backwards-compatible message append endpoint that uses the chat AI.
router.post("/ai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;
  const limit = await checkRateLimit(userId, user.plan);
  if (!limit.ok) {
    res.status(429).json({ error: "Daily AI request limit reached", used: limit.used, limit: limit.limit, plan: user.plan });
    return;
  }
  const convId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const content = String(req.body?.content ?? "");
  const context = req.body?.context ? String(req.body.context) : "";

  const [conv] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, convId), eq(aiConversationsTable.userId, userId)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const history = ((conv.messages as ChatMessage[]) || []).slice(-10);
  let projectCtx = "";
  if (conv.projectId) projectCtx = await gatherProjectContext(conv.projectId);
  const userPrompt = `${projectCtx}${context ? `\n\n## Context\n${context}` : ""}\n\n## User\n${content}`;

  try {
    const { text, usage } = await callAnthropic(SYSTEM_PROMPTS.chat, userPrompt, history);
    const messages = ((conv.messages as ChatMessage[]) || []).slice();
    messages.push({ role: "user", content });
    messages.push({ role: "assistant", content: text });
    const prev = (conv.tokenCount as TokenCount) || { input: 0, output: 0 };
    await db
      .update(aiConversationsTable)
      .set({
        messages,
        tokenCount: { input: prev.input + usage.input, output: prev.output + usage.output },
      })
      .where(eq(aiConversationsTable.id, convId));
    await recordRequest(userId, "chat", usage);
    res.json({ role: "assistant", content: text, usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[ai] chat error:", msg);
    res.status(502).json({ error: "AI provider error", details: msg });
  }
});

export default router;
