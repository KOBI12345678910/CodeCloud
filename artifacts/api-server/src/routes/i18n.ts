import { Router, type Request, type Response, type NextFunction } from "express";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LANGUAGES, LANG_BY_CODE } from "@workspace/i18n";
import {
  loadServerBundle,
  computeCoverage,
  listMisses,
  recordMiss,
  clearMisses,
  getServerLocaleInfo,
  isSupportedLocale,
  invalidateBundle,
} from "../services/i18n";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { sendLocalizedError } from "../lib/errors";

const router = Router();

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== "admin") {
    sendLocalizedError(req, res, "errors.forbidden");
    return;
  }
  next();
};

router.get("/i18n/config", (_req: Request, res: Response): void => {
  res.json(getServerLocaleInfo());
});

router.get("/i18n/languages", (_req: Request, res: Response): void => {
  res.json(LANGUAGES);
});

router.get("/i18n/coverage", requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  res.json({ rows: computeCoverage() });
});

router.get("/i18n/misses", requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  res.json({ misses: listMisses() });
});

router.post("/i18n/misses", (req: Request, res: Response): void => {
  const { key, locale } = req.body as { key?: string; locale?: string };
  if (!key || !locale) {
    sendLocalizedError(req, res, "errors.validation");
    return;
  }
  recordMiss(locale, key);
  res.json({ ok: true });
});

router.delete("/i18n/misses", requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  clearMisses();
  res.json({ ok: true });
});

const I18N_LOCALES_DIR = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..", "lib", "i18n", "src", "locales");
})();
const PLACEHOLDER_RE = /\{\{[^}]+\}\}|\{[^}]+\}/g;

function maskPlaceholders(s: string): { masked: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let i = 0;
  const masked = s.replace(PLACEHOLDER_RE, (m) => {
    const tok = `__P${i++}__`;
    map.set(tok, m);
    return tok;
  });
  return { masked, map };
}
function unmaskPlaceholders(s: string, map: Map<string, string>): string {
  let out = s;
  for (const [tok, original] of map) out = out.split(tok).join(original);
  return out;
}
async function translateOne(text: string, target: string): Promise<string | null> {
  if (!text.trim()) return text;
  const { masked, map } = maskPlaceholders(text);
  const params = new URLSearchParams({ q: masked, langpair: `en|${target}` });
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (!r.ok) return null;
    const data = (await r.json()) as { responseData?: { translatedText?: string } };
    const t = data?.responseData?.translatedText;
    return typeof t === "string" ? unmaskPlaceholders(t, map) : null;
  } catch {
    return null;
  }
}

const inFlight = new Set<string>();

router.post(
  "/i18n/auto-translate",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ALLOWED_NAMESPACES = new Set(["common"]);
    const { locale, namespace = "common", limit = 60 } = req.body as {
      locale?: string;
      namespace?: string;
      limit?: number;
    };
    if (!locale || !isSupportedLocale(locale)) {
      sendLocalizedError(req, res, "errors.validation");
      return;
    }
    if (!ALLOWED_NAMESPACES.has(namespace)) {
      sendLocalizedError(req, res, "errors.validation");
      return;
    }
    if (locale === "en") {
      res.json({ ok: true, added: 0, locale, namespace });
      return;
    }
    const key = `${locale}:${namespace}`;
    if (inFlight.has(key)) {
      res.status(409).json({ error: "errors.busy", message: req.t?.("errors.busy", { defaultValue: "Translation already running for this locale." }) });
      return;
    }
    inFlight.add(key);
    try {
      const enPath = join(I18N_LOCALES_DIR, "en", `${namespace}.json`);
      const tgtPath = join(I18N_LOCALES_DIR, locale, `${namespace}.json`);
      if (!existsSync(enPath)) {
        res.status(404).json({ error: "errors.notFound", message: "English bundle not found." });
        return;
      }
      const en = JSON.parse(readFileSync(enPath, "utf8")) as Record<string, unknown>;
      let target: Record<string, unknown> = {};
      if (existsSync(tgtPath)) {
        try {
          target = JSON.parse(readFileSync(tgtPath, "utf8")) as Record<string, unknown>;
        } catch {
          target = {};
        }
      }
      const missing = Object.keys(en).filter(
        (k) => k !== "_meta" && !(k in target),
      );
      const slice = missing.slice(0, Math.max(1, Math.min(200, Number(limit) || 60)));
      let added = 0;
      for (const k of slice) {
        const v = en[k];
        if (typeof v !== "string") {
          target[k] = v;
          continue;
        }
        const t = await translateOne(v, locale);
        if (t && t.trim() && t !== v) {
          target[k] = t;
          added++;
        }
        await new Promise((r) => setTimeout(r, 80));
      }
      writeFileSync(tgtPath, JSON.stringify(target, null, 2));
      invalidateBundle(locale);
      res.json({
        ok: true,
        locale,
        namespace,
        added,
        attempted: slice.length,
        remaining: Math.max(0, missing.length - slice.length),
      });
    } catch (e) {
      res.status(500).json({ error: "errors.internal", message: (e as Error).message });
    } finally {
      inFlight.delete(key);
    }
  },
);

router.get("/i18n/:locale", (req: Request, res: Response): void => {
  const locale = req.params.locale as string;
  if (!isSupportedLocale(locale)) {
    res.status(404).json({ error: "unsupported_locale" });
    return;
  }
  const bundle = loadServerBundle(locale) ?? {};
  res.json({
    locale,
    dir: LANG_BY_CODE[locale]?.dir ?? "ltr",
    name: LANG_BY_CODE[locale]?.name,
    nativeName: LANG_BY_CODE[locale]?.nativeName,
    translations: bundle,
  });
});

export default router;
