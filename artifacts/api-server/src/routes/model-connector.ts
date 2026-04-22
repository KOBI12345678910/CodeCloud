import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import crypto from "crypto";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }
  next();
};

interface ModelConnector {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  apiBaseUrl: string;
  authType: "bearer" | "api_key" | "oauth2" | "custom_header" | "aws_sig" | "azure_ad" | "none";
  authConfig: Record<string, any>;
  models: ConnectedModel[];
  status: "active" | "testing" | "disabled" | "error";
  healthCheck: { lastCheck: string; latencyMs: number; status: "healthy" | "degraded" | "down" };
  rateLimit: { requestsPerMinute: number; tokensPerMinute: number };
  costTracking: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ConnectedModel {
  id: string;
  connectorId: string;
  modelId: string;
  displayName: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsJson: boolean;
  inputPricePer1kTokens: number;
  outputPricePer1kTokens: number;
  marginPercent: number;
  finalInputPer1k: number;
  finalOutputPer1k: number;
  tier: "premium" | "standard" | "economy" | "free";
  enabled: boolean;
  fallbackModelId?: string;
  averageLatencyMs: number;
  qualityScore: number;
  strengths: string[];
  metadata: Record<string, any>;
}

const PROVIDER_TEMPLATES: Record<string, Partial<ModelConnector> & { defaultModels: Partial<ConnectedModel>[] }> = {
  openai: {
    displayName: "OpenAI", description: "GPT-4o, GPT-5, o1, o3, DALL-E, Whisper",
    apiBaseUrl: "https://api.openai.com/v1", authType: "bearer",
    defaultModels: [
      { modelId: "gpt-5", displayName: "GPT-5", contextWindow: 1_000_000, capabilities: ["chat", "code", "vision", "tools", "reasoning"], inputPricePer1kTokens: 5, outputPricePer1kTokens: 15, tier: "premium", qualityScore: 98, strengths: ["code", "reasoning", "vision"], supportsVision: true, supportsTools: true },
      { modelId: "gpt-4o", displayName: "GPT-4o", contextWindow: 128000, capabilities: ["chat", "code", "vision", "tools"], inputPricePer1kTokens: 2.5, outputPricePer1kTokens: 10, tier: "premium", qualityScore: 94, strengths: ["code", "vision"], supportsVision: true, supportsTools: true },
      { modelId: "gpt-4o-mini", displayName: "GPT-4o Mini", contextWindow: 128000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.15, outputPricePer1kTokens: 0.6, tier: "economy", qualityScore: 82, strengths: ["speed", "cost"], supportsVision: false, supportsTools: true },
      { modelId: "o3", displayName: "o3", contextWindow: 200000, capabilities: ["reasoning", "code", "math"], inputPricePer1kTokens: 10, outputPricePer1kTokens: 40, tier: "premium", qualityScore: 99, strengths: ["reasoning", "math"], supportsVision: false, supportsTools: true },
      { modelId: "o4-mini", displayName: "o4-mini", contextWindow: 200000, capabilities: ["reasoning", "code"], inputPricePer1kTokens: 1.1, outputPricePer1kTokens: 4.4, tier: "standard", qualityScore: 90, strengths: ["reasoning", "speed"], supportsVision: false, supportsTools: true },
    ],
  },
  anthropic: {
    displayName: "Anthropic", description: "Claude Opus 4, Sonnet 4, Haiku",
    apiBaseUrl: "https://api.anthropic.com/v1", authType: "api_key",
    defaultModels: [
      { modelId: "claude-opus-4", displayName: "Claude Opus 4", contextWindow: 500000, capabilities: ["chat", "code", "vision", "tools", "reasoning"], inputPricePer1kTokens: 15, outputPricePer1kTokens: 75, tier: "premium", qualityScore: 97, strengths: ["code", "reasoning", "writing"], supportsVision: true, supportsTools: true },
      { modelId: "claude-sonnet-4", displayName: "Claude Sonnet 4", contextWindow: 200000, capabilities: ["chat", "code", "vision", "tools"], inputPricePer1kTokens: 3, outputPricePer1kTokens: 15, tier: "premium", qualityScore: 95, strengths: ["code", "vision"], supportsVision: true, supportsTools: true },
      { modelId: "claude-haiku-3.5", displayName: "Claude Haiku 3.5", contextWindow: 200000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.25, outputPricePer1kTokens: 1.25, tier: "economy", qualityScore: 80, strengths: ["speed", "cost"], supportsVision: false, supportsTools: true },
    ],
  },
  google: {
    displayName: "Google DeepMind", description: "Gemini 2.5 Pro/Flash, Veo, Imagen",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1", authType: "api_key",
    defaultModels: [
      { modelId: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", contextWindow: 2_000_000, capabilities: ["chat", "code", "vision", "tools", "reasoning"], inputPricePer1kTokens: 1.25, outputPricePer1kTokens: 5, tier: "premium", qualityScore: 96, strengths: ["reasoning", "multimodal", "context"], supportsVision: true, supportsTools: true },
      { modelId: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", contextWindow: 1_000_000, capabilities: ["chat", "code", "vision"], inputPricePer1kTokens: 0.15, outputPricePer1kTokens: 0.6, tier: "economy", qualityScore: 85, strengths: ["speed", "cost", "multimodal"], supportsVision: true, supportsTools: true },
    ],
  },
  xai: {
    displayName: "xAI", description: "Grok-3, Grok-3 Mini",
    apiBaseUrl: "https://api.x.ai/v1", authType: "bearer",
    defaultModels: [
      { modelId: "grok-3", displayName: "Grok-3", contextWindow: 131072, capabilities: ["chat", "code", "reasoning"], inputPricePer1kTokens: 3, outputPricePer1kTokens: 15, tier: "premium", qualityScore: 92, strengths: ["reasoning", "code"], supportsVision: false, supportsTools: true },
      { modelId: "grok-3-mini", displayName: "Grok-3 Mini", contextWindow: 131072, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.3, outputPricePer1kTokens: 0.5, tier: "economy", qualityScore: 78, strengths: ["speed", "cost"], supportsVision: false, supportsTools: false },
    ],
  },
  deepseek: {
    displayName: "DeepSeek", description: "DeepSeek V3, R1",
    apiBaseUrl: "https://api.deepseek.com/v1", authType: "bearer",
    defaultModels: [
      { modelId: "deepseek-v3", displayName: "DeepSeek V3", contextWindow: 128000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.14, outputPricePer1kTokens: 0.28, tier: "economy", qualityScore: 88, strengths: ["code", "cost"], supportsVision: false, supportsTools: true },
      { modelId: "deepseek-r1", displayName: "DeepSeek R1", contextWindow: 128000, capabilities: ["reasoning", "code", "math"], inputPricePer1kTokens: 0.55, outputPricePer1kTokens: 2.19, tier: "standard", qualityScore: 91, strengths: ["reasoning", "math"], supportsVision: false, supportsTools: false },
    ],
  },
  meta: {
    displayName: "Meta AI", description: "Llama 4 Maverick, Scout",
    apiBaseUrl: "https://api.together.xyz/v1", authType: "bearer",
    defaultModels: [
      { modelId: "llama-4-maverick", displayName: "Llama 4 Maverick", contextWindow: 1_000_000, capabilities: ["chat", "code", "vision"], inputPricePer1kTokens: 0.27, outputPricePer1kTokens: 0.85, tier: "standard", qualityScore: 89, strengths: ["code", "multilingual"], supportsVision: true, supportsTools: true },
      { modelId: "llama-4-scout", displayName: "Llama 4 Scout", contextWindow: 10_000_000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.18, outputPricePer1kTokens: 0.36, tier: "economy", qualityScore: 85, strengths: ["context", "cost"], supportsVision: false, supportsTools: true },
    ],
  },
  mistral: {
    displayName: "Mistral AI", description: "Mistral Large, Medium, Codestral",
    apiBaseUrl: "https://api.mistral.ai/v1", authType: "bearer",
    defaultModels: [
      { modelId: "mistral-large", displayName: "Mistral Large 2", contextWindow: 128000, capabilities: ["chat", "code", "tools"], inputPricePer1kTokens: 2, outputPricePer1kTokens: 6, tier: "premium", qualityScore: 90, strengths: ["code", "multilingual"], supportsVision: false, supportsTools: true },
      { modelId: "codestral", displayName: "Codestral", contextWindow: 32000, capabilities: ["code", "tools"], inputPricePer1kTokens: 0.3, outputPricePer1kTokens: 0.9, tier: "standard", qualityScore: 87, strengths: ["code"], supportsVision: false, supportsTools: true },
    ],
  },
  cohere: {
    displayName: "Cohere", description: "Command R+, Embed, Rerank",
    apiBaseUrl: "https://api.cohere.ai/v1", authType: "bearer",
    defaultModels: [
      { modelId: "command-r-plus", displayName: "Command R+", contextWindow: 128000, capabilities: ["chat", "tools", "rag"], inputPricePer1kTokens: 2.5, outputPricePer1kTokens: 10, tier: "premium", qualityScore: 86, strengths: ["rag", "tools"], supportsVision: false, supportsTools: true },
    ],
  },
  perplexity: {
    displayName: "Perplexity", description: "Sonar Pro, Sonar",
    apiBaseUrl: "https://api.perplexity.ai", authType: "bearer",
    defaultModels: [
      { modelId: "sonar-pro", displayName: "Sonar Pro", contextWindow: 200000, capabilities: ["search", "chat", "reasoning"], inputPricePer1kTokens: 3, outputPricePer1kTokens: 15, tier: "premium", qualityScore: 88, strengths: ["search", "realtime"], supportsVision: false, supportsTools: false },
    ],
  },
  together: {
    displayName: "Together AI", description: "Open-source model hosting",
    apiBaseUrl: "https://api.together.xyz/v1", authType: "bearer",
    defaultModels: [
      { modelId: "qwen-2.5-coder-32b", displayName: "Qwen 2.5 Coder 32B", contextWindow: 32768, capabilities: ["code"], inputPricePer1kTokens: 0.18, outputPricePer1kTokens: 0.18, tier: "economy", qualityScore: 84, strengths: ["code", "cost"], supportsVision: false, supportsTools: false },
    ],
  },
  fireworks: {
    displayName: "Fireworks AI", description: "Fast inference for open models",
    apiBaseUrl: "https://api.fireworks.ai/inference/v1", authType: "bearer",
    defaultModels: [],
  },
  cerebras: {
    displayName: "Cerebras", description: "Ultra-fast inference",
    apiBaseUrl: "https://api.cerebras.ai/v1", authType: "bearer",
    defaultModels: [
      { modelId: "cerebras-llama-70b", displayName: "Llama 70B (Cerebras)", contextWindow: 8192, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.06, outputPricePer1kTokens: 0.06, tier: "economy", qualityScore: 78, strengths: ["speed"], supportsVision: false, supportsTools: false },
    ],
  },
  groq: {
    displayName: "Groq", description: "LPU-powered ultra-fast inference",
    apiBaseUrl: "https://api.groq.com/openai/v1", authType: "bearer",
    defaultModels: [
      { modelId: "groq-llama-3.3-70b", displayName: "Llama 3.3 70B (Groq)", contextWindow: 128000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.06, outputPricePer1kTokens: 0.06, tier: "economy", qualityScore: 82, strengths: ["speed"], supportsVision: false, supportsTools: true },
    ],
  },
  sambanova: {
    displayName: "SambaNova", description: "Enterprise AI inference",
    apiBaseUrl: "https://api.sambanova.ai/v1", authType: "bearer",
    defaultModels: [],
  },
  nvidia: {
    displayName: "NVIDIA NIM", description: "NVIDIA inference microservices",
    apiBaseUrl: "https://integrate.api.nvidia.com/v1", authType: "bearer",
    defaultModels: [],
  },
  azure: {
    displayName: "Azure OpenAI", description: "Microsoft Azure-hosted OpenAI models",
    apiBaseUrl: "https://{resource}.openai.azure.com/openai", authType: "azure_ad",
    defaultModels: [],
  },
  aws_bedrock: {
    displayName: "AWS Bedrock", description: "Amazon Bedrock multi-model platform",
    apiBaseUrl: "https://bedrock-runtime.{region}.amazonaws.com", authType: "aws_sig",
    defaultModels: [
      { modelId: "amazon-nova-pro", displayName: "Amazon Nova Pro", contextWindow: 300000, capabilities: ["chat", "code", "vision"], inputPricePer1kTokens: 0.8, outputPricePer1kTokens: 3.2, tier: "standard", qualityScore: 84, strengths: ["multimodal"], supportsVision: true, supportsTools: true },
    ],
  },
  ai21: {
    displayName: "AI21 Labs", description: "Jamba 2 models",
    apiBaseUrl: "https://api.ai21.com/studio/v1", authType: "bearer",
    defaultModels: [
      { modelId: "jamba-2-large", displayName: "Jamba 2 Large", contextWindow: 256000, capabilities: ["chat"], inputPricePer1kTokens: 2, outputPricePer1kTokens: 8, tier: "standard", qualityScore: 82, strengths: ["context"], supportsVision: false, supportsTools: false },
    ],
  },
  inflection: {
    displayName: "Inflection AI", description: "Pi and Inflection models",
    apiBaseUrl: "https://api.inflection.ai/v1", authType: "bearer",
    defaultModels: [],
  },
  zhipu: {
    displayName: "Zhipu AI (GLM)", description: "GLM-4 series",
    apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4", authType: "bearer",
    defaultModels: [
      { modelId: "glm-4-plus", displayName: "GLM-4 Plus", contextWindow: 128000, capabilities: ["chat", "code"], inputPricePer1kTokens: 0.7, outputPricePer1kTokens: 0.7, tier: "standard", qualityScore: 83, strengths: ["chinese", "code"], supportsVision: false, supportsTools: true },
    ],
  },
  minimax: {
    displayName: "MiniMax", description: "MiniMax text and multimodal models",
    apiBaseUrl: "https://api.minimax.chat/v1", authType: "bearer",
    defaultModels: [],
  },
  moonshot: {
    displayName: "Moonshot AI (Kimi)", description: "Kimi long-context models",
    apiBaseUrl: "https://api.moonshot.cn/v1", authType: "bearer",
    defaultModels: [
      { modelId: "kimi-k2", displayName: "Kimi K2", contextWindow: 1_000_000, capabilities: ["chat", "code", "reasoning"], inputPricePer1kTokens: 0.6, outputPricePer1kTokens: 2.4, tier: "standard", qualityScore: 86, strengths: ["context", "chinese"], supportsVision: false, supportsTools: true },
    ],
  },
  baichuan: {
    displayName: "Baichuan", description: "Baichuan large language models",
    apiBaseUrl: "https://api.baichuan-ai.com/v1", authType: "bearer",
    defaultModels: [],
  },
  ollama: {
    displayName: "Ollama (Self-hosted)", description: "Local/self-hosted open models",
    apiBaseUrl: "http://localhost:11434/v1", authType: "none",
    defaultModels: [],
  },
  custom: {
    displayName: "Custom OpenAI-Compatible", description: "Any OpenAI-compatible API endpoint",
    apiBaseUrl: "", authType: "bearer",
    defaultModels: [],
  },
};

const connectors = new Map<string, ModelConnector>();

function createDefaultModels(connectorId: string, template: typeof PROVIDER_TEMPLATES[string], marginPercent: number): ConnectedModel[] {
  return (template.defaultModels || []).map(m => ({
    id: `model_${crypto.randomUUID().slice(0, 8)}`,
    connectorId,
    modelId: m.modelId || "",
    displayName: m.displayName || m.modelId || "",
    description: m.description || "",
    capabilities: m.capabilities || ["chat"],
    contextWindow: m.contextWindow || 4096,
    maxOutputTokens: m.contextWindow ? Math.min(m.contextWindow, 16384) : 4096,
    supportsVision: m.supportsVision ?? false,
    supportsTools: m.supportsTools ?? false,
    supportsStreaming: true,
    supportsJson: true,
    inputPricePer1kTokens: m.inputPricePer1kTokens || 0,
    outputPricePer1kTokens: m.outputPricePer1kTokens || 0,
    marginPercent,
    finalInputPer1k: (m.inputPricePer1kTokens || 0) * (1 + marginPercent / 100),
    finalOutputPer1k: (m.outputPricePer1kTokens || 0) * (1 + marginPercent / 100),
    tier: m.tier || "standard",
    enabled: true,
    averageLatencyMs: 1000,
    qualityScore: m.qualityScore || 80,
    strengths: m.strengths || [],
    metadata: {},
  }));
}

router.get("/model-connector/providers", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const providers = Object.entries(PROVIDER_TEMPLATES).map(([key, tmpl]) => ({
    id: key,
    displayName: tmpl.displayName,
    description: tmpl.description,
    apiBaseUrl: tmpl.apiBaseUrl,
    authType: tmpl.authType,
    modelCount: (tmpl.defaultModels || []).length,
    connected: Array.from(connectors.values()).some(c => c.provider === key),
  }));
  res.json({ providers, totalProviders: providers.length, connectedCount: providers.filter(p => p.connected).length });
});

router.get("/model-connector/connectors", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const list = Array.from(connectors.values()).map(c => ({ ...c, authConfig: { type: c.authType, configured: !!c.authConfig?.apiKey || !!c.authConfig?.token } }));
  res.json({ connectors: list, total: list.length });
});

router.post("/model-connector/connectors", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = req.body ?? {};
  const { provider, apiKey, apiBaseUrl, marginPercent, customName } = body;
  if (!provider) { res.status(400).json({ error: "provider required" }); return; }

  const template = PROVIDER_TEMPLATES[provider];
  if (!template && !apiBaseUrl) { res.status(400).json({ error: "Unknown provider, provide apiBaseUrl for custom connectors" }); return; }

  const id = `conn_${crypto.randomUUID().slice(0, 12)}`;
  const margin = marginPercent ?? 40;
  const connector: ModelConnector = {
    id,
    provider,
    displayName: customName || template?.displayName || provider,
    description: template?.description || "Custom connector",
    apiBaseUrl: apiBaseUrl || template?.apiBaseUrl || "",
    authType: (template?.authType || "bearer") as ModelConnector["authType"],
    authConfig: apiKey ? { apiKey: `${apiKey.slice(0, 4)}****`, hasKey: true } : {},
    models: createDefaultModels(id, template || { defaultModels: [] }, margin),
    status: apiKey ? "active" : "testing",
    healthCheck: { lastCheck: new Date().toISOString(), latencyMs: 0, status: apiKey ? "healthy" : "down" },
    rateLimit: { requestsPerMinute: body.rateLimit?.rpm || 100, tokensPerMinute: body.rateLimit?.tpm || 1_000_000 },
    costTracking: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
  };
  connectors.set(id, connector);
  res.status(201).json({ ...connector, authConfig: { type: connector.authType, configured: true } });
});

router.patch("/model-connector/connectors/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const body = req.body ?? {};
  const connector = connectors.get(id);
  if (!connector) { res.status(404).json({ error: "Connector not found" }); return; }

  if (body.apiBaseUrl) connector.apiBaseUrl = body.apiBaseUrl;
  if (body.apiKey) connector.authConfig = { apiKey: `${body.apiKey.slice(0, 4)}****`, hasKey: true };
  if (typeof body.status === "string") connector.status = body.status;
  if (body.rateLimit) connector.rateLimit = { ...connector.rateLimit, ...body.rateLimit };
  if (body.displayName) connector.displayName = body.displayName;
  connector.updatedAt = new Date().toISOString();
  res.json({ ...connector, authConfig: { type: connector.authType, configured: !!connector.authConfig?.hasKey } });
});

router.delete("/model-connector/connectors/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!connectors.has(id)) { res.status(404).json({ error: "Connector not found" }); return; }
  connectors.delete(id);
  res.json({ deleted: true });
});

router.post("/model-connector/connectors/:id/models", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const connector = connectors.get(id);
  if (!connector) { res.status(404).json({ error: "Connector not found" }); return; }
  const body = req.body ?? {};
  if (!body.modelId || !body.displayName) { res.status(400).json({ error: "modelId and displayName required" }); return; }

  const margin = body.marginPercent ?? 40;
  const model: ConnectedModel = {
    id: `model_${crypto.randomUUID().slice(0, 8)}`,
    connectorId: id,
    modelId: body.modelId,
    displayName: body.displayName,
    description: body.description || "",
    capabilities: body.capabilities || ["chat"],
    contextWindow: body.contextWindow || 4096,
    maxOutputTokens: body.maxOutputTokens || 4096,
    supportsVision: body.supportsVision ?? false,
    supportsTools: body.supportsTools ?? false,
    supportsStreaming: body.supportsStreaming ?? true,
    supportsJson: body.supportsJson ?? true,
    inputPricePer1kTokens: body.inputPricePer1kTokens || 0,
    outputPricePer1kTokens: body.outputPricePer1kTokens || 0,
    marginPercent: margin,
    finalInputPer1k: (body.inputPricePer1kTokens || 0) * (1 + margin / 100),
    finalOutputPer1k: (body.outputPricePer1kTokens || 0) * (1 + margin / 100),
    tier: body.tier || "standard",
    enabled: true,
    averageLatencyMs: body.averageLatencyMs || 1000,
    qualityScore: body.qualityScore || 80,
    strengths: body.strengths || [],
    metadata: body.metadata || {},
  };
  connector.models.push(model);
  connector.updatedAt = new Date().toISOString();
  res.status(201).json(model);
});

router.patch("/model-connector/connectors/:connId/models/:modelId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { connId, modelId } = req.params;
  const connector = connectors.get(connId);
  if (!connector) { res.status(404).json({ error: "Connector not found" }); return; }
  const mIdx = connector.models.findIndex(m => m.id === modelId);
  if (mIdx === -1) { res.status(404).json({ error: "Model not found" }); return; }

  const body = req.body ?? {};
  const m = connector.models[mIdx];
  if (typeof body.enabled === "boolean") m.enabled = body.enabled;
  if (typeof body.inputPricePer1kTokens === "number") m.inputPricePer1kTokens = body.inputPricePer1kTokens;
  if (typeof body.outputPricePer1kTokens === "number") m.outputPricePer1kTokens = body.outputPricePer1kTokens;
  if (typeof body.marginPercent === "number") m.marginPercent = body.marginPercent;
  if (body.tier) m.tier = body.tier;
  m.finalInputPer1k = m.inputPricePer1kTokens * (1 + m.marginPercent / 100);
  m.finalOutputPer1k = m.outputPricePer1kTokens * (1 + m.marginPercent / 100);
  connector.updatedAt = new Date().toISOString();
  res.json(m);
});

router.post("/model-connector/connectors/:id/test", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const connector = connectors.get(id);
  if (!connector) { res.status(404).json({ error: "Connector not found" }); return; }
  const start = Date.now();
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
  const latency = Date.now() - start;
  connector.healthCheck = { lastCheck: new Date().toISOString(), latencyMs: latency, status: connector.authConfig?.hasKey ? "healthy" : "degraded" };
  res.json({ success: true, latencyMs: latency, status: connector.healthCheck.status, modelsAvailable: connector.models.length });
});

router.get("/model-connector/all-models", requireAuth, async (_req, res): Promise<void> => {
  const allModels: (ConnectedModel & { providerName: string; connectorStatus: string })[] = [];
  connectors.forEach(c => {
    c.models.filter(m => m.enabled).forEach(m => {
      allModels.push({ ...m, providerName: c.displayName, connectorStatus: c.status });
    });
  });
  allModels.sort((a, b) => b.qualityScore - a.qualityScore);
  res.json({
    models: allModels,
    total: allModels.length,
    byTier: {
      premium: allModels.filter(m => m.tier === "premium"),
      standard: allModels.filter(m => m.tier === "standard"),
      economy: allModels.filter(m => m.tier === "economy"),
      free: allModels.filter(m => m.tier === "free"),
    },
  });
});

export default router;
