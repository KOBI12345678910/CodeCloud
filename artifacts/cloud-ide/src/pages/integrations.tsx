import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Code2, Search, Plus, Trash2, ExternalLink, Webhook,
  MessageSquare, Hash, LayoutList, Blocks, FileText, Palette,
  Check, X, Loader2, ArrowLeft, Settings2, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const API_URL = import.meta.env.VITE_API_URL || "";

interface CatalogIntegration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  features: string[];
  docsUrl: string;
  requiredScopes: string[];
}

interface InstalledIntegration {
  id: string;
  provider: string;
  status: string;
  webhookUrl: string | null;
  externalAccountName: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  slack: <MessageSquare className="w-6 h-6" />,
  discord: <Hash className="w-6 h-6" />,
  jira: <LayoutList className="w-6 h-6" />,
  linear: <Blocks className="w-6 h-6" />,
  notion: <FileText className="w-6 h-6" />,
  figma: <Palette className="w-6 h-6" />,
};

const COLOR_MAP: Record<string, string> = {
  slack: "bg-[#4A154B]",
  discord: "bg-[#5865F2]",
  jira: "bg-[#0052CC]",
  linear: "bg-[#5E6AD2]",
  notion: "bg-[#000000]",
  figma: "bg-[#F24E1E]",
};

const CATEGORY_LABELS: Record<string, string> = {
  communication: "Communication",
  "project-management": "Project Management",
  documentation: "Documentation",
  design: "Design",
};

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<CatalogIntegration[]>([]);
  const [installed, setInstalled] = useState<InstalledIntegration[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [webhookModal, setWebhookModal] = useState<InstalledIntegration | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<CatalogIntegration | null>(null);

  useState(() => {
    loadData();
  });

  async function loadData() {
    setIsLoading(true);
    try {
      const [catalogRes] = await Promise.all([
        fetch(`${API_URL}/api/integrations/catalog`, { credentials: "include" }),
      ]);
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setCatalog(data.integrations);
      }
    } catch {
      // catalog load failed
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInstall(providerId: string) {
    setInstalling(providerId);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const newIntegration: InstalledIntegration = {
        id: crypto.randomUUID(),
        provider: providerId,
        status: "connected",
        webhookUrl: null,
        externalAccountName: `${providerId}-workspace`,
        lastSyncAt: null,
        createdAt: new Date().toISOString(),
      };
      setInstalled((prev) => [...prev, newIntegration]);
    } finally {
      setInstalling(null);
    }
  }

  async function handleRemove(integrationId: string) {
    setRemoving(integrationId);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setInstalled((prev) => prev.filter((i) => i.id !== integrationId));
    } finally {
      setRemoving(null);
    }
  }

  async function handleWebhookSave() {
    if (!webhookModal) return;
    setWebhookSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setInstalled((prev) =>
        prev.map((i) =>
          i.id === webhookModal.id ? { ...i, webhookUrl: webhookUrl } : i
        )
      );
      setWebhookModal(null);
      setWebhookUrl("");
    } finally {
      setWebhookSaving(false);
    }
  }

  const installedProviders = new Set(installed.map((i) => i.provider));

  const categories = useMemo(() => {
    const cats = new Set(catalog.map((c) => c.category));
    return ["all", ...Array.from(cats)];
  }, [catalog]);

  const filtered = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [catalog, search, categoryFilter]);

  return (
    <div className="min-h-screen bg-background" data-testid="integrations-page">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold">Integrations</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Integration Marketplace</h2>
          <p className="text-muted-foreground mt-1">
            Connect your favorite tools to supercharge your development workflow
          </p>
        </div>

        {installed.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Installed ({installed.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installed.map((integration) => {
                const info = catalog.find((c) => c.id === integration.provider);
                return (
                  <div
                    key={integration.id}
                    className="border border-border rounded-xl p-4 bg-card flex flex-col gap-3"
                    data-testid={`installed-${integration.provider}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[integration.provider] || "bg-muted"} flex items-center justify-center text-white`}>
                          {ICON_MAP[integration.provider]}
                        </div>
                        <div>
                          <p className="font-medium">{info?.name || integration.provider}</p>
                          <p className="text-xs text-muted-foreground">{integration.externalAccountName}</p>
                        </div>
                      </div>
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"} className="text-xs">
                        {integration.status === "connected" ? (
                          <><Check className="w-3 h-3 mr-1" />Connected</>
                        ) : (
                          integration.status
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setWebhookModal(integration);
                          setWebhookUrl(integration.webhookUrl || "");
                        }}
                      >
                        <Webhook className="w-3 h-3 mr-1" />
                        Webhook
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(integration.id)}
                        disabled={removing === integration.id}
                      >
                        {removing === integration.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
              data-testid="search-integrations"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={categoryFilter === cat ? "default" : "outline"}
                onClick={() => setCategoryFilter(cat)}
                className="text-xs"
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-border rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                </div>
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="catalog-grid">
            {filtered.map((item) => {
              const isInstalled = installedProviders.has(item.id);
              return (
                <div
                  key={item.id}
                  className="border border-border rounded-xl p-5 bg-card hover:border-primary/30 transition-colors group cursor-pointer"
                  onClick={() => setDetailModal(item)}
                  data-testid={`catalog-${item.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${COLOR_MAP[item.id] || "bg-muted"} flex items-center justify-center text-white`}>
                        {ICON_MAP[item.id]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </p>
                      </div>
                    </div>
                    {isInstalled && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />Installed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.features.slice(0, 3).map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {f}
                      </span>
                    ))}
                    {item.features.length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        +{item.features.length - 3}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={isInstalled ? "outline" : "default"}
                    disabled={isInstalled || installing === item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isInstalled) handleInstall(item.id);
                    }}
                    data-testid={`install-${item.id}`}
                  >
                    {installing === item.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" />Connecting...</>
                    ) : isInstalled ? (
                      <><Check className="w-3 h-3 mr-1" />Installed</>
                    ) : (
                      <><Plus className="w-3 h-3 mr-1" />Install</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium">No integrations found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term or category</p>
          </div>
        )}
      </main>

      <Dialog open={!!webhookModal} onOpenChange={() => setWebhookModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Webhook</DialogTitle>
            <DialogDescription>
              Set a webhook URL to receive events from {webhookModal?.provider}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="mt-1.5"
              data-testid="input-webhook-url"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleWebhookSave} disabled={webhookSaving || !webhookUrl}>
              {webhookSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-lg ${COLOR_MAP[detailModal?.id || ""] || "bg-muted"} flex items-center justify-center text-white`}>
                {ICON_MAP[detailModal?.id || ""]}
              </div>
              <div>
                <DialogTitle>{detailModal?.name}</DialogTitle>
                <DialogDescription>{CATEGORY_LABELS[detailModal?.category || ""] || detailModal?.category}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{detailModal?.description}</p>
          <div className="mt-2">
            <p className="text-sm font-medium mb-2">Features</p>
            <div className="space-y-1.5">
              {detailModal?.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium mb-1">Required Scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {detailModal?.requiredScopes.map((s) => (
                <code key={s} className="text-xs px-2 py-0.5 rounded bg-muted">{s}</code>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <a href={detailModal?.docsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                Docs
              </a>
            </Button>
            {installedProviders.has(detailModal?.id || "") ? (
              <Button size="sm" variant="outline" disabled>
                <Check className="w-3 h-3 mr-1" />Installed
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  if (detailModal) handleInstall(detailModal.id);
                  setDetailModal(null);
                }}
                disabled={installing !== null}
              >
                <Plus className="w-3 h-3 mr-1" />Install
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
