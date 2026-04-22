#!/usr/bin/env node
/**
 * CI/dev smoke check: asserts that `pnpm dev` orchestrates EXACTLY the
 * canonical runtime services — web (cloud-ide), api (api-trpc), and
 * worker — and nothing else. This guards against accidental fan-out
 * across every workspace package which would create port collisions
 * and confuse local development.
 */
import { execSync } from "node:child_process";

const EXPECTED = [
  "@workspace/api-trpc#dev",
  "@workspace/cloud-ide#dev",
  "@workspace/worker#dev",
].sort();

let raw;
try {
  raw = execSync("pnpm -s dev:graph", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  console.error("dev:graph failed to execute");
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

const plan = JSON.parse(raw);
const got = plan.tasks.map((t) => t.taskId).sort();

const same =
  got.length === EXPECTED.length && got.every((v, i) => v === EXPECTED[i]);

if (!same) {
  console.error("`pnpm dev` task graph drift detected.");
  console.error("Expected:", EXPECTED);
  console.error("Got     :", got);
  process.exit(1);
}

console.log("OK — pnpm dev orchestrates:", got.join(", "));
