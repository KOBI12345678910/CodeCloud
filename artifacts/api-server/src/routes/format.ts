import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { formatCode, formatCodeByFilename, detectLanguage, type SupportedLanguage } from "../services/formatter";

const router: IRouter = Router();

router.post("/format", requireAuth, async (req, res): Promise<void> => {
  const { code, language, filename, options } = req.body;

  if (!code && code !== "") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  if (!language && !filename) {
    res.status(400).json({ error: "language or filename is required" });
    return;
  }

  try {
    let result;
    if (filename) {
      result = await formatCodeByFilename(code, filename, options);
    } else {
      result = await formatCode(code, language as SupportedLanguage, options);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Formatting failed",
      formatted: code,
      success: false,
    });
  }
});

router.get("/format/languages", (_req, res): void => {
  res.json({
    supported: [
      { language: "javascript", extensions: [".js", ".jsx"], engine: "prettier" },
      { language: "typescript", extensions: [".ts", ".tsx"], engine: "prettier" },
      { language: "html", extensions: [".html", ".htm"], engine: "prettier" },
      { language: "css", extensions: [".css", ".scss"], engine: "prettier" },
      { language: "json", extensions: [".json"], engine: "prettier" },
      { language: "markdown", extensions: [".md", ".mdx"], engine: "prettier" },
      { language: "yaml", extensions: [".yml", ".yaml"], engine: "prettier" },
      { language: "graphql", extensions: [".graphql", ".gql"], engine: "prettier" },
      { language: "python", extensions: [".py"], engine: "basic-indent" },
      { language: "go", extensions: [".go"], engine: "unavailable" },
      { language: "rust", extensions: [".rs"], engine: "unavailable" },
    ],
  });
});

router.post("/format/detect", (_req, res): void => {
  const { filename } = _req.body;
  if (!filename) {
    res.status(400).json({ error: "filename is required" });
    return;
  }
  const language = detectLanguage(filename);
  res.json({ filename, language, supported: language !== null });
});

export default router;
