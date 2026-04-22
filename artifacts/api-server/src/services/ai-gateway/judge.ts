import { getAdapter } from "./adapters";
import { modelRegistry, type ModelDef } from "./registry";
import { byokService } from "./byok";

export interface CandidateAnswer {
  modelId: string;
  label: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
  byok?: boolean;
  servedBy?: string;
  servedByFallback?: boolean;
}

export interface RubricScore { correctness: number; completeness: number; styleFit: number; safety: number; total: number; }
export interface JudgedAnswer { modelId: string; rubric: RubricScore; rationale: string; }
export interface JudgeResult {
  winnerModelId: string;
  merged: string;
  scores: JudgedAnswer[];
  judgeModelId: string;
  judgeCostUsd: number;
  judgeLatencyMs: number;
  fallbackUsed: boolean;
  judgeBYOK: boolean;
}

function heuristicScore(content: string, prompt: string): RubricScore {
  const len = content.length;
  const correctness = Math.min(100, 40 + Math.min(40, Math.floor(len / 80)) + (content.toLowerCase().includes(prompt.split(/\s+/)[0]?.toLowerCase() ?? "") ? 10 : 0));
  const completeness = Math.min(100, 30 + Math.floor(len / 60));
  const styleFit = Math.min(100, 50 + (/```/.test(content) ? 20 : 0) + (/[.!?]\s/.test(content) ? 15 : 0));
  const safety = /\b(rm -rf|sudo|drop database|secret|password)\b/i.test(content) ? 60 : 95;
  const total = Math.round((correctness + completeness + styleFit + safety) / 4);
  return { correctness, completeness, styleFit, safety, total };
}

function tryParseScores(text: string, candidates: CandidateAnswer[]): JudgedAnswer[] | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed: { winner?: string; scores?: Array<{ modelId: string; correctness: number; completeness: number; styleFit: number; safety: number; rationale?: string }> } = JSON.parse(m[0]);
    if (!parsed.scores) return null;
    return parsed.scores.map(s => ({
      modelId: s.modelId,
      rubric: { correctness: s.correctness, completeness: s.completeness, styleFit: s.styleFit, safety: s.safety, total: Math.round((s.correctness + s.completeness + s.styleFit + s.safety) / 4) },
      rationale: s.rationale ?? "",
    })).filter(s => candidates.find(c => c.modelId === s.modelId));
  } catch { return null; }
}

export async function judgeCandidates(
  prompt: string,
  candidates: CandidateAnswer[],
  userId: string,
): Promise<JudgeResult> {
  const ok = candidates.filter(c => c.ok);
  if (ok.length === 0) {
    return { winnerModelId: "", merged: "All candidate models failed.", scores: [], judgeModelId: "none", judgeCostUsd: 0, judgeLatencyMs: 0, fallbackUsed: false, judgeBYOK: false };
  }
  const judgeId = modelRegistry.getJudgeModelId();
  const fallbackId = modelRegistry.getJudgeFallbackId();
  const judgeModel = modelRegistry.get(judgeId);

  const rubricPrompt = `You are an expert judge of AI responses. Score each candidate (0-100) on: correctness, completeness, styleFit, safety. Then pick a winner OR write a merged best answer drawing from the strongest candidates.

USER PROMPT:
${prompt}

CANDIDATES:
${ok.map((c, i) => `--- Candidate ${i + 1} (${c.label}, id=${c.modelId}) ---\n${c.content}`).join("\n\n")}

Respond with ONLY a JSON object of this shape:
{
  "winner": "<modelId>",
  "merged": "<the final answer to deliver to the user, may merge sections>",
  "scores": [{ "modelId": "...", "correctness": 0, "completeness": 0, "styleFit": 0, "safety": 0, "rationale": "one sentence" }]
}`;

  const tryJudge = async (model: ModelDef | undefined): Promise<{ text: string; cost: number; latency: number; tokens: { input: number; output: number }; byok: boolean } | null> => {
    if (!model) return null;
    try {
      const adapter = getAdapter(model.provider);
      await byokService.preload(userId);
      const apiKey = byokService.get(userId, model.provider);
      const result = await adapter.complete(model, [{ role: "user", content: rubricPrompt }], { apiKey, maxTokens: 2048 });
      // Match the BYOK billing model used everywhere else: when the user
      // supplied their own provider key we charge infra margin only, not full
      // token price. Otherwise users would be double-charged for the judge.
      const fullCost = (result.inputTokens / 1000) * model.inputPer1k + (result.outputTokens / 1000) * model.outputPer1k;
      const cost = apiKey ? fullCost * 0.15 : fullCost;
      return { text: result.content, cost, latency: result.latencyMs, tokens: { input: result.inputTokens, output: result.outputTokens }, byok: !!apiKey };
    } catch { return null; }
  };

  let judgeRes = await tryJudge(judgeModel);
  let fallbackUsed = false;
  let usedJudgeId = judgeId;
  if (!judgeRes) {
    judgeRes = await tryJudge(modelRegistry.get(fallbackId));
    fallbackUsed = true;
    usedJudgeId = fallbackId;
  }

  let scores: JudgedAnswer[] = [];
  let merged = "";
  let winner = ok[0].modelId;

  if (judgeRes) {
    const parsed = tryParseScores(judgeRes.text, ok);
    if (parsed) {
      scores = parsed;
      const top = parsed.slice().sort((a, b) => b.rubric.total - a.rubric.total)[0];
      winner = top?.modelId ?? winner;
      try {
        const m = judgeRes.text.match(/"merged"\s*:\s*"((?:\\.|[^"\\])*)"/);
        merged = m ? JSON.parse(`"${m[1]}"`) : ok.find(c => c.modelId === winner)?.content ?? "";
      } catch {
        merged = ok.find(c => c.modelId === winner)?.content ?? "";
      }
    }
  }

  if (scores.length === 0) {
    scores = ok.map(c => ({ modelId: c.modelId, rubric: heuristicScore(c.content, prompt), rationale: "Heuristic score (judge unavailable)." }));
    const top = scores.slice().sort((a, b) => b.rubric.total - a.rubric.total)[0];
    winner = top.modelId;
    merged = ok.find(c => c.modelId === winner)?.content ?? "";
  }

  return {
    winnerModelId: winner,
    merged,
    scores,
    judgeModelId: usedJudgeId,
    judgeCostUsd: judgeRes?.cost ?? 0,
    judgeLatencyMs: judgeRes?.latency ?? 0,
    fallbackUsed,
    judgeBYOK: judgeRes?.byok ?? false,
  };
}
