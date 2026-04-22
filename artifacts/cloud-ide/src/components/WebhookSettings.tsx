import { useState, useCallback, useEffect } from "react";
import {
  Plus, Trash2, Copy, Check, RefreshCw, Globe, Webhook,
  ChevronDown, ChevronRight, X, AlertCircle, CheckCircle2,
  Clock, RotateCcw, Eye, EyeOff, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface WebhookType {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  secret?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryType {
  id: string;
  event: string;
  status: "pending" | "success" | "failed";
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attempts: number;
  deliveredAt: string | null;
  createdAt: string;
}

interface WebhookEvent {
  value: string;
  label: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-2.5 h-2.5" /> Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertCircle className="w-2.5 h-2.5" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
}

function CreateWebhookDialog({
  events,
  onCreated,
}: {
  events: WebhookEvent[];
  onCreated: (wh: WebhookType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleCreate = async () => {
    if (!url.trim() || selectedEvents.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || undefined,
          events: selectedEvents,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      onCreated(data.webhook);
      setOpen(false);
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
      toast({ title: "Webhook created" });
    } catch {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Webhook</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>Configure a URL to receive event notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Payload URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Production notifications"
            />
          </div>
          <div>
            <Label>Events</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {events.map((ev) => (
                <button
                  key={ev.value}
                  onClick={() => toggleEvent(ev.value)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                    selectedEvents.includes(ev.value)
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-sm border ${
                    selectedEvents.includes(ev.value) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedEvents.includes(ev.value) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  {ev.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedEvents(
                selectedEvents.length === events.length ? [] : events.map((e) => e.value)
              )}
              className="text-xs text-primary mt-1.5 hover:underline"
            >
              {selectedEvents.length === events.length ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!url.trim() || selectedEvents.length === 0 || loading}
          >
            {loading ? "Creating..." : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryLog({ webhookId }: { webhookId: string }) {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/webhooks/${webhookId}/deliveries`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDeliveries(d.deliveries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [webhookId]);

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const res = await fetch(`${API_BASE}/api/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === deliveryId
            ? { ...d, status: result.success ? "success" : "failed", attempts: d.attempts + 1, statusCode: result.statusCode ?? d.statusCode, errorMessage: result.errorMessage ?? d.errorMessage }
            : d
        )
      );
      toast({ title: result.success ? "Retry succeeded" : "Retry failed", variant: result.success ? "default" : "destructive" });
    } catch {
      toast({ title: "Retry failed", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No deliveries yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {deliveries.map((d) => (
        <div key={d.id} className="border border-border/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
            className="w-full flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {expandedId === d.id ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <StatusBadge status={d.status} />
              <span className="text-xs font-medium">{d.event}</span>
              {d.statusCode && (
                <span className="text-xs text-muted-foreground">HTTP {d.statusCode}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
              {d.status === "failed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleRetry(d.id); }}
                  disabled={retryingId === d.id}
                >
                  {retryingId === d.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><RotateCcw className="w-3 h-3 mr-1" /> Retry</>
                  )}
                </Button>
              )}
            </div>
          </button>
          {expandedId === d.id && (
            <div className="border-t border-border/30 p-3 space-y-2 bg-muted/20">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Attempts: {d.attempts}</p>
                {d.deliveredAt && (
                  <p className="text-xs text-muted-foreground">Delivered: {formatDate(d.deliveredAt)}</p>
                )}
              </div>
              {d.errorMessage && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Error</p>
                  <pre className="text-xs bg-red-500/5 border border-red-500/20 rounded p-2 overflow-x-auto">
                    {d.errorMessage}
                  </pre>
                </div>
              )}
              {d.responseBody && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Response</p>
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32">
                    {d.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WebhookCard({
  webhook,
  onDelete,
  onToggle,
}: {
  webhook: WebhookType;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{webhook.url}</span>
              {!webhook.isActive && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">Inactive</span>
              )}
            </CardTitle>
            {webhook.description && (
              <CardDescription className="mt-1 ml-6">{webhook.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {webhook.events.map((ev) => (
            <span
              key={ev}
              className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {ev}
            </span>
          ))}
        </div>

        {webhook.secret && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Signing Secret</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                {showSecret ? webhook.secret : "whsec_••••••••••••••••"}
              </code>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              {webhook.secret && <CopyButton text={webhook.secret} />}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Created {formatDate(webhook.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowDeliveries(!showDeliveries)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {showDeliveries ? "Hide" : "Deliveries"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onToggle(webhook.id, !webhook.isActive)}
            >
              {webhook.isActive ? "Disable" : "Enable"}
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-400">Delete?</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => onDelete(webhook.id)}>
                  Yes
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {showDeliveries && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs font-medium mb-2">Recent Deliveries</p>
            <DeliveryLog webhookId={webhook.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, evRes] = await Promise.all([
        fetch(`${API_BASE}/api/webhooks`, { credentials: "include" }),
        fetch(`${API_BASE}/api/webhooks/events`, { credentials: "include" }),
      ]);
      if (whRes.ok) {
        const d = await whRes.json();
        setWebhooks(d.webhooks || []);
      }
      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.events || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreated = (wh: WebhookType) => {
    setWebhooks((prev) => [wh, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        toast({ title: "Webhook deleted" });
      }
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, isActive } : w));
        toast({ title: isActive ? "Webhook enabled" : "Webhook disabled" });
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Receive HTTP POST notifications when events occur on your projects.
          </p>
        </div>
        <CreateWebhookDialog events={events} onCreated={handleCreated} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="bg-card border-border/50">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-64 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-5 w-16 bg-muted rounded" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-16 text-center">
            <Webhook className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a webhook to receive real-time notifications when events happen.
            </p>
            <CreateWebhookDialog events={events} onCreated={handleCreated} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <WebhookCard
              key={wh.id}
              webhook={wh}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg border border-border/50 bg-muted/20">
        <h3 className="text-sm font-medium mb-2">Verifying Webhook Signatures</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Each webhook delivery includes an <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header.
          Verify it using your signing secret to ensure the payload is authentic.
        </p>
        <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto border border-border/30">
{`const crypto = require('crypto');

function verify(payload, secret, signature) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(payload).digest('hex');
  return expected === signature;
}`}
        </pre>
      </div>
    </div>
  );
}
