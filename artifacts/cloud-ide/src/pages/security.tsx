import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Key, Smartphone, Monitor, Trash2,
  Check, AlertTriangle, Copy, Download, Eye, EyeOff, RefreshCw, Plus,
  Globe, Clock, LogOut, Activity, Lock, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const apiUrl = import.meta.env.VITE_API_URL || "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${apiUrl}/api${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts.headers || {}) },
    credentials: "include",
  });
  return res;
}

interface Session {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  active: boolean;
  lastActivity: string;
  createdAt: string;
}

interface LoginEntry {
  id: string;
  action: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  method: string;
  failureReason: string | null;
  createdAt: string;
}

interface ApiKeyEntry {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface SecurityOverview {
  twoFactor: { enabled: boolean; method: string | null };
  sessions: { active: number; list: Session[] };
  loginHistory: LoginEntry[];
  apiKeys: { total: number; active: number; list: ApiKeyEntry[] };
  securityScore: { score: number; maxScore: number; recommendations: string[] };
}

type TabId = "overview" | "2fa" | "sessions" | "history" | "apikeys";

export default function SecurityPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string; backupCodes: string[] } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("read");
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/security/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setIs2faEnabled(data.twoFactor.enabled);
        setSessions(data.sessions.list);
        setLoginHistory(data.loginHistory);
        setApiKeys(data.apiKeys.list);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const setup2FA = async () => {
    try {
      const res = await apiFetch("/two-factor/setup", { method: "POST" });
      const data = await res.json();
      setSetupData(data);
      setBackupCodes(data.backupCodes || []);
    } catch {}
  };

  const verify2FA = async () => {
    setVerifying(true);
    try {
      const res = await apiFetch("/two-factor/verify", {
        method: "POST",
        body: JSON.stringify({ code: verifyToken }),
      });
      const data = await res.json();
      if (data.success) {
        setIs2faEnabled(true);
        setSetupData(null);
        setShowBackupCodes(true);
        toast({ title: "Two-factor authentication enabled" });
        loadOverview();
      } else {
        toast({ title: "Invalid code", variant: "destructive" });
      }
    } catch {}
    setVerifying(false);
  };

  const disable2FA = async () => {
    if (!confirm("Disable two-factor authentication? This will make your account less secure.")) return;
    try {
      await apiFetch("/two-factor/disable", { method: "POST", body: JSON.stringify({}) });
      setIs2faEnabled(false);
      toast({ title: "Two-factor authentication disabled" });
      loadOverview();
    } catch {}
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiFetch(`/session-manager/${sessionId}/revoke`, { method: "POST" });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({ title: "Session revoked" });
    } catch {}
  };

  const revokeAllSessions = async () => {
    if (!confirm("Revoke all other sessions? You will remain logged in on this device.")) return;
    try {
      await apiFetch("/session-manager/revoke-all", { method: "POST" });
      loadOverview();
      toast({ title: "All other sessions revoked" });
    } catch {}
  };

  const createApiKeyHandler = async () => {
    if (!newKeyName) return;
    try {
      const res = await apiFetch("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName, scopes: newKeyScope, scopeDetails: { accessLevel: newKeyScope, resources: ["*"] } }),
      });
      const data = await res.json();
      if (data.rawKey) {
        setNewKeyResult(data.rawKey);
        setApiKeys(prev => [...prev, data.key]);
        setNewKeyName("");
        toast({ title: "API key created" });
      }
    } catch {}
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm("Revoke this API key?")) return;
    try {
      await apiFetch(`/api-keys/${keyId}/revoke`, { method: "POST" });
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
      toast({ title: "API key revoked" });
    } catch {}
  };

  const loadLoginHistory = async () => {
    try {
      const res = await apiFetch("/security/login-history?limit=50");
      if (res.ok) setLoginHistory(await res.json());
    } catch {}
  };

  const loadSessions = async () => {
    try {
      const res = await apiFetch("/session-manager/sessions");
      if (res.ok) setSessions(await res.json());
    } catch {}
  };

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "2fa", label: "Two-Factor Auth", icon: Fingerprint },
    { id: "sessions", label: "Sessions", icon: Monitor },
    { id: "history", label: "Login History", icon: Clock },
    { id: "apikeys", label: "API Keys", icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/settings"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Security Center</h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-4 border-b border-border mb-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => {
              setTab(id);
              if (id === "history") loadLoginHistory();
              if (id === "sessions") loadSessions();
            }}
              className={`flex items-center gap-2 pb-3 text-sm font-medium whitespace-nowrap transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : overview && (
              <>
                <div className={`border rounded-xl p-6 ${overview.securityScore.score >= 80 ? "bg-green-500/5 border-green-500/30" : overview.securityScore.score >= 50 ? "bg-yellow-500/5 border-yellow-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Security Score</h3>
                    <span className={`text-2xl font-bold ${overview.securityScore.score >= 80 ? "text-green-500" : overview.securityScore.score >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                      {overview.securityScore.score}/{overview.securityScore.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div className={`h-2 rounded-full ${overview.securityScore.score >= 80 ? "bg-green-500" : overview.securityScore.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${overview.securityScore.score}%` }} />
                  </div>
                  {overview.securityScore.recommendations.length > 0 && (
                    <div className="space-y-2">
                      {overview.securityScore.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-yellow-500 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${is2faEnabled ? "bg-green-500/20" : "bg-red-500/20"}`}>
                        <Fingerprint className={`w-4 h-4 ${is2faEnabled ? "text-green-500" : "text-red-500"}`} />
                      </div>
                      <span className="text-sm font-medium">Two-Factor Auth</span>
                    </div>
                    <p className={`text-xs ${is2faEnabled ? "text-green-500" : "text-red-500"}`}>
                      {is2faEnabled ? "Enabled" : "Not enabled"}
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20">
                        <Monitor className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium">Active Sessions</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{overview.sessions.active} active session(s)</p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20">
                        <Key className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="text-sm font-medium">API Keys</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{overview.apiKeys.active} active key(s)</p>
                  </div>
                </div>

                {overview.loginHistory.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3">Recent Login Activity</h3>
                    <div className="space-y-2">
                      {overview.loginHistory.slice(0, 5).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${entry.success ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-muted-foreground">{entry.ipAddress}</span>
                            <span>{entry.success ? "Successful login" : `Failed: ${entry.failureReason || "unknown"}`}</span>
                          </div>
                          <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "2fa" && (
          <div className="space-y-6">
            <div className={`border rounded-xl p-6 ${is2faEnabled ? "bg-green-500/5 border-green-500/30" : "bg-card border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${is2faEnabled ? "bg-green-500/20" : "bg-muted"}`}>
                    <Shield className={`w-5 h-5 ${is2faEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Two-Factor Authentication</h3>
                    <p className="text-xs text-muted-foreground">
                      {is2faEnabled ? "Your account is protected with 2FA" : "Add an extra layer of security"}
                    </p>
                  </div>
                </div>
                {is2faEnabled ? (
                  <Button variant="destructive" size="sm" onClick={disable2FA}>Disable</Button>
                ) : (
                  <Button size="sm" onClick={setup2FA}>Enable 2FA</Button>
                )}
              </div>
            </div>

            {setupData && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <h3 className="text-sm font-semibold">Step 1: Scan QR Code</h3>
                <p className="text-xs text-muted-foreground">Scan this QR code with Google Authenticator, Authy, or any TOTP app:</p>
                <div className="flex justify-center">
                  <img src={setupData.qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
                </div>
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer">Can't scan? Enter code manually</summary>
                  <code className="block mt-2 bg-muted p-2 rounded font-mono break-all">{setupData.secret}</code>
                </details>
                <h3 className="text-sm font-semibold pt-4">Step 2: Verify</h3>
                <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app:</p>
                <div className="flex gap-2">
                  <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, "").substring(0, 6))}
                    placeholder="000000" maxLength={6} className="w-40 text-center text-lg font-mono tracking-widest" />
                  <Button onClick={verify2FA} disabled={verifyToken.length !== 6 || verifying}>
                    {verifying ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </div>
              </div>
            )}

            {showBackupCodes && backupCodes.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold">Save your backup codes</h3>
                    <p className="text-xs text-muted-foreground mt-1">Store these codes in a safe place. Each code can only be used once.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-mono text-center">{code}</code>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const text = backupCodes.join("\n");
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "codecloud-backup-codes.txt"; a.click();
                  }}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(backupCodes.join("\n"))}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowBackupCodes(false)} className="ml-auto">Done</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "sessions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{sessions.length} active session(s)</p>
              <Button variant="destructive" size="sm" onClick={revokeAllSessions} disabled={sessions.length <= 1}>
                <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke All Others
              </Button>
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active sessions</p>
              </div>
            ) : sessions.map(session => (
              <div key={session.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{session.deviceInfo || "Unknown Device"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{session.ipAddress}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(session.lastActivity).toLocaleString()}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeSession(session.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Recent login activity</p>
              <Button variant="ghost" size="sm" onClick={loadLoginHistory}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
            {loginHistory.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No login history</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {loginHistory.map(entry => (
                  <div key={entry.id} className="p-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.success ? "bg-green-500/20" : "bg-red-500/20"}`}>
                      {entry.success ? <Check className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {entry.success ? "Successful login" : "Failed login attempt"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{entry.ipAddress}</span>
                        {entry.method && <span className="bg-muted px-2 py-0.5 rounded">{entry.method}</span>}
                        {entry.failureReason && <span className="text-red-400">{entry.failureReason}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "apikeys" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{apiKeys.filter(k => k.isActive).length} active API key(s)</p>
              <Button size="sm" onClick={() => { setShowAddKey(!showAddKey); setNewKeyResult(null); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Key
              </Button>
            </div>

            {newKeyResult && (
              <div className="bg-green-500/5 border border-green-500/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Your new API key (copy it now, it won't be shown again):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">{newKeyResult}</code>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(newKeyResult); toast({ title: "Copied" }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {showAddKey && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Key name</label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="My CI/CD Key" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Access level</label>
                  <select value={newKeyScope} onChange={(e) => setNewKeyScope(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm">
                    <option value="read">Read Only</option>
                    <option value="write">Read & Write</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createApiKeyHandler} disabled={!newKeyName}>Create API Key</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddKey(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {apiKeys.length === 0 && !showAddKey ? (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No API keys</p>
                <p className="text-xs text-muted-foreground">Create an API key to access the CodeCloud API programmatically</p>
              </div>
            ) : apiKeys.map(key => (
              <div key={key.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Key className={`w-5 h-5 ${key.isActive ? "text-muted-foreground" : "text-red-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{key.name}</p>
                    {!key.isActive && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Revoked</span>}
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{key.scopes}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <code>{key.keyPrefix}...</code>
                    {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {key.isActive && (
                  <Button variant="ghost" size="sm" onClick={() => revokeApiKey(key.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
