/**
 * Generates machine-translation locale JSON files for the long tail using the
 * MyMemory free public translation API (no key required, ~5K chars/day per IP,
 * higher with email). Hand-curated locales are skipped.
 *
 * Run: `pnpm --filter @workspace/i18n run translate` (set FORCE=1 to overwrite).
 * Set EMAIL=you@example.com for the larger free quota.
 *
 * The script writes `_meta.machine = true` so the cloud-ide can show a
 * "machine translation" badge for the generated bundles.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LANGUAGES, HAND_CODES } from "../src/registry/languages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "src", "locales");
const NAMESPACES = readdirSync(join(ROOT, "en")).map((f) => f.replace(/\.json$/, ""));
const EMAIL = process.env.EMAIL ?? "";
const SLEEP_MS = Number(process.env.SLEEP_MS ?? "120");
const NETWORK = process.env.NETWORK !== "0";
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

function unmask(s: string, map: Map<string, string>): string {
  let out = s;
  for (const [tok, original] of map) out = out.split(tok).join(original);
  return out;
}

async function translate(text: string, target: string): Promise<string | null> {
  if (!NETWORK || !text || !text.trim()) return text;
  const { masked, map } = maskPlaceholders(text);
  const params = new URLSearchParams({ q: masked, langpair: `en|${target}` });
  if (EMAIL) params.set("de", EMAIL);
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== "string") return null;
    return unmask(translated, map);
  } catch {
    return null;
  }
}

let written = 0;
for (const lang of LANGUAGES) {
  if (HAND_CODES.includes(lang.code)) continue;
  if (ONLY && !ONLY.has(lang.code)) continue;
  const dir = join(ROOT, lang.code);
  mkdirSync(dir, { recursive: true });
  for (const ns of NAMESPACES) {
    const target = join(dir, `${ns}.json`);
    if (existsSync(target) && process.env.FORCE !== "1") continue;
    const src = JSON.parse(readFileSync(join(ROOT, "en", `${ns}.json`), "utf8")) as Record<string, unknown>;
    const out: Record<string, unknown> = {
      _meta: { machine: true, source: "en", engine: NETWORK ? "mymemory" : "copy", generated: new Date().toISOString() },
    };
    let translatedAny = false;
    for (const [k, v] of Object.entries(src)) {
      if (k === "_meta") continue;
      if (typeof v !== "string") {
        out[k] = v;
        continue;
      }
      const translated = await translate(v, lang.code);
      out[k] = translated && translated.trim() ? translated : v;
      if (translated && translated !== v) translatedAny = true;
      if (NETWORK) await sleep(SLEEP_MS);
    }
    writeFileSync(target, JSON.stringify(out, null, 2));
    written++;
    console.log(`[${lang.code}/${ns}] ${translatedAny ? "translated" : "fallback-copy"}`);
  }
}
console.log(`Wrote ${written} machine-translation files.`);
