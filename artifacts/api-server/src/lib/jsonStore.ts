import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), ".local", "data");

async function ensureDir(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  await ensureDir();
  try {
    const raw = await fs.readFile(path.join(ROOT, `${name}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(name: string, value: T): Promise<void> {
  await ensureDir();
  const file = path.join(ROOT, `${name}.json`);
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export async function updateJson<T>(
  name: string,
  fallback: T,
  fn: (value: T) => T | Promise<T>,
): Promise<T> {
  const cur = await readJson<T>(name, fallback);
  const next = await fn(cur);
  await writeJson(name, next);
  return next;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
