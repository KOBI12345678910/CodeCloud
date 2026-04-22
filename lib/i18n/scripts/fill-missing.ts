/**
 * Fills missing keys in hand-curated locale bundles using the MyMemory free
 * translation API. Hand bundles are *additively* updated: existing values are
 * never overwritten — only keys present in `en/<ns>.json` but missing from the
 * target locale are translated and inserted.
 *
 * Run: `pnpm --filter @workspace/i18n exec tsx scripts/fill-missing.ts`
 * Env: ONLY=es,fr,de  (default: all hand locales)
 *      EMAIL=you@example.com  (raises the free-tier daily quota)
 *      SLEEP_MS=120
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LANGUAGES, HAND_CODES } from "../src/registry/languages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "src", "locales");
const NAMESPACES = readdirSync(join(ROOT, "en")).map((f) => f.replace(/\.json$/, ""));
const EMAIL = process.env.EMAIL ?? "";
const SLEEP_MS = Number(process.env.SLEEP_MS ?? "120");
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const PLACEHOLDER_RE = /\{\{[^}]+\}\}|\{[^}]+\}/g;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function mask(s: string): { masked: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let i = 0;
  const masked = s.replace(PLACEHOLDER_RE, (m) => {
    const tok = `__P${i++}__`;
    map.set(tok, m);
    return tok;
  });
  return { masked, map };
}

function unmask(s: string, map: Map<string, string>): string {
  let out = s;
  for (const [tok, original] of map) out = out.split(tok).join(original);
  return out;
}

async function translate(text: string, target: string): Promise<string | null> {
  if (!text || !text.trim()) return text;
  const { masked, map } = mask(text);
  const params = new URLSearchParams({ q: masked, langpair: `en|${target}` });
  if (EMAIL) params.set("de", EMAIL);
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const t = data?.responseData?.translatedText;
    return typeof t === "string" ? unmask(t, map) : null;
  } catch {
    return null;
  }
}

let added = 0;
for (const lang of LANGUAGES) {
  if (!HAND_CODES.includes(lang.code)) continue;
  if (ONLY && !ONLY.has(lang.code)) continue;
  for (const ns of NAMESPACES) {
    const enPath = join(ROOT, "en", `${ns}.json`);
    const tgtPath = join(ROOT, lang.code, `${ns}.json`);
    let target: Record<string, unknown>;
    try {
      target = JSON.parse(readFileSync(tgtPath, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    const en = JSON.parse(readFileSync(enPath, "utf8")) as Record<string, unknown>;
    const missing = Object.keys(en).filter((k) => k !== "_meta" && !(k in target));
    if (missing.length === 0) continue;
    for (const key of missing) {
      const v = en[key];
      if (typeof v !== "string") {
        target[key] = v;
        continue;
      }
      const t = await translate(v, lang.code);
      target[key] = t && t.trim() ? t : v;
      added++;
      await sleep(SLEEP_MS);
    }
    writeFileSync(tgtPath, JSON.stringify(target, null, 2));
    console.log(`[${lang.code}/${ns}] +${missing.length} keys`);
  }
}
console.log(`Added ${added} translated keys total.`);
