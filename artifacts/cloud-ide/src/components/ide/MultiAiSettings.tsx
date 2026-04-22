import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, AlertTriangle, Trash2 } from "lucide-react";

const apiBase = `${import.meta.env.VITE_API_URL || ""}/api`;
const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google (Gemini)" },
  { id: "xai", label: "xAI (Grok)" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "meta", label: "Groq (Llama)" },
  { id: "mistral", label: "Mistral" },
  { id: "qwen", label: "Qwen / DashScope" },
  { id: "cohere", label: "Cohere" },
  { id: "ollama", label: "Ollama (Local)" },
] as const;

interface KeyEntry { provider: string; lastFour: string; createdAt: number; }
interface AlertsResp { perTaskUsd: number; perDayUsd: number; perMonthUsd: number; enabled: boolean; pause: { paused: boolean; until: number | null; reason: string | null } }

export default function MultiAiSettings() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, string>>({});
  const keysQ = useQuery<{ keys: KeyEntry[] }>({
    queryKey: ["aiGw", "byok"],
    queryFn: () => fetch(`${apiBase}/ai/gateway/byok`, { credentials: "include" }).then(r => r.json()),
  });
  const alertsQ = useQuery<AlertsResp>({
    queryKey: ["aiGw", "alerts"],
    queryFn: () => fetch(`${apiBase}/ai/gateway/alerts`, { credentials: "include" }).then(r => r.json()),
  });

  // Wrap fetch so non-2xx responses surface as mutation errors instead of
  // silently appearing as success in the UI (eg. BYOK save validation fails,
  // alert thresholds rejected as NaN, etc.).
  const okJson = async (r: Response): Promise<unknown> => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText })) as { error?: string };
      throw new Error(err.error ?? `Request failed (${r.status})`);
    }
    return r.json().catch(() => ({}));
  };
  const saveKeyM = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      fetch(`${apiBase}/ai/gateway/byok/${provider}`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) }).then(okJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiGw", "byok"] }),
  });
  const removeKeyM = useMutation({
    mutationFn: (provider: string) => fetch(`${apiBase}/ai/gateway/byok/${provider}`, { method: "DELETE", credentials: "include" }).then(okJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiGw", "byok"] }),
  });
  const saveAlertsM = useMutation({
    mutationFn: (body: Partial<AlertsResp>) =>
      fetch(`${apiBase}/ai/gateway/alerts`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(okJson),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiGw", "alerts"] }),
  });

  const keys = keysQ.data?.keys ?? [];
  const alerts = alertsQ.data;

  return (
    <div className="space-y-6" data-testid="multi-ai-settings">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h3 className="font-semibold">Bring Your Own Keys (BYOK)</h3>
        </div>
        <p className="text-xs text-muted-foreground">Keys are encrypted at rest with AES-256-GCM. When present, we route to the provider directly and only charge a 15% infra margin.</p>
        <div className="grid gap-2">
          {PROVIDERS.map(p => {
            const existing = keys.find(k => k.provider === p.id);
            return (
              <div key={p.id} className="flex items-center gap-2" data-testid={`byok-row-${p.id}`}>
                <div className="w-44 text-sm">{p.label}</div>
                {existing ? (
                  <>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">stored ••••{existing.lastFour}</Badge>
                    <div className="ml-auto"><Button size="sm" variant="ghost" onClick={() => removeKeyM.mutate(p.id)} data-testid={`button-remove-${p.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                  </>
                ) : (
                  <>
                    <Input
                      type="password"
                      value={pending[p.id] ?? ""}
                      onChange={e => setPending(s => ({ ...s, [p.id]: e.target.value }))}
                      placeholder="sk-…"
                      className="flex-1 h-8"
                      data-testid={`input-key-${p.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveKeyM.mutate({ provider: p.id, apiKey: pending[p.id] ?? "" }, { onSuccess: () => setPending(s => ({ ...s, [p.id]: "" })) })}
                      disabled={!(pending[p.id] && pending[p.id].length >= 8)}
                      data-testid={`button-save-${p.id}`}
                    >Save</Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold">Cost alerts</h3>
        </div>
        <p className="text-xs text-muted-foreground">Breaching any threshold pauses AI for an hour or until you acknowledge.</p>
        {alerts?.pause.paused && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{alerts.pause.reason}</AlertDescription>
          </Alert>
        )}
        {alerts && (
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Per task ($)</Label>
              <Input type="number" step="0.01" defaultValue={alerts.perTaskUsd} onBlur={e => saveAlertsM.mutate({ perTaskUsd: Number(e.target.value) })} data-testid="input-alert-task" />
            </div>
            <div>
              <Label className="text-xs">Per day ($)</Label>
              <Input type="number" step="0.1" defaultValue={alerts.perDayUsd} onBlur={e => saveAlertsM.mutate({ perDayUsd: Number(e.target.value) })} data-testid="input-alert-day" />
            </div>
            <div>
              <Label className="text-xs">Per month ($)</Label>
              <Input type="number" step="1" defaultValue={alerts.perMonthUsd} onBlur={e => saveAlertsM.mutate({ perMonthUsd: Number(e.target.value) })} data-testid="input-alert-month" />
            </div>
          </div>
        )}
        <Separator />
        <div className="flex items-center gap-3">
          <Switch checked={alerts?.enabled ?? true} onCheckedChange={(v) => saveAlertsM.mutate({ enabled: v })} data-testid="switch-alerts-enabled" />
          <Label className="text-sm">Enable cost guardrails</Label>
        </div>
      </Card>
    </div>
  );
}
