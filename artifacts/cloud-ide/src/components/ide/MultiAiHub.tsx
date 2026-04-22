import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Users, Wallet, Zap, AlertTriangle, Crown, Trophy, Pause } from "lucide-react";

const apiBase = `${import.meta.env.VITE_API_URL || ""}/api`;

interface ModelInfo {
  id: string; label: string; provider: string; tier: "premium" | "standard" | "economy" | "free";
  inputPer1k: number; outputPer1k: number; qualityScore: number; avgLatencyMs: number;
  strengths: string[]; description: string; available: boolean; byok: boolean; enabled: boolean;
}
interface ModelsResp {
  models: ModelInfo[];
  grouped: Record<"premium" | "standard" | "economy" | "free", ModelInfo[]>;
  judgeModelId: string;
  providers: Record<string, boolean>;
}
interface SingleResp {
  modelId: string; label: string; content: string; inputTokens: number; outputTokens: number;
  costUsd: number; latencyMs: number; cacheHit: boolean; byok: boolean; servedByFallback: boolean;
  servedBy: string; taskType: string;
}
interface CouncilCandidate {
  modelId: string; label: string; content: string; inputTokens: number; outputTokens: number;
  costUsd: number; latencyMs: number; ok: boolean; error?: string;
}
interface CouncilResp {
  runId: string;
  candidates: CouncilCandidate[];
  judge: {
    winnerModelId: string; merged: string; judgeModelId: string; judgeCostUsd: number; judgeLatencyMs: number;
    fallbackUsed: boolean;
    scores: Array<{ modelId: string; rubric: { correctness: number; completeness: number; styleFit: number; safety: number; total: number }; rationale: string }>;
  };
  totalCostUsd: number; totalLatencyMs: number; taskType: string; margin: number;
}
interface RecommendResp { taskType: string; recommendedModelId: string; reason: string; }
interface AlertsResp {
  perTaskUsd: number; perDayUsd: number; perMonthUsd: number; enabled: boolean;
  pause: { paused: boolean; until: number | null; reason: string | null };
}

type Mode = "single" | "council";

interface ChatItem {
  id: string;
  prompt: string;
  mode: Mode;
  single?: SingleResp;
  council?: CouncilResp;
  pending: boolean;
  error?: string;
  promotion?: { winnerModelId: string; refundUsd: number; finalUsd: number; ledgerEntryId: string | null };
}

function tierColor(t: string): string {
  return t === "premium" ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
    : t === "standard" ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
    : t === "economy" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
}

function fmtUsd(n: number): string { return n < 0.01 ? `$${(n * 1000).toFixed(2)}m` : `$${n.toFixed(4)}`; }

export default function MultiAiHub({ projectId }: { projectId?: string | null }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("single");
  const [modelId, setModelId] = useState<string>("claude-sonnet-4-5");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [followRecommendation, setFollowRecommendation] = useState(true);

  const modelsQ = useQuery<ModelsResp>({
    queryKey: ["aiGw", "models"],
    queryFn: () => fetch(`${apiBase}/ai/gateway/models`, { credentials: "include" }).then(r => r.json()),
  });
  const alertsQ = useQuery<AlertsResp>({
    queryKey: ["aiGw", "alerts"],
    queryFn: () => fetch(`${apiBase}/ai/gateway/alerts`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });
  const usageQ = useQuery<{ totals: { totalUsd: number; tasks: number; cacheHits: number; byokTasks: number } }>({
    queryKey: ["aiGw", "usage"],
    queryFn: () => fetch(`${apiBase}/ai/gateway/usage`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 15000,
  });

  const recommendM = useMutation({
    mutationFn: async (p: string): Promise<RecommendResp> => {
      const r = await fetch(`${apiBase}/ai/gateway/recommend`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: p }) });
      return r.json();
    },
  });

  useEffect(() => {
    if (!followRecommendation || !prompt.trim() || prompt.length < 12) return;
    const t = setTimeout(() => recommendM.mutate(prompt, {
      onSuccess: (r) => { if (r.recommendedModelId) setModelId(r.recommendedModelId); },
    }), 600);
    return () => clearTimeout(t);
  }, [prompt, followRecommendation]);

  const ackM = useMutation({
    mutationFn: () => fetch(`${apiBase}/ai/gateway/alerts/acknowledge`, { method: "POST", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiGw", "alerts"] }),
  });

  const overrideM = useMutation({
    mutationFn: (body: { suggested: string; chosen: string; prompt: string }) =>
      fetch(`${apiBase}/ai/gateway/recommend/override`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });

  const submit = async () => {
    const p = prompt.trim();
    if (!p) return;
    const id = `c-${Date.now()}`;
    const item: ChatItem = { id, prompt: p, mode, pending: true };
    setHistory(h => [...h, item]);
    setPrompt("");
    if (recommendM.data && recommendM.data.recommendedModelId !== modelId) {
      overrideM.mutate({ suggested: recommendM.data.recommendedModelId, chosen: modelId, prompt: p });
    }
    try {
      if (mode === "single") {
        const r = await fetch(`${apiBase}/ai/gateway/complete`, {
          method: "POST", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ modelId, projectId: projectId ?? null, messages: [{ role: "user", content: p }] }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Request failed" })) as { error?: string };
          throw new Error(err.error ?? "Request failed");
        }
        const single: SingleResp = await r.json();
        setHistory(h => h.map(c => c.id === id ? { ...c, single, pending: false } : c));
      } else {
        const r = await fetch(`${apiBase}/ai/gateway/council`, {
          method: "POST", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId: projectId ?? null, messages: [{ role: "user", content: p }] }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Request failed" })) as { error?: string };
          throw new Error(err.error ?? "Request failed");
        }
        const council: CouncilResp = await r.json();
        setHistory(h => h.map(c => c.id === id ? { ...c, council, pending: false } : c));
      }
      qc.invalidateQueries({ queryKey: ["aiGw", "usage"] });
      qc.invalidateQueries({ queryKey: ["aiGw", "alerts"] });
    } catch (e) {
      setHistory(h => h.map(c => c.id === id ? { ...c, error: (e as Error).message, pending: false } : c));
    }
  };

  const promote = async (item: ChatItem, candidateModelId: string) => {
    if (!item.council) return;
    // Send only run id + chosen winner; the server recomputes the refund from
    // its trusted record of this council run. Surface server errors (already
    // promoted, run expired, ledger write failed) instead of silently
    // claiming success.
    try {
      const r = await fetch(`${apiBase}/ai/gateway/council/promote`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ councilRunId: item.council.runId, winnerModelId: candidateModelId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Promote failed" })) as { error?: string };
        setHistory(h => h.map(c => c.id === item.id ? { ...c, error: err.error ?? "Promote failed" } : c));
        return;
      }
      const body = await r.json().catch(() => ({})) as { refundUsd?: number; finalUsd?: number; ledgerEntryId?: string | null; winnerModelId?: string };
      setHistory(h => h.map(c => c.id === item.id ? { ...c, promotion: {
        winnerModelId: body.winnerModelId ?? candidateModelId,
        refundUsd: body.refundUsd ?? 0,
        finalUsd: body.finalUsd ?? 0,
        ledgerEntryId: body.ledgerEntryId ?? null,
      } } : c));
      overrideM.mutate({ suggested: item.council.judge.winnerModelId, chosen: candidateModelId, prompt: item.prompt });
      qc.invalidateQueries({ queryKey: ["aiGw", "usage"] });
    } catch (e) {
      setHistory(h => h.map(c => c.id === item.id ? { ...c, error: (e as Error).message } : c));
    }
  };

  const models = modelsQ.data?.models ?? [];
  const grouped = modelsQ.data?.grouped;
  const recommendedModel = recommendM.data?.recommendedModelId;
  const totals = usageQ.data?.totals;
  const paused = alertsQ.data?.pause.paused;
  const sortedModels = useMemo(() => models.slice().sort((a, b) => a.tier.localeCompare(b.tier) || b.qualityScore - a.qualityScore), [models]);

  return (
    <div className="flex flex-col h-full bg-background" data-testid="multi-ai-hub">
      <div className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Multi-AI Hub</div>
            <div className="text-xs text-muted-foreground">10 providers • semantic cache • cost guardrails</div>
          </div>
          {totals && (
            <div className="text-right text-xs">
              <div className="font-mono">{fmtUsd(totals.totalUsd)} <span className="text-muted-foreground">/ 24h</span></div>
              <div className="text-muted-foreground">{totals.tasks} tasks • {totals.cacheHits} cached</div>
            </div>
          )}
        </div>

        {paused && alertsQ.data && (
          <Alert variant="destructive" data-testid="alert-paused">
            <Pause className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{alertsQ.data.pause.reason}</span>
              <Button size="sm" variant="outline" onClick={() => ackM.mutate()} data-testid="button-ack-alert">Acknowledge & resume</Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="single" data-testid="tab-mode-single"><Zap className="h-3.5 w-3.5 mr-1.5" />Single Model</TabsTrigger>
            <TabsTrigger value="council" data-testid="tab-mode-council"><Users className="h-3.5 w-3.5 mr-1.5" />Council Mode</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "single" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger className="flex-1" data-testid="select-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {(["premium", "standard", "economy", "free"] as const).map(tier => grouped?.[tier]?.length ? (
                    <div key={tier}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{tier}</div>
                      {grouped[tier].map(m => (
                        <SelectItem key={m.id} value={m.id} disabled={!m.available || !m.enabled} data-testid={`option-model-${m.id}`}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span>{m.label}{!m.available ? " · no key" : ""}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              q{m.qualityScore} · {Math.round(m.avgLatencyMs)}ms · ${m.inputPer1k}/${m.outputPer1k}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ) : null)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={followRecommendation} onCheckedChange={setFollowRecommendation} data-testid="switch-auto-pick" />
                Auto
              </div>
            </div>
            {recommendedModel && recommendM.data && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-400" />
                Suggested: <button onClick={() => setModelId(recommendedModel)} className="text-purple-300 hover:underline" data-testid="button-apply-suggestion">{models.find(m => m.id === recommendedModel)?.label}</button>
                <span>· {recommendM.data.reason}</span>
              </div>
            )}
          </div>
        )}

        {mode === "council" && (
          <div className="text-xs text-muted-foreground">
            All available models will answer in parallel; <Crown className="inline h-3 w-3 text-amber-400" /> {modelsQ.data?.judgeModelId ?? "judge"} will score & merge.
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {history.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Pick a mode and ask anything. Try Council Mode for hard questions — you'll see every model's answer side by side, scored by an LLM judge.
            </div>
          )}
          {history.map(item => (
            <div key={item.id} className="space-y-2" data-testid={`chat-${item.id}`}>
              <Card className="p-3 bg-muted/30">
                <div className="text-xs font-medium text-muted-foreground mb-1">You · {item.mode === "single" ? "Single" : "Council"}</div>
                <div className="text-sm whitespace-pre-wrap">{item.prompt}</div>
              </Card>
              {item.pending && <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>}
              {item.error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{item.error}</AlertDescription></Alert>}
              {item.promotion && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300" data-testid={`promote-result-${item.id}`}>
                  Promoted <span className="font-medium">{item.promotion.winnerModelId}</span> · refunded ${item.promotion.refundUsd.toFixed(4)} · billed ${item.promotion.finalUsd.toFixed(4)}
                  {item.promotion.ledgerEntryId && <span className="ml-1 opacity-70">(ledger #{item.promotion.ledgerEntryId.slice(0, 8)})</span>}
                </div>
              )}
              {item.single && (
                <Card className="p-3 space-y-2" data-testid={`single-${item.id}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{item.single.label}</Badge>
                    <Badge variant="outline" className={tierColor("standard")}>{item.single.taskType}</Badge>
                    {item.single.cacheHit && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">cached</Badge>}
                    {item.single.byok && <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">BYOK</Badge>}
                    {item.single.servedByFallback && <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">fallback → {item.single.servedBy}</Badge>}
                    <div className="ml-auto text-muted-foreground font-mono">{fmtUsd(item.single.costUsd)} • {item.single.latencyMs}ms</div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{item.single.content}</div>
                </Card>
              )}
              {item.council && (
                <Card className="p-3 space-y-3" data-testid={`council-${item.id}`}>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30"><Trophy className="h-3 w-3 mr-1" /> Winner: {item.council.candidates.find(c => c.modelId === item.council!.judge.winnerModelId)?.label ?? "—"}</Badge>
                    <Badge variant="outline">judge: {item.council.judge.judgeModelId}{item.council.judge.fallbackUsed ? " (fallback)" : ""}</Badge>
                    <div className="ml-auto text-muted-foreground font-mono">{fmtUsd(item.council.totalCostUsd)} • {item.council.totalLatencyMs}ms</div>
                  </div>
                  <Card className="p-3 bg-muted/40">
                    <div className="text-xs font-semibold mb-1">Merged answer</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{item.council.judge.merged}</div>
                  </Card>
                  <Separator />
                  <div className="grid gap-2">
                    {item.council.candidates.map(c => {
                      const score = item.council!.judge.scores.find(s => s.modelId === c.modelId);
                      const winner = c.modelId === item.council!.judge.winnerModelId;
                      return (
                        <Card key={c.modelId} className={`p-2.5 ${winner ? "border-amber-500/40" : ""}`} data-testid={`candidate-${c.modelId}`}>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="font-semibold">{c.label}</span>
                            {winner && <Trophy className="h-3 w-3 text-amber-400" />}
                            {!c.ok && <Badge variant="destructive" className="text-[10px]">{c.error}</Badge>}
                            {score && <span className="text-muted-foreground">score {score.rubric.total}</span>}
                            <div className="ml-auto text-muted-foreground font-mono">{fmtUsd(c.costUsd)} • {c.latencyMs}ms</div>
                            {c.ok && !winner && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => promote(item, c.modelId)} data-testid={`button-promote-${c.modelId}`}>Use this</Button>
                            )}
                          </div>
                          {c.ok && <div className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{c.content}</div>}
                          {score && (
                            <div className="flex gap-3 text-[10px] text-muted-foreground mt-1.5">
                              <span>correct {score.rubric.correctness}</span>
                              <span>complete {score.rubric.completeness}</span>
                              <span>style {score.rubric.styleFit}</span>
                              <span>safety {score.rubric.safety}</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3 space-y-2">
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={mode === "council" ? "Ask the council anything…" : "Message the model…"}
          className="min-h-[70px] resize-none text-sm"
          data-testid="textarea-prompt"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Wallet className="h-3 w-3" />
            {totals ? `${totals.byokTasks} BYOK · ${fmtUsd(totals.totalUsd)} today` : "—"}
          </div>
          <Button onClick={submit} disabled={!prompt.trim() || paused} size="sm" data-testid="button-send">
            {mode === "council" ? "Run Council" : "Send"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {sortedModels.slice(0, 6).map(m => (
            <Badge key={m.id} variant="outline" className={`text-[10px] ${tierColor(m.tier)} ${!m.available ? "opacity-50" : ""}`}>
              {m.label}{!m.available && " · no key"}
            </Badge>
          ))}
          {sortedModels.length > 6 && <Badge variant="outline" className="text-[10px]">+{sortedModels.length - 6}</Badge>}
        </div>
      </div>
    </div>
  );
}
