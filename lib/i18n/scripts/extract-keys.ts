/**
 * Scans the codebase for `t("ns:key")` and `i18n.t("ns:key")` and reports
 * keys that are missing from `lib/i18n/src/locales/en/<ns>.json`.
 *
 * Run via: pnpm --filter @workspace/i18n run extract
 * Exits with code 1 when drift is detected (suitable for CI).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, resolve, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const LOCALES = resolve(__dirname, "..", "src", "locales", "en");

const SCAN_DIRS = [
  join(ROOT, "artifacts", "cloud-ide", "src"),
  join(ROOT, "artifacts", "api-server", "src"),
];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const KEY_RE = /\bt\(\s*["'`]([a-zA-Z0-9_.:-]+)["'`]/g;

const seen = new Set<string>();

function walk(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (SCAN_EXT.has(extname(full))) {
      const src = readFileSync(full, "utf8");
      let m: RegExpExecArray | null;
      while ((m = KEY_RE.exec(src))) seen.add(m[1]);
    }
  }
}

for (const d of SCAN_DIRS) walk(d);

const namespaces = new Map<string, Set<string>>();
for (const key of seen) {
  const [ns, ...rest] = key.includes(":") ? key.split(":") : ["common", key];
  const k = key.includes(":") ? rest.join(":") : key;
  if (!namespaces.has(ns)) namespaces.set(ns, new Set());
  namespaces.get(ns)!.add(k);
}

let drift = 0;
for (const [ns, keys] of namespaces) {
  const file = join(LOCALES, `${ns}.json`);
  if (!existsSync(file)) {
    console.warn(`MISSING NAMESPACE FILE: ${file}`);
    drift += keys.size;
    continue;
  }
  const have = new Set(Object.keys(JSON.parse(readFileSync(file, "utf8"))));
  const missing = [...keys].filter((k) => !have.has(k));
  if (missing.length) {
    console.log(`[${ns}] missing ${missing.length} keys:`);
    for (const k of missing) console.log(`  - ${k}`);
    drift += missing.length;
  }
}

console.log(`\nScanned ${seen.size} unique keys across ${namespaces.size} namespaces. Drift: ${drift}.`);
process.exit(drift ? 1 : 0);
