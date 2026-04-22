import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Plus, Key, Trash2, Copy, Check, RotateCcw, ExternalLink,
  Shield, Code2, Eye, EyeOff, AlertTriangle, Globe, X, Webhook,
} from "lucide-react";
import WebhookSettings from "@/components/WebhookSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface OauthApp {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  clientSecretPrefix: string;
  redirectUris: string[];
  homepage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthorizedApp {
  id: string;
  scopes: string;
  createdAt: string;
  appId: string;
  appName: string;
  appDescription: string | null;
  appHomepage: string | null;
  appLogoUrl: string | null;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
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

function SecretDisplay({ secret }: { secret: string }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-amber-400 font-medium mb-1">Copy your client secret now. It will not be shown again.</p>
        <code className="text-xs font-mono break-all">
          {visible ? secret : "••••••••••••••••••••••••"}
        </code>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
        <CopyButton text={secret} />
      </div>
    </div>
  );
}

function CreateAppDialog({ onCreated }: { onCreated: (app: OauthApp, secret: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [homepage, setHomepage] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addRedirectUri = () => {
    const uri = redirectUri.trim();
    if (!uri) return;
    try {
      new URL(uri);
      if (!redirectUris.includes(uri)) {
        setRedirectUris([...redirectUris, uri]);
      }
      setRedirectUri("");
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
    }
  };

  const removeRedirectUri = (uri: string) => {
    setRedirectUris(redirectUris.filter((u) => u !== uri));
  };

  const handleCreate = async () => {
    if (!name.trim() || redirectUris.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/oauth/apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          homepage: homepage.trim() || undefined,
          redirectUris,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      onCreated(data.app, data.clientSecret);
      setOpen(false);
      setName("");
      setDescription("");
      setHomepage("");
      setRedirectUris([]);
      toast({ title: "OAuth app created" });
    } catch {
      toast({ title: "Failed to create app", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> New OAuth App
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create OAuth App</DialogTitle>
          <DialogDescription>Register a new OAuth application to integrate with CodeCloud.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Application Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your app"
              rows={2}
            />
          </div>
          <div>
            <Label>Homepage URL (optional)</Label>
            <Input
              value={homepage}
              onChange={(e) => setHomepage(e.target.value)}
              placeholder="https://myapp.com"
            />
          </div>
          <div>
            <Label>Redirect URIs</Label>
            <div className="flex gap-2">
              <Input
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder="https://myapp.com/callback"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRedirectUri())}
              />
              <Button variant="outline" onClick={addRedirectUri} type="button">Add</Button>
            </div>
            {redirectUris.length > 0 && (
              <div className="mt-2 space-y-1">
                {redirectUris.map((uri) => (
                  <div key={uri} className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-1.5 rounded">
                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-mono">{uri}</span>
                    <button onClick={() => removeRedirectUri(uri)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || redirectUris.length === 0 || loading}
          >
            {loading ? "Creating..." : "Create Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppCard({
  app,
  newSecret,
  onDelete,
  onRotateSecret,
}: {
  app: OauthApp;
  newSecret?: string;
  onDelete: (id: string) => void;
  onRotateSecret: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              {app.name}
              {!app.isActive && (
                <span className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Disabled</span>
              )}
            </CardTitle>
            {app.description && (
              <CardDescription className="mt-1">{app.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            {app.homepage && (
              <a href={app.homepage} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {newSecret && <SecretDisplay secret={newSecret} />}

        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Client ID</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                {app.clientId}
              </code>
              <CopyButton text={app.clientId} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Client Secret</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1">
                {app.clientSecretPrefix}
              </code>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Redirect URIs</p>
          <div className="space-y-1">
            {app.redirectUris.map((uri) => (
              <div key={uri} className="flex items-center gap-1.5 text-xs">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono truncate">{uri}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">Created {formatDate(app.createdAt)}</span>
          <div className="flex items-center gap-1">
            {confirmRotate ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-400">Rotate secret?</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { onRotateSecret(app.id); setConfirmRotate(false); }}>
                  Yes
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmRotate(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmRotate(true)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Rotate Secret
              </Button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-400">Delete?</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => onDelete(app.id)}>
                  Yes
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeveloperSettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [apps, setApps] = useState<OauthApp[]>([]);
  const [authorizedApps, setAuthorizedApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSecrets, setNewSecrets] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"apps" | "authorized" | "webhooks">("apps");

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/oauth/apps`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps);
      }
    } catch {}
  }, []);

  const fetchAuthorized = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/oauth/authorized`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuthorizedApps(data.authorizations);
      }
    } catch {}
  }, []);

  useState(() => {
    setLoading(true);
    Promise.all([fetchApps(), fetchAuthorized()]).finally(() => setLoading(false));
  });

  const handleCreated = (app: OauthApp, secret: string) => {
    setApps((prev) => [app, ...prev]);
    setNewSecrets((prev) => ({ ...prev, [app.id]: secret }));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/oauth/apps/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setApps((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "App deleted" });
      }
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleRotateSecret = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/oauth/apps/${id}/rotate-secret`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNewSecrets((prev) => ({ ...prev, [id]: data.clientSecret }));
        toast({ title: "Secret rotated" });
      }
    } catch {
      toast({ title: "Failed to rotate secret", variant: "destructive" });
    }
  };

  const handleRevokeAuth = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/oauth/authorized/${id}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setAuthorizedApps((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "Access revoked" });
      }
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Developer Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage OAuth applications and authorized integrations
            </p>
          </div>
          {activeTab === "apps" && <CreateAppDialog onCreated={handleCreated} />}
        </div>

        <div className="flex gap-1 mb-6 border-b border-border/50">
          <button
            onClick={() => setActiveTab("apps")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "apps"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              OAuth Apps
              {apps.length > 0 && (
                <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{apps.length}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("authorized")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "authorized"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Authorized Apps
              {authorizedApps.length > 0 && (
                <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{authorizedApps.length}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "webhooks"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </div>
          </button>
        </div>

        {activeTab === "webhooks" ? (
          <WebhookSettings />
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-card border-border/50">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-64 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeTab === "apps" ? (
          apps.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-16 text-center">
                <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No OAuth apps yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an OAuth app to let third-party applications integrate with your CodeCloud account.
                </p>
                <CreateAppDialog onCreated={handleCreated} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  newSecret={newSecrets[app.id]}
                  onDelete={handleDelete}
                  onRotateSecret={handleRotateSecret}
                />
              ))}
            </div>
          )
        ) : authorizedApps.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="py-16 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No authorized apps</h3>
              <p className="text-sm text-muted-foreground">
                When you authorize third-party apps to access your account, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {authorizedApps.map((auth) => (
              <Card key={auth.id} className="bg-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {auth.appLogoUrl ? (
                          <img src={auth.appLogoUrl} alt="" className="w-6 h-6 rounded" />
                        ) : (
                          <Key className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{auth.appName}</p>
                          {auth.appHomepage && (
                            <a href={auth.appHomepage} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                        {auth.appDescription && (
                          <p className="text-xs text-muted-foreground">{auth.appDescription}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Scopes: {auth.scopes} &middot; Authorized {formatDate(auth.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleRevokeAuth(auth.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
