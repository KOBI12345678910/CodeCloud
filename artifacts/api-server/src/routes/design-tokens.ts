import { Router } from "express";
const r = Router();

interface DesignSystem {
  id: string;
  projectId: string;
  name: string;
  version: string;
  tokens: {
    colors: Record<string, { value: string; description: string }>;
    typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }>;
    spacing: Record<string, { value: string }>;
    radii: Record<string, { value: string }>;
    shadows: Record<string, { value: string }>;
    breakpoints: Record<string, { value: string }>;
    animations: Record<string, { value: string; duration: string; easing: string }>;
  };
  components: Array<{ name: string; category: string; variants: string[]; tokens: string[] }>;
  createdAt: string;
  updatedAt: string;
}

const systems = new Map<string, DesignSystem>();

const defaultTokens: DesignSystem["tokens"] = {
  colors: {
    "primary-50": { value: "#eef2ff", description: "Lightest primary" },
    "primary-100": { value: "#e0e7ff", description: "Light primary" },
    "primary-500": { value: "#6366f1", description: "Primary" },
    "primary-600": { value: "#4f46e5", description: "Primary dark" },
    "primary-900": { value: "#312e81", description: "Darkest primary" },
    "neutral-50": { value: "#fafafa", description: "Background" },
    "neutral-100": { value: "#f5f5f5", description: "Surface" },
    "neutral-500": { value: "#737373", description: "Muted text" },
    "neutral-900": { value: "#171717", description: "Text" },
    "success": { value: "#22c55e", description: "Success" },
    "warning": { value: "#f59e0b", description: "Warning" },
    "error": { value: "#ef4444", description: "Error" },
    "info": { value: "#3b82f6", description: "Info" },
  },
  typography: {
    "display-xl": { fontFamily: "Inter", fontSize: "3.75rem", fontWeight: "800", lineHeight: "1", letterSpacing: "-0.025em" },
    "display-lg": { fontFamily: "Inter", fontSize: "3rem", fontWeight: "700", lineHeight: "1.1", letterSpacing: "-0.025em" },
    "heading-1": { fontFamily: "Inter", fontSize: "2.25rem", fontWeight: "700", lineHeight: "1.2", letterSpacing: "-0.02em" },
    "heading-2": { fontFamily: "Inter", fontSize: "1.875rem", fontWeight: "600", lineHeight: "1.3", letterSpacing: "-0.01em" },
    "heading-3": { fontFamily: "Inter", fontSize: "1.5rem", fontWeight: "600", lineHeight: "1.4", letterSpacing: "0" },
    "body-lg": { fontFamily: "Inter", fontSize: "1.125rem", fontWeight: "400", lineHeight: "1.75", letterSpacing: "0" },
    "body": { fontFamily: "Inter", fontSize: "1rem", fontWeight: "400", lineHeight: "1.5", letterSpacing: "0" },
    "body-sm": { fontFamily: "Inter", fontSize: "0.875rem", fontWeight: "400", lineHeight: "1.5", letterSpacing: "0" },
    "caption": { fontFamily: "Inter", fontSize: "0.75rem", fontWeight: "400", lineHeight: "1.5", letterSpacing: "0.025em" },
    "code": { fontFamily: "JetBrains Mono", fontSize: "0.875rem", fontWeight: "400", lineHeight: "1.7", letterSpacing: "0" },
  },
  spacing: { "0": { value: "0" }, "1": { value: "0.25rem" }, "2": { value: "0.5rem" }, "3": { value: "0.75rem" }, "4": { value: "1rem" }, "6": { value: "1.5rem" }, "8": { value: "2rem" }, "12": { value: "3rem" }, "16": { value: "4rem" }, "24": { value: "6rem" } },
  radii: { "none": { value: "0" }, "sm": { value: "0.25rem" }, "md": { value: "0.375rem" }, "lg": { value: "0.5rem" }, "xl": { value: "0.75rem" }, "2xl": { value: "1rem" }, "full": { value: "9999px" } },
  shadows: { "sm": { value: "0 1px 2px rgba(0,0,0,0.05)" }, "md": { value: "0 4px 6px -1px rgba(0,0,0,0.1)" }, "lg": { value: "0 10px 15px -3px rgba(0,0,0,0.1)" }, "xl": { value: "0 20px 25px -5px rgba(0,0,0,0.1)" } },
  breakpoints: { "sm": { value: "640px" }, "md": { value: "768px" }, "lg": { value: "1024px" }, "xl": { value: "1280px" }, "2xl": { value: "1536px" } },
  animations: { "fade-in": { value: "fadeIn", duration: "200ms", easing: "ease-out" }, "slide-up": { value: "slideUp", duration: "300ms", easing: "cubic-bezier(0.4,0,0.2,1)" }, "scale": { value: "scale", duration: "150ms", easing: "ease-in-out" } },
};

r.get("/design-tokens/:projectId", (req, res) => {
  const s = systems.get(req.params.projectId);
  if (!s) return res.json({ initialized: false, defaultTokens });
  res.json({ initialized: true, system: s });
});

r.post("/design-tokens/:projectId", (req, res) => {
  const { projectId } = req.params;
  const { name = "Default Design System", tokens } = req.body;
  const s: DesignSystem = {
    id: `ds_${Date.now()}`, projectId, name, version: "1.0.0",
    tokens: tokens || defaultTokens,
    components: [
      { name: "Button", category: "actions", variants: ["primary", "secondary", "ghost", "destructive"], tokens: ["primary-500", "primary-600", "md", "body"] },
      { name: "Input", category: "forms", variants: ["default", "error", "disabled"], tokens: ["neutral-100", "neutral-500", "md", "body"] },
      { name: "Card", category: "layout", variants: ["default", "elevated", "outlined"], tokens: ["neutral-50", "lg", "md"] },
      { name: "Badge", category: "data-display", variants: ["default", "success", "warning", "error"], tokens: ["primary-100", "sm", "caption"] },
      { name: "Avatar", category: "data-display", variants: ["sm", "md", "lg", "xl"], tokens: ["primary-500", "full"] },
      { name: "Modal", category: "overlays", variants: ["default", "fullscreen", "drawer"], tokens: ["neutral-50", "xl", "lg"] },
      { name: "Toast", category: "feedback", variants: ["info", "success", "warning", "error"], tokens: ["info", "success", "warning", "error", "md"] },
      { name: "Table", category: "data-display", variants: ["default", "striped", "bordered"], tokens: ["neutral-50", "neutral-100", "body-sm"] },
    ],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  systems.set(projectId, s);
  res.status(201).json(s);
});

r.patch("/design-tokens/:projectId/tokens", (req, res) => {
  const s = systems.get(req.params.projectId);
  if (!s) return res.status(404).json({ error: "not initialized" });
  const { category, key, value } = req.body;
  if (!category || !key || !value) return res.status(400).json({ error: "category, key, value required" });
  if (!(category in s.tokens)) return res.status(400).json({ error: `invalid category: ${Object.keys(s.tokens).join(", ")}` });
  (s.tokens as any)[category][key] = value;
  s.updatedAt = new Date().toISOString();
  s.version = incrementVersion(s.version);
  res.json({ updated: true, version: s.version });
});

r.get("/design-tokens/:projectId/export/:format", (req, res) => {
  const s = systems.get(req.params.projectId);
  if (!s) return res.status(404).json({ error: "not initialized" });
  const { format } = req.params;
  switch (format) {
    case "css":
      const css = Object.entries(s.tokens.colors).map(([k, v]) => `  --color-${k}: ${v.value};`).join("\n");
      return res.type("text/css").send(`:root {\n${css}\n}`);
    case "tailwind":
      return res.json({ theme: { extend: { colors: Object.fromEntries(Object.entries(s.tokens.colors).map(([k, v]) => [k, v.value])) } } });
    case "json":
      return res.json(s.tokens);
    case "scss":
      const scss = Object.entries(s.tokens.colors).map(([k, v]) => `$color-${k}: ${v.value};`).join("\n");
      return res.type("text/plain").send(scss);
    case "figma":
      return res.json({ name: s.name, version: s.version, tokens: s.tokens, figmaFormat: true });
    default:
      return res.status(400).json({ error: "format must be css, tailwind, json, scss, or figma" });
  }
});

function incrementVersion(v: string): string {
  const parts = v.split(".").map(Number);
  parts[2]++;
  return parts.join(".");
}

export default r;
