import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You are BuildHub AI, an elite full-stack engineer and UI designer. You generate complete, beautiful, single-file web applications from a user's natural language description.

OUTPUT FORMAT — STRICT:
Respond with ONLY a single fenced code block containing one complete HTML document. No prose before or after. The document must:
- Be a complete, self-contained HTML5 file (DOCTYPE, html, head, body)
- Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Include any JS inline in <script> tags (vanilla JS or Alpine.js via CDN if helpful)
- Be visually stunning: dark mode by default, gradients, glass effects, smooth animations, modern typography
- Be fully responsive (mobile-first)
- Use Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest"></script> with lucide.createIcons() after DOMContentLoaded
- Include realistic placeholder content (no "Lorem ipsum")
- Be production-quality: hover states, transitions, focus rings, proper semantics

When the user asks for changes, output the FULL updated HTML document — never partial diffs.

Begin every response with \`\`\`html and end with \`\`\`. Nothing else.`;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

router.post("/buildhub/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { prompt, history } = req.body as { prompt?: string; history?: ChatMsg[] };

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "prompt is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const messages: ChatMsg[] = [];
  if (Array.isArray(history)) {
    for (const m of history) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: "user", content: prompt });

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation failed";
    try {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    } catch {
      // connection already closed
    }
  }
});

export default router;
