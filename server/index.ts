import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ponypxhushxeskxgrmha.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const adminClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Health check
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    platform: "Kobi Business OS",
    modules_count: "50,945",
    categories_count: 245,
    supabase_connected: !!adminClient,
    timestamp: new Date().toISOString(),
  });
});

// Config endpoint (safe public info)
app.get("/api/config", (_, res) => {
  res.json({
    supabase_url: supabaseUrl,
    platform_name: "Kobi Business OS",
    version: "2.0.0",
    features: {
      ai_builder: true,
      marketplace: true,
      multi_tenant: true,
      rtl_support: true,
      languages: ["he", "en", "ar"],
    },
  });
});

// Module stats
app.get("/api/stats", async (_, res) => {
  try {
    if (!adminClient) return res.json({ modules: 50945, categories: 245, tenants: 0 });
    const { data: modCount } = await adminClient.rpc("get_module_categories");
    const totalModules = Array.isArray(modCount) ? modCount.reduce((sum: number, c: any) => sum + (c.count || 0), 0) : 50945;
    const totalCategories = Array.isArray(modCount) ? modCount.length : 245;
    res.json({ modules: totalModules, categories: totalCategories });
  } catch (err: any) {
    res.json({ modules: 50945, categories: 245, error: err.message });
  }
});

// AI proxy (placeholder â connects to real AI providers)
app.post("/api/ai/chat", async (req, res) => {
  const { message, model, context } = req.body;
  // TODO: Route to OpenAI / Anthropic / Gemini based on model
  res.json({
    response: `ð¤ AI Builder: ×§××××ª× ××ª ×××××¢× ×©××. ×××× ${model || "default"} ×××××¨ ××§×¨××.`,
    model: model || "placeholder",
  });
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ð Kobi Business OS API running on port ${PORT}`);
});
