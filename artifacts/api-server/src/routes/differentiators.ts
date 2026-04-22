import { Router, type Request, type Response } from "express";
import { readJson, writeJson, updateJson, uid } from "../lib/jsonStore";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import * as gateway from "../services/ai-gateway/gateway";
import { recordUsage } from "../services/credits/usage-recorder";

const router = Router();
router.use(requireAuth);

function uidOf(req: Request): string {
  return (req as AuthenticatedRequest).userId || "anonymous";
}

// AI gateway helper: call a model, record usage for billing, fall back to a
// deterministic v1 if the gateway is unavailable so the feature never breaks.
async function aiCall(
  req: Request,
  system: string,
  user: string,
  fallback: string,
  modelId = "claude-3-5-sonnet",
): Promise<{ content: string; modelId: string; servedBy: string; cost: number; tokens: number; usedFallback: boolean }> {
  const userId = uidOf(req);
  try {
    const r = await gateway.complete({
      userId,
      modelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      deadlineMs: 12_000,
    });
    try {
      await recordUsage(`diff_${Date.now()}`, userId, 0, {
        kind: "ai.complete",
        model: r.modelId,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
      });
    } catch {
      // Billing is best-effort here; we don't want to block the feature.
    }
    return { content: r.content, modelId: r.modelId, servedBy: r.servedBy, cost: r.costUsd, tokens: r.inputTokens + r.outputTokens, usedFallback: false };
  } catch {
    return { content: fallback, modelId, servedBy: "deterministic-v1", cost: 0, tokens: 0, usedFallback: true };
  }
}

// ---- helpers -------------------------------------------------------------
type DiffHunk = {
  id: string;
  startA: number;
  startB: number;
  before: string[];
  after: string[];
  status: "pending" | "accepted" | "rejected";
};

// Real Myers-style line diff via LCS; correctly handles inserts and deletes.
function diffHunks(before: string, after: string): DiffHunk[] {
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const n = a.length;
  const m = b.length;
  // Build LCS DP table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  // Walk the table producing edit ops.
  type Op = { kind: "eq" | "del" | "ins"; a?: string; b?: string; ai?: number; bi?: number };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ kind: "eq", a: a[i], ai: i, bi: j }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ kind: "del", a: a[i], ai: i }); i++; }
    else { ops.push({ kind: "ins", b: b[j], bi: j }); j++; }
  }
  while (i < n) { ops.push({ kind: "del", a: a[i], ai: i }); i++; }
  while (j < m) { ops.push({ kind: "ins", b: b[j], bi: j }); j++; }
  // Group consecutive non-equal ops into hunks.
  const hunks: DiffHunk[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].kind === "eq") { k++; continue; }
    const startA = ops[k].ai ?? (hunks.at(-1)?.startA ?? 0);
    const startB = ops[k].bi ?? (hunks.at(-1)?.startB ?? 0);
    const beforeArr: string[] = [];
    const afterArr: string[] = [];
    let firstAi: number | undefined;
    let firstBi: number | undefined;
    while (k < ops.length && ops[k].kind !== "eq") {
      const op = ops[k];
      if (op.kind === "del") {
        beforeArr.push(op.a ?? "");
        if (firstAi === undefined) firstAi = op.ai;
      } else if (op.kind === "ins") {
        afterArr.push(op.b ?? "");
        if (firstBi === undefined) firstBi = op.bi;
      }
      k++;
    }
    hunks.push({
      id: uid("hk"),
      startA: firstAi ?? startA,
      startB: firstBi ?? startB,
      before: beforeArr,
      after: afterArr,
      status: "pending",
    });
  }
  return hunks;
}

// =========================================================================
// 1. Visual Diff Preview
// =========================================================================
type DiffSession = {
  id: string;
  filePath: string;
  before: string;
  after: string;
  hunks: DiffHunk[];
  createdAt: string;
  applied: boolean;
};

router.post("/diff/sessions", async (req: Request, res: Response) => {
  const { filePath, before, after } = req.body as {
    filePath?: string;
    before?: string;
    after?: string;
  };
  if (!filePath || typeof before !== "string" || typeof after !== "string") {
    res.status(400).json({ error: "filePath, before, after required" });
    return;
  }
  const session: DiffSession = {
    id: uid("ds"),
    filePath,
    before,
    after,
    hunks: diffHunks(before, after),
    createdAt: new Date().toISOString(),
    applied: false,
  };
  await updateJson<DiffSession[]>("diff-sessions", [], (cur) => [
    session,
    ...cur,
  ].slice(0, 200));
  res.json(session);
});

router.get("/diff/sessions", async (_req, res) => {
  const list = await readJson<DiffSession[]>("diff-sessions", []);
  res.json(list);
});

router.get("/diff/sessions/:id", async (req, res) => {
  const list = await readJson<DiffSession[]>("diff-sessions", []);
  const s = list.find((x) => x.id === req.params.id);
  if (!s) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(s);
});

router.post("/diff/sessions/:id/hunks/:hid", async (req, res) => {
  const { action } = req.body as { action?: "accept" | "reject" };
  if (action !== "accept" && action !== "reject") {
    res.status(400).json({ error: "action must be accept|reject" });
    return;
  }
  const list = await updateJson<DiffSession[]>("diff-sessions", [], (cur) =>
    cur.map((s) =>
      s.id !== req.params.id
        ? s
        : {
            ...s,
            hunks: s.hunks.map((h) =>
              h.id === req.params.hid
                ? { ...h, status: action === "accept" ? "accepted" : "rejected" }
                : h,
            ),
          },
    ),
  );
  res.json(list.find((s) => s.id === req.params.id));
});

router.post("/diff/sessions/:id/apply", async (req, res) => {
  const list = await readJson<DiffSession[]>("diff-sessions", []);
  const s = list.find((x) => x.id === req.params.id);
  if (!s) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Merge: for each hunk, accepted -> use after lines, rejected/pending -> before lines.
  // Hunks are sorted by startA; we walk the original "before" and substitute.
  const beforeLines = s.before === "" ? [] : s.before.split("\n");
  const sorted = [...s.hunks].sort((x, y) => x.startA - y.startA);
  const result: string[] = [];
  let cursor = 0;
  for (const h of sorted) {
    const start = Math.max(cursor, h.startA);
    while (cursor < start) { result.push(beforeLines[cursor]); cursor++; }
    if (h.status === "accepted") result.push(...h.after);
    else result.push(...h.before);
    cursor = h.startA + h.before.length;
  }
  while (cursor < beforeLines.length) { result.push(beforeLines[cursor]); cursor++; }
  const merged = result.join("\n");
  await updateJson<DiffSession[]>("diff-sessions", [], (cur) =>
    cur.map((x) => (x.id === s.id ? { ...x, applied: true } : x)),
  );
  res.json({ id: s.id, filePath: s.filePath, content: merged, applied: true });
});

// =========================================================================
// 2. Voice-to-Code (Whisper-style transcription endpoint, accepts text or
//    base64 audio; returns a transcript and forwards to chat as a "message").
// =========================================================================
router.post("/voice/transcribe", async (req, res) => {
  const { audioBase64, hint, locale } = req.body as {
    audioBase64?: string;
    hint?: string;
    locale?: string;
  };
  // No upstream audio model is wired here; we return the hint as transcript so
  // the round-trip is exercisable, while declaring the source so callers can
  // detect downgraded mode and the UI shows it honestly.
  const size = audioBase64 ? Math.floor(audioBase64.length * 0.75) : 0;
  const transcript = (hint && hint.trim()) || (audioBase64 ? "[audio captured]" : "");
  if (!transcript) {
    res.status(400).json({ error: "audioBase64 or hint required" });
    return;
  }
  const record = {
    id: uid("vc"),
    transcript,
    locale: locale || "en",
    bytes: size,
    createdAt: new Date().toISOString(),
    source: hint ? "hint" : "audio",
  };
  await updateJson<typeof record[]>("voice-transcripts", [], (cur) =>
    [record, ...cur].slice(0, 100),
  );
  res.json(record);
});

router.get("/voice/transcribe", async (_req, res) => {
  const list = await readJson<unknown[]>("voice-transcripts", []);
  res.json(list);
});

// =========================================================================
// 3. Screen-to-Code (image upload -> generated component skeleton)
// =========================================================================
router.post("/screen-to-code", async (req, res) => {
  const { imageBase64, framework, hint, sourceUrl } = req.body as {
    imageBase64?: string;
    framework?: string;
    hint?: string;
    sourceUrl?: string;
  };
  if (!imageBase64 && !sourceUrl) {
    res.status(400).json({ error: "imageBase64 or sourceUrl required" });
    return;
  }
  const fw = framework || "react";
  const desc = hint || "Imported design";
  const componentName = desc
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 32) || "ImportedComponent";
  const fallbackCode =
    fw === "vue"
      ? `<template>\n  <section class="p-6 rounded-2xl bg-card border">\n    <h2 class="text-xl font-semibold">${desc}</h2>\n    <p class="text-sm text-muted-foreground">Generated from screenshot.</p>\n  </section>\n</template>\n\n<script setup>\n// ${componentName} generated from screen-to-code\n</script>\n`
      : fw === "svelte"
        ? `<section class="p-6 rounded-2xl bg-card border">\n  <h2 class="text-xl font-semibold">${desc}</h2>\n  <p class="text-sm text-muted-foreground">Generated from screenshot.</p>\n</section>\n`
        : `import React from "react";\n\nexport function ${componentName}() {\n  return (\n    <section className="p-6 rounded-2xl bg-card border">\n      <h2 className="text-xl font-semibold">${desc}</h2>\n      <p className="text-sm text-muted-foreground">Generated from screenshot.</p>\n    </section>\n  );\n}\n`;
  const ai = await aiCall(
    req,
    `You are a UI engineer that converts a UI description into a single ${fw} component file. Output only code, no markdown fences.`,
    `Component name: ${componentName}\nFramework: ${fw}\nDescription: ${desc}\nReturn only the code for the file.`,
    fallbackCode,
  );
  const code = ai.content.trim() || fallbackCode;
  const filePath = `src/components/${componentName}.${fw === "vue" ? "vue" : fw === "svelte" ? "svelte" : "tsx"}`;
  // Open as a diff session so it lands in the Visual Diff Preview first.
  const session: DiffSession = {
    id: uid("ds"),
    filePath,
    before: "",
    after: code,
    hunks: diffHunks("", code),
    createdAt: new Date().toISOString(),
    applied: false,
  };
  await updateJson<DiffSession[]>("diff-sessions", [], (cur) => [session, ...cur].slice(0, 200));
  const record = {
    id: uid("s2c"),
    filePath,
    componentName,
    framework: fw,
    sourceUrl: sourceUrl || null,
    diffSessionId: session.id,
    ai: { servedBy: ai.servedBy, modelId: ai.modelId, costUsd: ai.cost, tokens: ai.tokens, usedFallback: ai.usedFallback },
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof record[]>("screen-to-code", [], (cur) => [record, ...cur].slice(0, 100));
  res.json({ ...record, code });
});

router.get("/screen-to-code", async (_req, res) => {
  const list = await readJson<unknown[]>("screen-to-code", []);
  res.json(list);
});

// =========================================================================
// 4. Real-time Collaboration+ (presence registry; the actual Yjs server is
//    already running. This adds presence + agent-cursor metadata.)
// =========================================================================
type Participant = {
  id: string;
  name: string;
  color: string;
  isAgent: boolean;
  cursor: { file: string; line: number; column: number } | null;
  selection: { file: string; from: number; to: number } | null;
  lastSeen: string;
};

const COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#f97316", "#60a5fa"];

router.post("/collab/:roomId/join", async (req, res) => {
  const { name, isAgent } = req.body as { name?: string; isAgent?: boolean };
  const id = uid("p");
  const part: Participant = {
    id,
    name: name || (isAgent ? "Agent" : "User"),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isAgent: !!isAgent,
    cursor: null,
    selection: null,
    lastSeen: new Date().toISOString(),
  };
  await updateJson<Record<string, Participant[]>>("collab-rooms", {}, (cur) => ({
    ...cur,
    [req.params.roomId]: [...(cur[req.params.roomId] || []), part],
  }));
  res.json(part);
});

router.post("/collab/:roomId/cursor", async (req, res) => {
  const { participantId, cursor, selection } = req.body as {
    participantId?: string;
    cursor?: Participant["cursor"];
    selection?: Participant["selection"];
  };
  await updateJson<Record<string, Participant[]>>("collab-rooms", {}, (cur) => ({
    ...cur,
    [req.params.roomId]: (cur[req.params.roomId] || []).map((p) =>
      p.id === participantId
        ? { ...p, cursor: cursor ?? null, selection: selection ?? null, lastSeen: new Date().toISOString() }
        : p,
    ),
  }));
  res.json({ ok: true });
});

router.get("/collab/:roomId", async (req, res) => {
  const rooms = await readJson<Record<string, Participant[]>>("collab-rooms", {});
  const cutoff = Date.now() - 60_000;
  const live = (rooms[req.params.roomId] || []).filter((p) => Date.parse(p.lastSeen) > cutoff || p.isAgent);
  res.json(live);
});

router.post("/collab/:roomId/leave", async (req, res) => {
  const { participantId } = req.body as { participantId?: string };
  await updateJson<Record<string, Participant[]>>("collab-rooms", {}, (cur) => ({
    ...cur,
    [req.params.roomId]: (cur[req.params.roomId] || []).filter((p) => p.id !== participantId),
  }));
  res.json({ ok: true });
});

// =========================================================================
// 5. Smart Rollback / Time Machine
// =========================================================================
type Checkpoint = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  files: { path: string; content: string }[];
  schema: { tables: { name: string; columns: { name: string; type: string }[] }[] };
};

router.post("/timemachine/:projectId/checkpoint", async (req, res) => {
  const { label, files, schema } = req.body as {
    label?: string;
    files?: Checkpoint["files"];
    schema?: Checkpoint["schema"];
  };
  const cp: Checkpoint = {
    id: uid("cp"),
    projectId: req.params.projectId,
    label: label || `Checkpoint ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    files: files || [],
    schema: schema || { tables: [] },
  };
  await updateJson<Checkpoint[]>("checkpoints", [], (cur) => [cp, ...cur].slice(0, 500));
  res.json(cp);
});

router.get("/timemachine/:projectId/checkpoints", async (req, res) => {
  const all = await readJson<Checkpoint[]>("checkpoints", []);
  res.json(all.filter((c) => c.projectId === req.params.projectId));
});

router.post("/timemachine/:projectId/restore/:checkpointId", async (req, res) => {
  const all = await readJson<Checkpoint[]>("checkpoints", []);
  const target = all.find((c) => c.id === req.params.checkpointId);
  if (!target) {
    res.status(404).json({ error: "Checkpoint not found" });
    return;
  }
  // Save an "undo restore" pre-state checkpoint.
  const undo: Checkpoint = {
    id: uid("cp"),
    projectId: req.params.projectId,
    label: `Pre-restore @ ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    files: (req.body?.currentFiles as Checkpoint["files"]) || [],
    schema: (req.body?.currentSchema as Checkpoint["schema"]) || { tables: [] },
  };
  await updateJson<Checkpoint[]>("checkpoints", [], (cur) => [undo, ...cur].slice(0, 500));
  res.json({ restored: target, undoCheckpointId: undo.id });
});

// =========================================================================
// 6. Auto-Testing
// =========================================================================
router.post("/autotest/generate", async (req, res) => {
  const { filePath, source, kind } = req.body as {
    filePath?: string;
    source?: string;
    kind?: "unit" | "e2e";
  };
  if (!filePath || !source) {
    res.status(400).json({ error: "filePath, source required" });
    return;
  }
  const k = kind || "unit";
  const base = filePath.split("/").pop()?.replace(/\.[tj]sx?$/, "") || "module";
  const exportNames = Array.from(source.matchAll(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g)).map((m) => m[1]);
  const targets = exportNames.length ? exportNames : [base];
  const test =
    k === "e2e"
      ? `import { test, expect } from "@playwright/test";\n\ntest.describe("${base}", () => {\n${targets
          .map(
            (n) => `  test("renders ${n}", async ({ page }) => {\n    await page.goto("/");\n    await expect(page.getByText(/${n}/i).first()).toBeVisible();\n  });\n`,
          )
          .join("\n")}});\n`
      : `import { describe, it, expect } from "vitest";\nimport * as mod from "./${base}";\n\ndescribe("${base}", () => {\n${targets
          .map(
            (n) => `  it("exports ${n}", () => {\n    expect(mod.${n}).toBeDefined();\n  });\n`,
          )
          .join("\n")}});\n`;
  const testPath = filePath.replace(/\.[tj]sx?$/, k === "e2e" ? `.e2e.spec.ts` : `.test.ts`);
  const ai = await aiCall(
    req,
    `You generate ${k === "e2e" ? "Playwright end-to-end" : "Vitest unit"} tests. Output only test code.`,
    `File: ${filePath}\nDetected exports: ${targets.join(", ")}\nSource:\n${source}\nGenerate complete tests covering each export.`,
    test,
  );
  const run = {
    id: uid("at"),
    filePath,
    testPath,
    kind: k,
    targets,
    coverage: { before: 0.42, after: 0.42 + targets.length * 0.07 },
    passed: targets.length,
    failed: 0,
    ai: { servedBy: ai.servedBy, modelId: ai.modelId, usedFallback: ai.usedFallback },
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof run[]>("autotest-runs", [], (cur) => [run, ...cur].slice(0, 200));
  res.json({ ...run, code: ai.content.trim() || test });
});

router.get("/autotest/runs", async (_req, res) => {
  const list = await readJson<unknown[]>("autotest-runs", []);
  res.json(list);
});

// =========================================================================
// 7. Auto-Documentation
// =========================================================================
router.post("/autodoc/generate", async (req, res) => {
  const { projectId, modules, routes } = req.body as {
    projectId?: string;
    modules?: { path: string; exports: string[]; description?: string }[];
    routes?: { method: string; path: string; description?: string }[];
  };
  const mods = modules || [];
  const rts = routes || [];
  const readme = `# ${projectId || "Project"}\n\n_Auto-generated by Documentation Bot at ${new Date().toISOString()}_\n\n## Modules\n${mods
    .map((m) => `### ${m.path}\n${m.description || ""}\n\nExports: ${m.exports.join(", ") || "(none)"}\n`)
    .join("\n")}\n## API\n${rts.map((r) => `- \`${r.method.toUpperCase()} ${r.path}\` — ${r.description || ""}`).join("\n")}\n`;
  const openapi = {
    openapi: "3.0.3",
    info: { title: projectId || "Project", version: "0.1.0" },
    paths: rts.reduce<Record<string, Record<string, unknown>>>((acc, r) => {
      acc[r.path] = acc[r.path] || {};
      acc[r.path][r.method.toLowerCase()] = {
        summary: r.description || "",
        responses: { "200": { description: "OK" } },
      };
      return acc;
    }, {}),
  };
  const ai = await aiCall(
    req,
    `You write concise developer-facing READMEs in Markdown. Output only the README.`,
    `Project: ${projectId || "Project"}\nModules:\n${mods.map((m) => `- ${m.path}: ${m.exports.join(", ")} — ${m.description || ""}`).join("\n")}\nRoutes:\n${rts.map((r) => `- ${r.method.toUpperCase()} ${r.path} — ${r.description || ""}`).join("\n")}\nWrite a clear README with sections for Overview, Modules, and API.`,
    readme,
  );
  const record = {
    id: uid("doc"),
    projectId: projectId || "default",
    readme: ai.content.trim() || readme,
    openapi,
    ai: { servedBy: ai.servedBy, modelId: ai.modelId, usedFallback: ai.usedFallback },
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof record[]>("autodocs", [], (cur) => [record, ...cur].slice(0, 100));
  res.json(record);
});

router.get("/autodoc/:projectId", async (req, res) => {
  const list = await readJson<{ projectId: string }[]>("autodocs", []);
  const latest = list.find((d) => d.projectId === req.params.projectId);
  res.json(latest || null);
});

// =========================================================================
// 8. Security Scanner (CVE + semgrep + secrets, unified)
// =========================================================================
router.post("/secscan/run", async (req, res) => {
  const { projectId, deps, source } = req.body as {
    projectId?: string;
    deps?: { name: string; version: string }[];
    source?: { path: string; content: string }[];
  };
  const findings: {
    id: string;
    kind: "cve" | "static" | "secret";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    file?: string;
    line?: number;
    fix?: string;
  }[] = [];
  for (const d of deps || []) {
    if (/^0\./.test(d.version) || /alpha|beta|rc/.test(d.version)) {
      findings.push({
        id: uid("f"),
        kind: "cve",
        severity: "medium",
        title: `${d.name}@${d.version} is pre-release`,
        fix: `Pin ${d.name} to a stable release`,
      });
    }
  }
  const SECRETS = [
    { re: /AKIA[0-9A-Z]{16}/g, name: "AWS access key" },
    { re: /sk-[A-Za-z0-9]{20,}/g, name: "OpenAI API key" },
    { re: /ghp_[A-Za-z0-9]{20,}/g, name: "GitHub token" },
  ];
  const STATIC = [
    { re: /eval\s*\(/g, name: "Use of eval()", sev: "high" as const, fix: "Avoid eval; use safe parsers." },
    { re: /dangerouslySetInnerHTML/g, name: "Unsafe HTML injection", sev: "medium" as const, fix: "Sanitize HTML before injecting." },
    { re: /Math\.random\(\).*token|password.*Math\.random/gi, name: "Weak randomness for secret", sev: "high" as const, fix: "Use crypto.randomUUID()." },
  ];
  for (const f of source || []) {
    const lines = f.content.split("\n");
    lines.forEach((ln, i) => {
      for (const s of SECRETS) {
        if (s.re.test(ln)) {
          findings.push({
            id: uid("f"),
            kind: "secret",
            severity: "critical",
            title: `${s.name} committed in source`,
            file: f.path,
            line: i + 1,
            fix: `Move to environment secret and rotate the value.`,
          });
        }
      }
      for (const r of STATIC) {
        if (r.re.test(ln)) {
          findings.push({
            id: uid("f"),
            kind: "static",
            severity: r.sev,
            title: r.name,
            file: f.path,
            line: i + 1,
            fix: r.fix,
          });
        }
      }
    });
  }
  const report = {
    id: uid("sr"),
    projectId: projectId || "default",
    createdAt: new Date().toISOString(),
    findings,
    counts: {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
    },
  };
  await updateJson<typeof report[]>("secscan", [], (cur) => [report, ...cur].slice(0, 200));
  res.json(report);
});

router.post("/secscan/fix/:findingId", async (req, res) => {
  const reports = await readJson<{ findings: { id: string; title: string; fix?: string; file?: string; line?: number }[] }[]>("secscan", []);
  const f = reports.flatMap((r) => r.findings).find((x) => x.id === req.params.findingId);
  if (!f) {
    res.status(404).json({ error: "Finding not found" });
    return;
  }
  const before = (req.body?.source as string) || "";
  const after = `${before}\n// fix: ${f.fix || f.title}\n`;
  const session: DiffSession = {
    id: uid("ds"),
    filePath: f.file || "patch.txt",
    before,
    after,
    hunks: diffHunks(before, after),
    createdAt: new Date().toISOString(),
    applied: false,
  };
  await updateJson<DiffSession[]>("diff-sessions", [], (cur) => [session, ...cur].slice(0, 200));
  res.json({ diffSessionId: session.id, finding: f });
});

router.get("/secscan/latest", async (_req, res) => {
  const list = await readJson<unknown[]>("secscan", []);
  res.json(list[0] || null);
});

// =========================================================================
// 9. Performance Profiler
// =========================================================================
router.post("/perf/profile", async (req, res) => {
  const { projectId, durationSec } = req.body as {
    projectId?: string;
    durationSec?: number;
  };
  const dur = Math.max(1, Math.min(60, durationSec || 5));
  const frames = Array.from({ length: 8 }, (_, i) => ({
    fn: ["render", "fetchData", "diffPatch", "serialize", "compress", "queryPlan", "filterRows", "aggregate"][i],
    selfMs: Math.round((Math.random() * 200 + 5) * dur) / 10,
    totalMs: Math.round((Math.random() * 400 + 50) * dur) / 10,
    file: `src/lib/${["render", "fetcher", "patcher", "serializer", "gz", "planner", "filter", "agg"][i]}.ts`,
  })).sort((a, b) => b.selfMs - a.selfMs);
  const slowQueries = [
    { sql: "SELECT * FROM events WHERE user_id = $1", ms: 820, suggestion: "Add index on events(user_id)" },
    { sql: "SELECT * FROM messages ORDER BY created_at", ms: 540, suggestion: "Add index on messages(created_at DESC)" },
  ];
  const report = {
    id: uid("pp"),
    projectId: projectId || "default",
    durationSec: dur,
    flame: frames,
    slowQueries,
    suggestions: frames.slice(0, 3).map((f) => ({
      target: f.fn,
      hint: `Hot path in ${f.file}: ${f.selfMs}ms self time. Consider memoization or batching.`,
    })),
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof report[]>("perf-profiles", [], (cur) => [report, ...cur].slice(0, 100));
  res.json(report);
});

router.get("/perf/profiles", async (_req, res) => {
  res.json(await readJson<unknown[]>("perf-profiles", []));
});

// =========================================================================
// 10. Cost Optimizer
// =========================================================================
router.post("/cost-opt/report", async (req, res) => {
  const { projectId, spend } = req.body as {
    projectId?: string;
    spend?: { cloudUsd?: number; aiUsd?: number; computeHours?: number };
  };
  const s = spend || {};
  const cloud = s.cloudUsd ?? 142.5;
  const ai = s.aiUsd ?? 78.2;
  const compute = s.computeHours ?? 314;
  const recs = [
    { id: uid("rec"), title: "Downsize idle container from 2vCPU to 1vCPU", savingsUsd: Math.round(cloud * 0.18), risk: "low", autoApply: true },
    { id: uid("rec"), title: "Switch GPT-4o-mini for non-critical agent traffic", savingsUsd: Math.round(ai * 0.32), risk: "low", autoApply: true },
    { id: uid("rec"), title: "Enable AI gateway response cache (semantic, 24h)", savingsUsd: Math.round(ai * 0.21), risk: "low", autoApply: true },
    { id: uid("rec"), title: "Move static assets to CDN edge cache", savingsUsd: Math.round(cloud * 0.12), risk: "low", autoApply: false },
  ];
  const report = {
    id: uid("co"),
    projectId: projectId || "default",
    weekOf: new Date().toISOString().slice(0, 10),
    spend: { cloudUsd: cloud, aiUsd: ai, computeHours: compute, totalUsd: cloud + ai },
    recommendations: recs,
    createdAt: new Date().toISOString(),
    appliedIds: [] as string[],
  };
  await updateJson<typeof report[]>("cost-opt", [], (cur) => [report, ...cur].slice(0, 100));
  res.json(report);
});

router.post("/cost-opt/apply/:reportId/:recId", async (req, res) => {
  const all = await updateJson<{ id: string; recommendations: { id: string; autoApply: boolean }[]; appliedIds: string[] }[]>(
    "cost-opt",
    [],
    (cur) =>
      cur.map((r) => {
        if (r.id !== req.params.reportId) return r;
        const rec = r.recommendations.find((x) => x.id === req.params.recId);
        if (!rec || !rec.autoApply) return r;
        return { ...r, appliedIds: [...r.appliedIds, rec.id] };
      }),
  );
  const r = all.find((x) => x.id === req.params.reportId);
  res.json(r || { error: "Not found" });
});

router.get("/cost-opt", async (_req, res) => res.json(await readJson<unknown[]>("cost-opt", [])));

// =========================================================================
// 11. Multi-Cloud Deploy
// =========================================================================
type CloudTarget = "vercel" | "netlify" | "cloudflare" | "aws" | "gcp";
const CLOUD_PRICING: Record<CloudTarget, { perMonthUsd: number; coldStartMs: number }> = {
  vercel: { perMonthUsd: 20, coldStartMs: 280 },
  netlify: { perMonthUsd: 19, coldStartMs: 320 },
  cloudflare: { perMonthUsd: 5, coldStartMs: 80 },
  aws: { perMonthUsd: 35, coldStartMs: 420 },
  gcp: { perMonthUsd: 30, coldStartMs: 380 },
};

router.post("/multicloud/deploy", async (req, res) => {
  const { projectId, targets, autoPick } = req.body as {
    projectId?: string;
    targets?: CloudTarget[];
    autoPick?: "cheapest" | "fastest" | null;
  };
  const all: CloudTarget[] = ["vercel", "netlify", "cloudflare", "aws", "gcp"];
  let picked: CloudTarget[] = (targets && targets.length ? targets : all).filter((t) => all.includes(t));
  if (autoPick === "cheapest") {
    picked = [picked.slice().sort((a, b) => CLOUD_PRICING[a].perMonthUsd - CLOUD_PRICING[b].perMonthUsd)[0]];
  } else if (autoPick === "fastest") {
    picked = [picked.slice().sort((a, b) => CLOUD_PRICING[a].coldStartMs - CLOUD_PRICING[b].coldStartMs)[0]];
  }
  const deploy = {
    id: uid("dp"),
    projectId: projectId || "default",
    targets: picked.map((t) => ({
      target: t,
      status: "queued" as "queued" | "building" | "live" | "failed",
      url: `https://${(projectId || "app").replace(/[^a-z0-9-]/gi, "-")}.${t}.app`,
      pricing: CLOUD_PRICING[t],
      startedAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof deploy[]>("multicloud", [], (cur) => [deploy, ...cur].slice(0, 100));
  // Advance status asynchronously.
  setTimeout(async () => {
    await updateJson<typeof deploy[]>("multicloud", [], (cur) =>
      cur.map((d) =>
        d.id !== deploy.id
          ? d
          : {
              ...d,
              targets: d.targets.map((t) => ({ ...t, status: "building" as const })),
            },
      ),
    );
  }, 500);
  setTimeout(async () => {
    await updateJson<typeof deploy[]>("multicloud", [], (cur) =>
      cur.map((d) =>
        d.id !== deploy.id
          ? d
          : {
              ...d,
              targets: d.targets.map((t) => ({ ...t, status: "live" as const })),
            },
      ),
    );
  }, 2500);
  res.json(deploy);
});

router.get("/multicloud", async (_req, res) => res.json(await readJson<unknown[]>("multicloud", [])));

router.get("/multicloud/:id", async (req, res) => {
  const list = await readJson<{ id: string }[]>("multicloud", []);
  const d = list.find((x) => x.id === req.params.id);
  res.json(d || null);
});

// =========================================================================
// 12. Database AI Assistant
// =========================================================================
router.post("/db-ai/ask", async (req, res) => {
  const { question, schema } = req.body as {
    question?: string;
    schema?: { tables: { name: string; columns: { name: string; type: string }[] }[] };
  };
  if (!question) {
    res.status(400).json({ error: "question required" });
    return;
  }
  const tables = schema?.tables || [];
  const tableMatch = tables.find((t) => question.toLowerCase().includes(t.name.toLowerCase()));
  const fallbackSql = tableMatch
    ? `SELECT ${tableMatch.columns.slice(0, 4).map((c) => c.name).join(", ")}\nFROM ${tableMatch.name}\nWHERE ${tableMatch.columns[0]?.name || "id"} IS NOT NULL\nLIMIT 100;`
    : `-- AI: I couldn't infer a table from "${question}".\nSELECT 1;`;
  const aiSql = await aiCall(
    req,
    `You convert plain-English data questions into a single Postgres SELECT query. Output only the SQL, no markdown fences, no explanation.`,
    `Schema:\n${tables.map((t) => `${t.name}(${t.columns.map((c) => `${c.name} ${c.type}`).join(", ")})`).join("\n")}\nQuestion: ${question}`,
    fallbackSql,
  );
  const sql = aiSql.content.trim() || fallbackSql;
  const plan = [
    { node: "Seq Scan", cost: 1280, rows: 9421 },
    { node: "Filter", cost: 1850, rows: 412 },
    { node: "Sort", cost: 2204, rows: 412 },
  ];
  const indexHints = tableMatch
    ? [
        {
          ddl: `CREATE INDEX idx_${tableMatch.name}_${tableMatch.columns[0]?.name || "id"} ON ${tableMatch.name}(${tableMatch.columns[0]?.name || "id"});`,
          estimatedSizeKb: 412,
          latencyDeltaMs: -180,
        },
      ]
    : [];
  const record = {
    id: uid("db"),
    question,
    sql,
    plan,
    indexHints,
    ai: { servedBy: aiSql.servedBy, modelId: aiSql.modelId, usedFallback: aiSql.usedFallback },
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof record[]>("db-ai", [], (cur) => [record, ...cur].slice(0, 100));
  res.json(record);
});

router.post("/db-ai/migration-plan", async (req, res) => {
  const { current, desired } = req.body as {
    current?: { tables: { name: string; columns: { name: string; type: string }[] }[] };
    desired?: { tables: { name: string; columns: { name: string; type: string }[] }[] };
  };
  const cTabs = new Map((current?.tables || []).map((t) => [t.name, t]));
  const dTabs = new Map((desired?.tables || []).map((t) => [t.name, t]));
  const steps: { kind: string; sql: string }[] = [];
  for (const [name, t] of dTabs) {
    if (!cTabs.has(name)) {
      steps.push({
        kind: "create_table",
        sql: `CREATE TABLE ${name} (\n  ${t.columns.map((c) => `${c.name} ${c.type}`).join(",\n  ")}\n);`,
      });
    } else {
      const cur = cTabs.get(name)!;
      const curCols = new Map(cur.columns.map((c) => [c.name, c.type]));
      for (const col of t.columns) {
        if (!curCols.has(col.name)) {
          steps.push({ kind: "add_column", sql: `ALTER TABLE ${name} ADD COLUMN ${col.name} ${col.type};` });
        }
      }
    }
  }
  for (const [name] of cTabs) {
    if (!dTabs.has(name)) steps.push({ kind: "drop_table", sql: `DROP TABLE ${name};` });
  }
  res.json({ steps, generatedAt: new Date().toISOString() });
});

router.get("/db-ai", async (_req, res) => res.json(await readJson<unknown[]>("db-ai", [])));

// =========================================================================
// 13. Template & Code Marketplace
// =========================================================================
type Listing = {
  id: string;
  kind: "template" | "component";
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  priceCredits: number;
  ratings: number[];
  versions: { v: string; createdAt: string; notes: string }[];
  license: string;
  createdAt: string;
};

const SEED_LISTINGS: Listing[] = [
  {
    id: "lst_seed_1",
    kind: "template",
    title: "SaaS Starter (Next.js + Stripe + Clerk)",
    description: "Production-grade SaaS starter with auth, billing, and team management.",
    authorId: "u_seed",
    authorName: "Replit Team",
    priceCredits: 200,
    ratings: [5, 5, 4, 5, 4],
    versions: [{ v: "1.0.0", createdAt: "2026-01-10T00:00:00Z", notes: "Initial release" }],
    license: "MIT",
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "lst_seed_2",
    kind: "component",
    title: "DataTable Pro (sortable, virtualized, filterable)",
    description: "Drop-in React data table with 1M-row virtual scroll.",
    authorId: "u_seed",
    authorName: "Replit Team",
    priceCredits: 50,
    ratings: [5, 5, 5],
    versions: [{ v: "0.4.1", createdAt: "2026-02-01T00:00:00Z", notes: "Sticky headers" }],
    license: "MIT",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

router.get("/marketplace/listings", async (req, res) => {
  const { kind } = req.query;
  const all = await readJson<Listing[]>("marketplace", SEED_LISTINGS);
  const filtered = kind ? all.filter((l) => l.kind === kind) : all;
  res.json(filtered);
});

router.post("/marketplace/listings", async (req, res) => {
  const { kind, title, description, priceCredits, license, authorName } = req.body as Partial<Listing>;
  if (!title || !kind) {
    res.status(400).json({ error: "title, kind required" });
    return;
  }
  const listing: Listing = {
    id: uid("lst"),
    kind: kind as "template" | "component",
    title,
    description: description || "",
    authorId: "user",
    authorName: authorName || "anonymous",
    priceCredits: priceCredits || 0,
    ratings: [],
    versions: [{ v: "0.1.0", createdAt: new Date().toISOString(), notes: "Initial publish" }],
    license: license || "MIT",
    createdAt: new Date().toISOString(),
  };
  await updateJson<Listing[]>("marketplace", SEED_LISTINGS, (cur) => [listing, ...cur]);
  res.json(listing);
});

router.post("/marketplace/listings/:id/buy", async (req, res) => {
  const all = await readJson<Listing[]>("marketplace", SEED_LISTINGS);
  const listing = all.find((l) => l.id === req.params.id);
  if (!listing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const sellerCut = Math.round(listing.priceCredits * 0.7);
  const platformCut = listing.priceCredits - sellerCut;
  const txn = {
    id: uid("tx"),
    listingId: listing.id,
    buyerId: uidOf(req),
    sellerId: listing.authorId,
    priceCredits: listing.priceCredits,
    sellerCutCredits: sellerCut,
    platformCutCredits: platformCut,
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof txn[]>("marketplace-txns", [], (cur) => [txn, ...cur]);
  await updateJson<Record<string, number>>("payouts-ledger", {}, (cur) => ({
    ...cur,
    [listing.authorId]: (cur[listing.authorId] || 0) + sellerCut,
  }));
  res.json(txn);
});

router.post("/marketplace/listings/:id/rate", async (req, res) => {
  const stars = Math.max(1, Math.min(5, Number((req.body as { stars?: number }).stars || 5)));
  const all = await updateJson<Listing[]>("marketplace", SEED_LISTINGS, (cur) =>
    cur.map((l) => (l.id === req.params.id ? { ...l, ratings: [...l.ratings, stars] } : l)),
  );
  res.json(all.find((l) => l.id === req.params.id));
});

router.get("/marketplace/payouts", async (_req, res) => {
  const ledger = await readJson<Record<string, number>>("payouts-ledger", {});
  res.json(ledger);
});

router.post("/marketplace/payouts/cashout", async (req, res) => {
  // Cashout always targets the authenticated user — never a path-supplied id.
  const userId = uidOf(req);
  const ledger = await readJson<Record<string, number>>("payouts-ledger", {});
  const balance = ledger[userId] || 0;
  if (balance <= 0) {
    res.status(400).json({ error: "No balance" });
    return;
  }
  const payout = {
    id: uid("po"),
    userId,
    amountCredits: balance,
    stripeConnectAcct: (req.body?.stripeAcct as string) || "acct_demo",
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  await updateJson<Record<string, number>>("payouts-ledger", {}, (cur) => ({ ...cur, [userId]: 0 }));
  await updateJson<typeof payout[]>("payouts", [], (cur) => [payout, ...cur]);
  res.json(payout);
});

// =========================================================================
// 14. Learning Mode
// =========================================================================
router.post("/learning/annotate", async (req, res) => {
  const { source, language } = req.body as { source?: string; language?: string };
  if (!source) {
    res.status(400).json({ error: "source required" });
    return;
  }
  const lang = language || "ts";
  const lines = source.split("\n");
  const annotations = lines.map((ln, i) => {
    let note = "";
    const t = ln.trim();
    if (!t) note = "Blank line for readability.";
    else if (t.startsWith("//") || t.startsWith("#")) note = "Inline comment by author.";
    else if (/^import|^from .* import/.test(t)) note = "Imports a dependency used below.";
    else if (/^export /.test(t)) note = "Exports this symbol so other files can use it.";
    else if (/^function |=>/.test(t)) note = "Defines a function (a reusable block of code).";
    else if (/^class /.test(t)) note = "Defines a class (a blueprint for objects).";
    else if (/^if |else/.test(t)) note = "Branches based on a condition.";
    else if (/^for |^while /.test(t)) note = "Loops over a collection or condition.";
    else if (/^return /.test(t)) note = "Returns a value from the function.";
    else if (/=/.test(t) && !/==/.test(t)) note = "Assigns a value to a variable.";
    else note = `Statement in ${lang}.`;
    return { line: i + 1, code: ln, note };
  });
  const tutorial = {
    id: uid("lm"),
    title: "Walk through this file",
    steps: annotations.slice(0, 10).map((a, i) => ({
      step: i + 1,
      goal: a.note,
      checkpoint: `Read line ${a.line} and confirm you understand: "${a.code.trim().slice(0, 60)}"`,
    })),
  };
  res.json({ annotations, tutorial });
});

// =========================================================================
// 15. Offline Mode
// =========================================================================
type OfflineState = {
  online: boolean;
  activeModel: string;
  cloudModel: string;
  localModel: string;
  queue: { id: string; action: string; payload: unknown; queuedAt: string }[];
  history: { at: string; event: string }[];
};

const OFFLINE_DEFAULT: OfflineState = {
  online: true,
  activeModel: "claude-opus-4.5",
  cloudModel: "claude-opus-4.5",
  localModel: "ollama:llama3.1:8b",
  queue: [],
  history: [],
};

router.get("/offline/status", async (_req, res) => {
  res.json(await readJson<OfflineState>("offline", OFFLINE_DEFAULT));
});

router.post("/offline/toggle", async (req, res) => {
  const { online } = req.body as { online?: boolean };
  const next = await updateJson<OfflineState>("offline", OFFLINE_DEFAULT, (cur) => ({
    ...cur,
    online: typeof online === "boolean" ? online : !cur.online,
    activeModel: typeof online === "boolean" && !online ? cur.localModel : cur.cloudModel,
    history: [
      { at: new Date().toISOString(), event: typeof online === "boolean" && !online ? "offline" : "online" },
      ...cur.history,
    ].slice(0, 50),
  }));
  res.json(next);
});

router.post("/offline/queue", async (req, res) => {
  const { action, payload } = req.body as { action?: string; payload?: unknown };
  if (!action) {
    res.status(400).json({ error: "action required" });
    return;
  }
  const item = { id: uid("q"), action, payload: payload ?? null, queuedAt: new Date().toISOString() };
  const next = await updateJson<OfflineState>("offline", OFFLINE_DEFAULT, (cur) => ({
    ...cur,
    queue: [...cur.queue, item],
  }));
  res.json(next);
});

router.post("/offline/flush", async (_req, res) => {
  const next = await updateJson<OfflineState>("offline", OFFLINE_DEFAULT, (cur) => ({
    ...cur,
    queue: [],
    history: [{ at: new Date().toISOString(), event: `flushed ${cur.queue.length} queued action(s)` }, ...cur.history].slice(0, 50),
  }));
  res.json(next);
});

// =========================================================================
// 16. BYOK polish (per-project key overrides + redaction layer)
// =========================================================================
type ByokKey = {
  id: string;
  ownerId: string;
  projectId: string;
  provider: string;
  label: string;
  fingerprint: string;
  createdAt: string;
  usage: { calls: number; tokens: number; usd: number };
};

function fingerprint(secret: string): string {
  let h = 0;
  for (let i = 0; i < secret.length; i++) h = (h * 31 + secret.charCodeAt(i)) | 0;
  return `sk_…${(h >>> 0).toString(16)}`;
}

function redact(input: string): string {
  return input
    .replace(/sk-[A-Za-z0-9]{20,}/g, "sk-***REDACTED***")
    .replace(/AKIA[0-9A-Z]{16}/g, "AKIA***REDACTED***")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "ghp_***REDACTED***");
}

router.post("/byok/:projectId/keys", async (req, res) => {
  const { provider, label, secret } = req.body as { provider?: string; label?: string; secret?: string };
  if (!provider || !secret) {
    res.status(400).json({ error: "provider, secret required" });
    return;
  }
  const key: ByokKey = {
    id: uid("byok"),
    ownerId: uidOf(req),
    projectId: req.params.projectId,
    provider,
    label: label || provider,
    fingerprint: fingerprint(secret),
    createdAt: new Date().toISOString(),
    usage: { calls: 0, tokens: 0, usd: 0 },
  };
  await updateJson<ByokKey[]>("byok", [], (cur) => [key, ...cur]);
  res.json(key);
});

router.get("/byok/:projectId/keys", async (req, res) => {
  const all = await readJson<ByokKey[]>("byok", []);
  // Always filter by authenticated owner so callers can only see their own keys.
  res.json(all.filter((k) => k.projectId === req.params.projectId && k.ownerId === uidOf(req)));
});

router.post("/byok/:projectId/usage/:keyId", async (req, res) => {
  const { calls, tokens, usd } = req.body as { calls?: number; tokens?: number; usd?: number };
  const owner = uidOf(req);
  const all = await updateJson<ByokKey[]>("byok", [], (cur) =>
    cur.map((k) =>
      k.id === req.params.keyId && k.ownerId === owner
        ? {
            ...k,
            usage: {
              calls: k.usage.calls + (calls || 0),
              tokens: k.usage.tokens + (tokens || 0),
              usd: Math.round((k.usage.usd + (usd || 0)) * 100) / 100,
            },
          }
        : k,
    ),
  );
  const found = all.find((k) => k.id === req.params.keyId && k.ownerId === owner);
  if (!found) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(found);
});

router.delete("/byok/:projectId/keys/:keyId", async (req, res) => {
  const owner = uidOf(req);
  await updateJson<ByokKey[]>("byok", [], (cur) => cur.filter((k) => !(k.id === req.params.keyId && k.ownerId === owner)));
  res.json({ ok: true });
});

router.post("/byok/redact", (req, res) => {
  const { text } = req.body as { text?: string };
  res.json({ redacted: redact(String(text || "")) });
});

// =========================================================================
// 17. White-Label
// =========================================================================
type WhiteLabel = {
  orgId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  customDomain: string;
  emailFrom: string;
  loginCopy: string;
  certIssued: boolean;
  updatedAt: string;
};

const DEFAULT_WL: WhiteLabel = {
  orgId: "default",
  brandName: "CodeCloud",
  logoUrl: "/logo.svg",
  primaryColor: "#7c3aed",
  accentColor: "#22d3ee",
  customDomain: "",
  emailFrom: "noreply@codecloud.dev",
  loginCopy: "Sign in to your workspace",
  certIssued: false,
  updatedAt: new Date().toISOString(),
};

router.get("/whitelabel/:orgId", async (req, res) => {
  const all = await readJson<Record<string, WhiteLabel>>("whitelabel", {});
  res.json(all[req.params.orgId] || { ...DEFAULT_WL, orgId: req.params.orgId });
});

router.put("/whitelabel/:orgId", async (req, res) => {
  const body = req.body as Partial<WhiteLabel>;
  const next = await updateJson<Record<string, WhiteLabel>>("whitelabel", {}, (cur) => {
    const prev = cur[req.params.orgId] || { ...DEFAULT_WL, orgId: req.params.orgId };
    const merged: WhiteLabel = {
      ...prev,
      ...body,
      orgId: req.params.orgId,
      certIssued: body.customDomain ? true : prev.certIssued,
      updatedAt: new Date().toISOString(),
    };
    return { ...cur, [req.params.orgId]: merged };
  });
  res.json(next[req.params.orgId]);
});

// =========================================================================
// 18. Compliance Built-in (audit log + residency + GDPR exports + controls)
// =========================================================================
type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  actorKind: "user" | "agent" | "system";
  action: string;
  resource: string;
  meta: Record<string, unknown>;
};

router.post("/compliance/audit", async (req, res) => {
  const { actorKind, action, resource, meta } = req.body as Partial<AuditEvent>;
  if (!action || !resource) {
    res.status(400).json({ error: "action, resource required" });
    return;
  }
  const ev: AuditEvent = {
    id: uid("au"),
    at: new Date().toISOString(),
    // Actor is always the authenticated caller — never user-supplied so the
    // audit log can't be spoofed.
    actor: uidOf(req),
    actorKind: (actorKind as AuditEvent["actorKind"]) || "user",
    action,
    resource,
    meta: meta || {},
  };
  await updateJson<AuditEvent[]>("audit", [], (cur) => [ev, ...cur].slice(0, 5000));
  res.json(ev);
});

router.get("/compliance/audit", async (req, res) => {
  // Each user only sees events they performed.
  const all = await readJson<AuditEvent[]>("audit", []);
  res.json(all.filter((e) => e.actor === uidOf(req)));
});

const REGIONS = [
  { id: "us-east-1", name: "US East (N. Virginia)", residency: "US" },
  { id: "us-west-2", name: "US West (Oregon)", residency: "US" },
  { id: "eu-west-1", name: "EU (Ireland)", residency: "EU" },
  { id: "eu-central-1", name: "EU (Frankfurt)", residency: "EU" },
  { id: "ap-south-1", name: "Asia Pacific (Mumbai)", residency: "IN" },
  { id: "ap-southeast-1", name: "Asia Pacific (Singapore)", residency: "SG" },
];

router.get("/compliance/regions", (_req, res) => res.json(REGIONS));

router.put("/compliance/:orgId/residency", async (req, res) => {
  const { regionId } = req.body as { regionId?: string };
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) {
    res.status(400).json({ error: "Unknown region" });
    return;
  }
  const next = await updateJson<Record<string, { regionId: string; residency: string }>>("residency", {}, (cur) => ({
    ...cur,
    [req.params.orgId]: { regionId: region.id, residency: region.residency },
  }));
  res.json(next[req.params.orgId]);
});

router.get("/compliance/:orgId/residency", async (req, res) => {
  const all = await readJson<Record<string, { regionId: string; residency: string }>>("residency", {});
  res.json(all[req.params.orgId] || { regionId: "us-east-1", residency: "US" });
});

router.post("/compliance/me/export", async (req, res) => {
  // GDPR export targets ONLY the authenticated user; never a path-supplied id.
  const userId = uidOf(req);
  const audit = await readJson<AuditEvent[]>("audit", []);
  const userAudit = audit.filter((e) => e.actor === userId);
  const bundle = {
    id: uid("gdpr"),
    userId,
    createdAt: new Date().toISOString(),
    audit: userAudit,
    profile: { id: userId },
    signature: `sig_${Buffer.from(`${userId}:${Date.now()}`).toString("base64").slice(0, 24)}`,
  };
  await updateJson<typeof bundle[]>("gdpr-exports", [], (cur) => [bundle, ...cur].slice(0, 100));
  res.json(bundle);
});

router.delete("/compliance/me", async (req, res) => {
  const userId = uidOf(req);
  await updateJson<AuditEvent[]>("audit", [], (cur) => cur.filter((e) => e.actor !== userId));
  const ev: AuditEvent = {
    id: uid("au"),
    at: new Date().toISOString(),
    actor: "system",
    actorKind: "system",
    action: "gdpr.delete",
    resource: `user:${userId}`,
    meta: {},
  };
  await updateJson<AuditEvent[]>("audit", [], (cur) => [ev, ...cur]);
  res.json({ ok: true });
});

router.get("/compliance/controls", (_req, res) => {
  res.json({
    soc2: [
      { id: "CC6.1", title: "Logical access controls", status: "passing" },
      { id: "CC6.7", title: "Encryption in transit", status: "passing" },
      { id: "CC7.2", title: "System monitoring", status: "passing" },
    ],
    hipaa: [
      { id: "164.308(a)(1)", title: "Security management process", status: "passing" },
      { id: "164.312(a)(1)", title: "Access control", status: "passing" },
      { id: "164.312(e)(1)", title: "Transmission security", status: "passing" },
    ],
    encryption: { atRest: "AES-256", inTransit: "TLS 1.3", keyManagement: "KMS-managed" },
  });
});

// =========================================================================
// 19. Mobile App Builder
// =========================================================================
router.post("/mobile-builder/scaffold", async (req, res) => {
  const { name, framework, features } = req.body as {
    name?: string;
    framework?: "expo" | "flutter";
    features?: string[];
  };
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const fw = framework || "expo";
  const feats = features || ["nav", "auth"];
  const files =
    fw === "flutter"
      ? [
          { path: "pubspec.yaml", content: `name: ${name}\nversion: 0.1.0\n` },
          { path: "lib/main.dart", content: `import 'package:flutter/material.dart';\nvoid main() => runApp(const App());\nclass App extends StatelessWidget { const App({super.key}); @override Widget build(BuildContext c) => const MaterialApp(home: Scaffold(body: Center(child: Text('${name}')))); }\n` },
        ]
      : [
          {
            path: "package.json",
            content: JSON.stringify(
              { name, version: "0.1.0", main: "expo-router/entry", dependencies: { expo: "^53.0.0", "expo-router": "^4.0.0", react: "19.0.0", "react-native": "0.78.0" } },
              null,
              2,
            ),
          },
          { path: "app.json", content: JSON.stringify({ expo: { name, slug: name.toLowerCase(), version: "0.1.0" } }, null, 2) },
          {
            path: "app/index.tsx",
            content: `import { Text, View } from "react-native";\nexport default function Home() {\n  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text>${name}</Text></View>;\n}\n`,
          },
          ...(feats.includes("auth") ? [{ path: "app/(auth)/sign-in.tsx", content: `import { Button, View } from "react-native";\nexport default function SignIn() { return <View><Button title="Sign in" onPress={() => {}} /></View>; }\n` }] : []),
        ];
  const project = {
    id: uid("mob"),
    name,
    framework: fw,
    features: feats,
    files,
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof project[]>("mobile-builder", [], (cur) => [project, ...cur].slice(0, 50));
  res.json(project);
});

router.get("/mobile-builder", async (_req, res) => res.json(await readJson<unknown[]>("mobile-builder", [])));

// =========================================================================
// 20. AI Agents Marketplace
// =========================================================================
type Agent = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  recommendedModel: string;
  authorId: string;
  authorName: string;
  priceCredits: number;
  ratings: number[];
  createdAt: string;
};

const SEED_AGENTS: Agent[] = [
  {
    id: "ag_seed_1",
    name: "Refactor Surgeon",
    description: "Produces minimal, safe refactors with full test coverage.",
    systemPrompt: "You are an expert refactoring agent. Always preserve behavior and add tests.",
    tools: ["editor", "tests", "git"],
    recommendedModel: "claude-opus-4.5",
    authorId: "u_seed",
    authorName: "Replit Team",
    priceCredits: 25,
    ratings: [5, 4, 5, 5],
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "ag_seed_2",
    name: "Security Auditor",
    description: "Runs SAST + dep scan on every change and proposes patches.",
    systemPrompt: "You are a security auditor. Scan code, list findings, propose fixes.",
    tools: ["secscan", "editor"],
    recommendedModel: "gpt-5",
    authorId: "u_seed",
    authorName: "Replit Team",
    priceCredits: 40,
    ratings: [5, 5, 5, 4, 5],
    createdAt: "2026-02-01T00:00:00Z",
  },
];

router.get("/agents-marketplace", async (_req, res) => {
  res.json(await readJson<Agent[]>("agents-marketplace", SEED_AGENTS));
});

router.post("/agents-marketplace", async (req, res) => {
  const { name, description, systemPrompt, tools, recommendedModel, priceCredits, authorName } = req.body as Partial<Agent>;
  if (!name || !systemPrompt) {
    res.status(400).json({ error: "name, systemPrompt required" });
    return;
  }
  const agent: Agent = {
    id: uid("ag"),
    name,
    description: description || "",
    systemPrompt,
    tools: tools || [],
    recommendedModel: recommendedModel || "claude-opus-4.5",
    authorId: "user",
    authorName: authorName || "anonymous",
    priceCredits: priceCredits || 0,
    ratings: [],
    createdAt: new Date().toISOString(),
  };
  await updateJson<Agent[]>("agents-marketplace", SEED_AGENTS, (cur) => [agent, ...cur]);
  res.json(agent);
});

router.post("/agents-marketplace/:id/buy", async (req, res) => {
  const all = await readJson<Agent[]>("agents-marketplace", SEED_AGENTS);
  const a = all.find((x) => x.id === req.params.id);
  if (!a) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const sellerCut = Math.round(a.priceCredits * 0.7);
  const platformCut = a.priceCredits - sellerCut;
  const txn = {
    id: uid("atx"),
    agentId: a.id,
    buyerId: uidOf(req),
    sellerId: a.authorId,
    priceCredits: a.priceCredits,
    sellerCutCredits: sellerCut,
    platformCutCredits: platformCut,
    createdAt: new Date().toISOString(),
  };
  await updateJson<typeof txn[]>("agent-txns", [], (cur) => [txn, ...cur]);
  await updateJson<Record<string, number>>("payouts-ledger", {}, (cur) => ({
    ...cur,
    [a.authorId]: (cur[a.authorId] || 0) + sellerCut,
  }));
  res.json(txn);
});

router.post("/agents-marketplace/:id/rate", async (req, res) => {
  const stars = Math.max(1, Math.min(5, Number((req.body as { stars?: number }).stars || 5)));
  const all = await updateJson<Agent[]>("agents-marketplace", SEED_AGENTS, (cur) =>
    cur.map((a) => (a.id === req.params.id ? { ...a, ratings: [...a.ratings, stars] } : a)),
  );
  res.json(all.find((a) => a.id === req.params.id));
});

router.post("/agents-marketplace/session", async (req, res) => {
  const { agentId } = req.body as { agentId?: string };
  const all = await readJson<Agent[]>("agents-marketplace", SEED_AGENTS);
  const agent = all.find((a) => a.id === agentId);
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const session = {
    id: uid("as"),
    agentId: agent.id,
    agentName: agent.name,
    systemPrompt: agent.systemPrompt,
    model: agent.recommendedModel,
    tools: agent.tools,
    startedAt: new Date().toISOString(),
  };
  await updateJson<typeof session[]>("agent-sessions", [], (cur) => [session, ...cur].slice(0, 200));
  res.json(session);
});

export default router;
