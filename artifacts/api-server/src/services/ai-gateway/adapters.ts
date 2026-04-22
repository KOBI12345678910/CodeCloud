import type { ModelDef, Provider } from "./registry";

export interface ChatMsg { role: "system" | "user" | "assistant"; content: string; }
export interface AdapterResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  raw?: unknown;
}

export interface AdapterOptions {
  apiKey?: string | null;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

function estimateTokens(text: string): number { return Math.max(1, Math.ceil(text.length / 4)); }

export interface EmbedResult { vectors: number[][]; inputTokens: number; latencyMs: number; }

abstract class BaseAdapter {
  abstract provider: Provider;
  abstract complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult>;

  // Default streaming: call complete() and emit the whole result at once.
  // Adapters that support real SSE override this (see AnthropicAdapter, OpenAIAdapter).
  async stream(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions, onDelta: (chunk: string) => void): Promise<AdapterResult> {
    const result = await this.complete(model, messages, opts);
    if (result.content) onDelta(result.content);
    return result;
  }

  // Default embedding: deterministic hash-based fallback. Real adapters override.
  async embed(_model: ModelDef, inputs: string[], _opts: AdapterOptions): Promise<EmbedResult> {
    const start = Date.now();
    const dim = 256;
    const vectors = inputs.map(text => {
      const v = new Array(dim).fill(0) as number[];
      const tokens = text.toLowerCase().match(/\w+/g) ?? [];
      for (const t of tokens) {
        let h = 0;
        for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
        v[Math.abs(h) % dim] += 1;
      }
      let n = 0; for (let i = 0; i < dim; i++) n += v[i] * v[i]; n = Math.sqrt(n) || 1;
      for (let i = 0; i < dim; i++) v[i] /= n;
      return v;
    });
    return { vectors, inputTokens: inputs.reduce((s, t) => s + estimateTokens(t), 0), latencyMs: Date.now() - start };
  }

  protected isConfigured(provider: Provider, byokKey?: string | null): boolean {
    if (byokKey) return true;
    return BaseAdapter.providerEnvConfigured(provider);
  }

  static providerEnvConfigured(provider: Provider): boolean {
    switch (provider) {
      case "anthropic": return !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);
      case "openai":    return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
      case "google":    return !!(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
      case "xai":       return !!process.env.XAI_API_KEY;
      case "deepseek":  return !!process.env.DEEPSEEK_API_KEY;
      case "meta":      return !!process.env.GROQ_API_KEY;
      case "mistral":   return !!process.env.MISTRAL_API_KEY;
      case "qwen":      return !!process.env.DASHSCOPE_API_KEY;
      case "cohere":    return !!process.env.COHERE_API_KEY;
      case "ollama":    return !!(process.env.OLLAMA_BASE_URL || process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL);
    }
  }
}

class SimulatedAdapter extends BaseAdapter {
  constructor(public provider: Provider) { super(); }
  async complete(model: ModelDef, messages: ChatMsg[], _opts: AdapterOptions): Promise<AdapterResult> {
    const start = Date.now();
    const userMsg = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
    const sys = messages.find(m => m.role === "system")?.content ?? "";
    await new Promise(r => setTimeout(r, 80 + Math.random() * 240));
    const content = `[${model.label} simulated] I read your prompt (${userMsg.slice(0, 80)}${userMsg.length > 80 ? "…" : ""}). Configure ${model.provider.toUpperCase()} credentials in environment or BYOK to get a live answer. My strengths are: ${model.strengths.join(", ")}.`;
    const inputTokens = estimateTokens(sys + userMsg);
    const outputTokens = estimateTokens(content);
    return { content, inputTokens, outputTokens, latencyMs: Date.now() - start };
  }
}

class AnthropicAdapter extends BaseAdapter {
  provider: Provider = "anthropic";
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw Object.assign(new Error("Anthropic provider not configured (no env key, no BYOK)"), { code: "provider_unavailable" });
    // Per-request: when BYOK is provided, route directly to Anthropic with the user's key
    // instead of the shared workspace integration singleton. This guarantees correct billing
    // attribution and isolation.
    const baseUrl = opts.apiKey
      ? "https://api.anthropic.com"
      : (process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://api.anthropic.com");
    const sys = messages.find(m => m.role === "system")?.content;
    const conv = messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const start = Date.now();
    const r = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.apiModel,
        max_tokens: opts.maxTokens ?? 4096,
        ...(sys ? { system: sys } : {}),
        messages: conv,
      }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json() as { content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const content = (data.content ?? []).map(b => b.type === "text" ? (b.text ?? "") : "").join("");
    return {
      content,
      inputTokens: data.usage?.input_tokens ?? estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: data.usage?.output_tokens ?? estimateTokens(content),
      latencyMs: Date.now() - start,
    };
  }

  async stream(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions, onDelta: (chunk: string) => void): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw Object.assign(new Error("Anthropic provider not configured"), { code: "provider_unavailable" });
    const baseUrl = opts.apiKey ? "https://api.anthropic.com" : (process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://api.anthropic.com");
    const sys = messages.find(m => m.role === "system")?.content;
    const conv = messages.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const start = Date.now();
    const r = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model.apiModel, max_tokens: opts.maxTokens ?? 4096, stream: true, ...(sys ? { system: sys } : {}), messages: conv }),
      signal: opts.signal,
    });
    if (!r.ok || !r.body) throw new Error(`Anthropic stream ${r.status}`);
    let collected = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type: string; delta?: { text?: string }; usage?: { input_tokens?: number; output_tokens?: number } };
          if (ev.type === "content_block_delta" && ev.delta?.text) { collected += ev.delta.text; onDelta(ev.delta.text); }
          if (ev.usage?.input_tokens) inputTokens = ev.usage.input_tokens;
          if (ev.usage?.output_tokens) outputTokens = ev.usage.output_tokens;
        } catch { /* ignore malformed chunk */ }
      }
    }
    return {
      content: collected,
      inputTokens: inputTokens || estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: outputTokens || estimateTokens(collected),
      latencyMs: Date.now() - start,
    };
  }
}

class OpenAIAdapter extends BaseAdapter {
  provider: Provider = "openai";
  private resolveBaseUrl(opts: AdapterOptions): string {
    return opts.apiKey ? "https://api.openai.com/v1" : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1");
  }
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error("OpenAI provider not configured"), { code: "provider_unavailable" });
    const baseUrl = this.resolveBaseUrl(opts);
    const start = Date.now();
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model.apiModel, messages, max_tokens: opts.maxTokens ?? 4096 }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data= await r.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      inputTokens: data.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: data.usage?.completion_tokens ?? estimateTokens(content),
      latencyMs: Date.now() - start,
    };
  }

  async stream(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions, onDelta: (chunk: string) => void): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error("OpenAI provider not configured"), { code: "provider_unavailable" });
    const baseUrl = this.resolveBaseUrl(opts);
    const start = Date.now();
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model.apiModel, messages, max_tokens: opts.maxTokens ?? 4096, stream: true }),
      signal: opts.signal,
    });
    if (!r.ok || !r.body) throw new Error(`OpenAI stream ${r.status}`);
    let collected = "";
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = ev.choices?.[0]?.delta?.content;
          if (delta) { collected += delta; onDelta(delta); }
        } catch { /* ignore */ }
      }
    }
    return {
      content: collected,
      inputTokens: estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: estimateTokens(collected),
      latencyMs: Date.now() - start,
    };
  }

  async embed(_model: ModelDef, inputs: string[], opts: AdapterOptions): Promise<EmbedResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return super.embed(_model, inputs, opts);
    const baseUrl = this.resolveBaseUrl(opts);
    const start = Date.now();
    const r = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`OpenAI embed ${r.status}`);
    const data = await r.json() as { data?: Array<{ embedding: number[] }>; usage?: { prompt_tokens?: number } };
    return {
      vectors: (data.data ?? []).map(d => d.embedding),
      inputTokens: data.usage?.prompt_tokens ?? inputs.reduce((s, t) => s + estimateTokens(t), 0),
      latencyMs: Date.now() - start,
    };
  }
}

class GoogleAdapter extends BaseAdapter {
  provider: Provider = "google";
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw Object.assign(new Error("Google provider not configured"), { code: "provider_unavailable" });
    const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
    const sys = messages.find(m => m.role === "system")?.content;
    const contents = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const start = Date.now();
    const r = await fetch(`${baseUrl}/models/${model.apiModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents, ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}), generationConfig: { maxOutputTokens: opts.maxTokens ?? 4096 } }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data= await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
    const content = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") ?? "";
    return {
      content,
      inputTokens: data.usageMetadata?.promptTokenCount ?? estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? estimateTokens(content),
      latencyMs: Date.now() - start,
    };
  }
}

class OpenAICompatibleAdapter extends BaseAdapter {
  constructor(public provider: Provider, private baseUrl: string, private envKey: string) { super(); }
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env[this.envKey];
    if (!apiKey) throw Object.assign(new Error(`${this.provider} provider not configured`), { code: "provider_unavailable" });
    const start = Date.now();
    const r = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model.apiModel, messages, max_tokens: opts.maxTokens ?? 4096 }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`${this.provider} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data= await r.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      inputTokens: data.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: data.usage?.completion_tokens ?? estimateTokens(content),
      latencyMs: Date.now() - start,
    };
  }
}

class CohereAdapter extends BaseAdapter {
  provider: Provider = "cohere";
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const apiKey = opts.apiKey || process.env.COHERE_API_KEY;
    if (!apiKey) throw Object.assign(new Error("Cohere provider not configured"), { code: "provider_unavailable" });
    const sys = messages.find(m => m.role === "system")?.content;
    const userMsg = messages.filter(m => m.role !== "system").slice(-1)[0]?.content ?? "";
    const chatHistory = messages.filter(m => m.role !== "system").slice(0, -1).map(m => ({ role: m.role === "user" ? "USER" : "CHATBOT", message: m.content }));
    const start = Date.now();
    const r = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model.apiModel, message: userMsg, chat_history: chatHistory, ...(sys ? { preamble: sys } : {}) }),
      signal: opts.signal,
    });
    if (!r.ok) throw new Error(`Cohere ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data= await r.json() as { text?: string; meta?: { tokens?: { input_tokens?: number; output_tokens?: number } } };
    const content = data.text ?? "";
    return {
      content,
      inputTokens: data.meta?.tokens?.input_tokens ?? estimateTokens(messages.map(m => m.content).join("\n")),
      outputTokens: data.meta?.tokens?.output_tokens ?? estimateTokens(content),
      latencyMs: Date.now() - start,
    };
  }
}

class OllamaAdapter extends BaseAdapter {
  provider: Provider = "ollama";
  async complete(model: ModelDef, messages: ChatMsg[], opts: AdapterOptions): Promise<AdapterResult> {
    const baseUrl = process.env.OLLAMA_BASE_URL || process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL;
    if (!baseUrl) throw Object.assign(new Error("Ollama base URL not configured"), { code: "provider_unavailable" });
    const start = Date.now();
    try {
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: model.apiModel, messages, stream: false }),
        signal: opts.signal,
      });
      if (!r.ok) throw new Error(`Ollama ${r.status}`);
      const data= await r.json() as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
      const content = data.message?.content ?? "";
      return {
        content,
        inputTokens: data.prompt_eval_count ?? estimateTokens(messages.map(m => m.content).join("\n")),
        outputTokens: data.eval_count ?? estimateTokens(content),
        latencyMs: Date.now() - start,
      };
    } catch (e) {
      throw Object.assign(new Error(`Ollama unreachable: ${e instanceof Error ? e.message : "unknown"}`), { code: "provider_unavailable" });
    }
  }
}

const adapters: Record<Provider, BaseAdapter> = {
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  google: new GoogleAdapter(),
  xai: new OpenAICompatibleAdapter("xai", "https://api.x.ai/v1", "XAI_API_KEY"),
  deepseek: new OpenAICompatibleAdapter("deepseek", "https://api.deepseek.com/v1", "DEEPSEEK_API_KEY"),
  meta: new OpenAICompatibleAdapter("meta", "https://api.groq.com/openai/v1", "GROQ_API_KEY"),
  mistral: new OpenAICompatibleAdapter("mistral", "https://api.mistral.ai/v1", "MISTRAL_API_KEY"),
  qwen: new OpenAICompatibleAdapter("qwen", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "DASHSCOPE_API_KEY"),
  cohere: new CohereAdapter(),
  ollama: new OllamaAdapter(),
};

export function getAdapter(p: Provider): BaseAdapter { return adapters[p]; }
export function isProviderConfigured(p: Provider): boolean { return BaseAdapter.providerEnvConfigured(p); }
