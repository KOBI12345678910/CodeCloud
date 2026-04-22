import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

type Provider = "anthropic" | "openai" | "google" | "groq";

interface ModelDef {
  id: string;
  label: string;
  provider: Provider;
  apiModel: string;
  inputPer1M: number;
  outputPer1M: number;
  description: string;
}

const MODELS: ModelDef[] = [
  {
    id: "claude-sonnet-4",
    label: "Claude Sonnet 4",
    provider: "anthropic",
    apiModel: "claude-sonnet-4-6",
    inputPer1M: 3,
    outputPer1M: 15,
    description: "Balanced reasoning + speed. Best for coding.",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    apiModel: "gpt-4o",
    inputPer1M: 2.5,
    outputPer1M: 10,
    description: "OpenAI flagship multimodal model.",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    apiModel: "gemini-2.5-pro",
    inputPer1M: 1.25,
    outputPer1M: 5,
    description: "Google's strongest reasoning model.",
  },
  {
    id: "llama-3-70b",
    label: "Llama 3 70B",
    provider: "groq",
    apiModel: "llama3-70b-8192",
    inputPer1M: 0.59,
    outputPer1M: 0.79,
    description: "Open-source via Groq's ultra-fast inference.",
  },
];

interface ChatMsg { role: "user" | "assistant" | "system"; content: string; }
interface CallResult {
  content: string;
  usage: { inputTokens: number; outputTokens: number; cost: number };
  latencyMs: number;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function computeCost(model: ModelDef, inputTokens: number, outputTokens: number): number {
  return (inputTokens * model.inputPer1M + outputTokens * model.outputPer1M) / 1_000_000;
}

function isProviderConfigured(provider: Provider): boolean {
  switch (provider) {
    case "anthropic":
      return !!(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
    case "openai":
      return !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
    case "google":
      return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY);
    case "groq":
      return !!process.env.GROQ_API_KEY;
  }
}

async function callAnthropic(model: ModelDef, messages: ChatMsg[]): Promise<CallResult> {
  const sys = messages.find(m => m.role === "system")?.content;
  const conv = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const start = Date.now();
  const resp = await anthropic.messages.create({
    model: model.apiModel,
    max_tokens: 4096,
    ...(sys ? { system: sys } : {}),
    messages: conv,
  });
  const content = resp.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text?: string }) => b.text || "")
    .join("");
  const inputTokens = resp.usage?.input_tokens ?? estimateTokens(messages.map(m => m.content).join("\n"));
  const outputTokens = resp.usage?.output_tokens ?? estimateTokens(content);
  return {
    content,
    usage: { inputTokens, outputTokens, cost: computeCost(model, inputTokens, outputTokens) },
    latencyMs: Date.now() - start,
  };
}

async function callOpenAI(model: ModelDef, messages: ChatMsg[]): Promise<CallResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
  const start = Date.now();
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.apiModel, messages, max_tokens: 4096 }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data: { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } } = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join("\n"));
  const outputTokens = data.usage?.completion_tokens ?? estimateTokens(content);
  return {
    content,
    usage: { inputTokens, outputTokens, cost: computeCost(model, inputTokens, outputTokens) },
    latencyMs: Date.now() - start,
  };
}

async function callGroq(model: ModelDef, messages: ChatMsg[]): Promise<CallResult> {
  const apiKey = process.env.GROQ_API_KEY!;
  const start = Date.now();
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.apiModel, messages, max_tokens: 4096 }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data: { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } } = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join("\n"));
  const outputTokens = data.usage?.completion_tokens ?? estimateTokens(content);
  return {
    content,
    usage: { inputTokens, outputTokens, cost: computeCost(model, inputTokens, outputTokens) },
    latencyMs: Date.now() - start,
  };
}

async function callGemini(model: ModelDef, messages: ChatMsg[]): Promise<CallResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY!;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const sys = messages.find(m => m.role === "system")?.content;
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const start = Date.now();
  const r = await fetch(`${baseUrl}/models/${model.apiModel}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  } = await r.json();
  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") ?? "";
  const inputTokens = data.usageMetadata?.promptTokenCount ?? estimateTokens(messages.map(m => m.content).join("\n"));
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(content);
  return {
    content,
    usage: { inputTokens, outputTokens, cost: computeCost(model, inputTokens, outputTokens) },
    latencyMs: Date.now() - start,
  };
}

async function callModel(model: ModelDef, messages: ChatMsg[]): Promise<CallResult> {
  if (!isProviderConfigured(model.provider)) {
    throw new Error(`${model.provider} is not configured. Add the provider's API key.`);
  }
  switch (model.provider) {
    case "anthropic": return callAnthropic(model, messages);
    case "openai":    return callOpenAI(model, messages);
    case "groq":      return callGroq(model, messages);
    case "google":    return callGemini(model, messages);
  }
}

router.get("/ai/multi/models", requireAuth, (_req, res) => {
  res.json({
    models: MODELS.map(m => ({
      id: m.id,
      label: m.label,
      provider: m.provider,
      description: m.description,
      pricing: { inputPer1M: m.inputPer1M, outputPer1M: m.outputPer1M },
      available: isProviderConfigured(m.provider),
    })),
  });
});

router.post("/ai/multi/chat", requireAuth, async (req, res): Promise<void> => {
  const { modelId, messages } = req.body as { modelId?: string; messages?: ChatMsg[] };
  const model = MODELS.find(m => m.id === modelId);
  if (!model) { res.status(400).json({ error: "Unknown modelId" }); return; }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" }); return;
  }
  try {
    const result = await callModel(model, messages);
    res.json({ modelId: model.id, label: model.label, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI provider error";
    res.status(502).json({ error: msg, modelId: model.id });
  }
});

router.post("/ai/multi/compare", requireAuth, async (req, res): Promise<void> => {
  const { modelIds, messages } = req.body as { modelIds?: string[]; messages?: ChatMsg[] };
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    res.status(400).json({ error: "modelIds array required" }); return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" }); return;
  }
  const selected = MODELS.filter(m => modelIds.includes(m.id));
  const results = await Promise.all(selected.map(async m => {
    try {
      const r = await callModel(m, messages);
      return { modelId: m.id, label: m.label, ok: true as const, ...r };
    } catch (e) {
      return {
        modelId: m.id,
        label: m.label,
        ok: false as const,
        error: e instanceof Error ? e.message : "AI provider error",
      };
    }
  }));
  res.json({ results });
});

export default router;
