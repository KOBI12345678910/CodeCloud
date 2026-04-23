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

app.get("/api/health", (_, res) => { res.json({ status: "ok", version: "2.0.0", platform: "Kobi Business OS" }); });
app.get("/api/config", (_, res) => { res.json({ supabase_url: supabaseUrl, platform_name: "Kobi Business OS" }); });

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, "0.0.0.0", () => { console.log(`Kobi Business OS API on port ${PORT}`); });
