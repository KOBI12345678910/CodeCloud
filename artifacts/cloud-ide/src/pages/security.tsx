import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Smartphone, Monitor, Trash2, Clock,
  AlertTriangle, Copy, Download, RefreshCw, LogOut, CheckCircle2,
  XCircle, Globe, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

interface SecurityOverview {
  twoFactorEnabled: boolean;
  activeSessions: number;
  recentFailedLogins: number;
  authProvider: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  passwordSet: boolean;
  plan: string;
}

interface Session {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

interface LoginEntry {
  id: string;
  success: boolean;
  method: string;
  ipAddress: string | null;
  userAgent: string | null;
  failReason: string | null;
  createdAt: string;
}

type Tab = "overview" | "2fa" | "sessions" | "history";

export default function SecurityPage() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableToken, setDisableToken] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`${apiUrl}/api/security/overview`, { credentials: "include", headers: authHeaders(token) });
      const data = await res.json();
      setOverview(data);
      setIs2faEnabled(data.twoFactorEnabled);
    } catch {}
    setLoadingOverview(false);
  }, [token]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${apiUrl}/api/security/sessions`, { credentials: "include", headers: authHeaders(token) });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {}
    setLoadingSessions(false);
  }, [token]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${apiUrl}/api/security/login-history?limit=50`, { credentials: "include", headers: authHeaders(token) });
      const data = await res.json();
      setLoginHistory(data.history || []);
    } catch {}
    setLoadingHistory(false);
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (tab === "sessions") fetchSessions(); }, [tab, fetchSessions]);
  useEffect(() => { if (tab === "history") fetchHistory(); }, [tab, fetchHistory]);

  const setup2FA = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/security/2fa/setup`, { method: "POST", credentials: "include", headers: authHeaders(token) });
      const data = await res.json();
      if (data.qrCode) {
        setSetupData(data);
        setBackupCodes(data.backupCodes || []);
      }
    } catch {}
  };

  const verify2FA = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${apiUrl}/api/security/2fa/verify`, {
        method: "POST", credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ token: verifyToken }),
      });
      if (res.ok) {
        setIs2faEnabled(true);
        setSetupData(null);
        setShowBackupCodes(true);
        toast({ title: "2FA enabled successfully" });
        fetchOverview();
      } else {
        const err = await res.json();
        toast({ title: "Verification failed", description: err.error, variant: "destructive" });
      }
    } catch {}
    setVerifying(false);
  };

  const disable2FA = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/security/2fa/disable`, {
        method: "POST", credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ token: disableToken }),
      });
      if (res.ok) {
        setIs2faEnabled(false);
        setShowDisable(false);
        setDisableToken("");
        toast({ title: "2FA disabled" });
        fetchOverview();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.error, variant: "destructive" });
      }
    } catch {}
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await fetch(`${apiUrl}/api/security/sessions/${sessionId}`, { method: "DELETE", credentials: "include", headers: authHeaders(token) });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({ title: "Session revoked" });
    } catch {}
  };

  const revokeAllOther = async () => {
    try {
      await fetch(`${apiUrl}/api/security/sessions/revoke-all`, {
        method: "POST", credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({ exceptCurrent: true }),
      });
      fetchSessions();
      toast({ title: "All other sessions revoked" });
    } catch {}
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "2fa", label: "Two-Factor Auth", icon: Smartphone },
    { id: "sessions", label: "Active Sessions", icon: Monitor },
    { id: "history", label: "Login History", icon: History },
  ];

  const securityScore = overview
    ? [overview.twoFactorEnabled, overview.emailVerified, overview.passwordSet, overview.recentFailedLogins === 0]
        .filter(Boolean).length * 25
    : 0;

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
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium whitespace-nowrap transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className={`text-3xl font-bold mb-1 ${securityScore >= 75 ? "text-green-500" : securityScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                  {securityScore}%
                </div>
                <p className="text-xs text-muted-foreground">Security Score</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className="text-3xl font-bold mb-1">{overview?.activeSessions ?? "—"}</div>
                <p className="text-xs text-muted-foreground">Active Sessions</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className={`text-3xl font-bold mb-1 ${(overview?.recentFailedLogins ?? 0) > 0 ? "text-red-500" : "text-green-500"}`}>
                  {overview?.recentFailedLogins ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Recent Failed Logins</p>
              </div>
            </div>

            {loadingOverview ? (
              <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : overview ? (
              <div className="space-y-3">
                <SecurityCheckItem
                  ok={overview.twoFactorEnabled}
                  label="Two-Factor Authentication"
                  good="Enabled"
                  bad="Not enabled"
                  action={!overview.twoFactorEnabled ? () => setTab("2fa") : undefined}
                  actionLabel="Enable"
                />
                <SecurityCheckItem
                  ok={overview.emailVerified}
                  label="Email Verified"
                  good="Verified"
                  bad="Not verified"
                />
                <SecurityCheckItem
                  ok={overview.passwordSet}
                  label="Password Set"
                  good="Password configured"
                  bad={`Using ${overview.authProvider} only`}
                />
                <SecurityCheckItem
                  ok={overview.recentFailedLogins === 0}
                  label="No Recent Suspicious Activity"
                  good="No failed logins"
                  bad={`${overview.recentFailedLogins} failed login attempt(s)`}
                  action={overview.recentFailedLogins > 0 ? () => setTab("history") : undefined}
                  actionLabel="View History"
                />
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-muted-foreground">
                      {overview.lastLoginAt ? new Date(overview.lastLoginAt).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
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
                      {is2faEnabled ? "Your account is protected with TOTP" : "Add an extra layer of security to your account"}
                    </p>
                  </div>
                </div>
                {is2faEnabled ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)}>Disable</Button>
                ) : (
                  <Button size="sm" onClick={setup2FA}>Enable 2FA</Button>
                )}
              </div>
            </div>

            {showDisable && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-destructive">Disable Two-Factor Authentication</h3>
                <p className="text-xs text-muted-foreground">Enter your current TOTP code to confirm:</p>
                <div className="flex gap-2">
                  <Input value={disableToken} onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, "").substring(0, 6))}
                    placeholder="000000" maxLength={6} className="w-40 text-center text-lg font-mono tracking-widest" />
                  <Button variant="destructive" size="sm" onClick={disable2FA} disabled={disableToken.length !== 6}>Confirm Disable</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowDisable(false); setDisableToken(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            {setupData && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <h3 className="text-sm font-semibold">Step 1: Scan QR Code</h3>
                <p className="text-xs text-muted-foreground">Scan with Google Authenticator, Authy, or any TOTP app:</p>
                <div className="flex justify-center">
                  <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
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
                    <p className="text-xs text-muted-foreground mt-1">Store these codes safely. Each can only be used once.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-mono text-center">{code}</code>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
                    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "codecloud-backup-codes.txt"; a.click();
                  }}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast({ title: "Copied" }); }}>
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
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={fetchSessions}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
                {sessions.length > 1 && (
                  <Button variant="destructive" size="sm" onClick={revokeAllOther}><LogOut className="w-3.5 h-3.5 mr-1" /> Revoke All Others</Button>
                )}
              </div>
            </div>

            {loadingSessions ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active sessions</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${s.isCurrent ? "border-primary/40" : "border-border"}`}>
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{s.deviceLabel}</p>
                      {s.isCurrent && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Current</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {s.ipAddress && <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{s.ipAddress}</span>}
                      <span className="text-xs text-muted-foreground">Last active: {new Date(s.lastActiveAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button variant="ghost" size="sm" onClick={() => revokeSession(s.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{loginHistory.length} login event(s)</p>
              <Button variant="ghost" size="sm" onClick={fetchHistory}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">{[1,2,3,4,5].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No login history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {loginHistory.map((entry) => (
                  <div key={entry.id} className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 ${entry.success ? "border-border" : "border-red-500/30"}`}>
                    {entry.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{entry.success ? "Successful login" : "Failed login"}</p>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{entry.method}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {entry.ipAddress && <span className="text-xs text-muted-foreground">{entry.ipAddress}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                        {entry.failReason && <span className="text-xs text-red-400">{entry.failReason}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityCheckItem({ ok, label, good, bad, action, actionLabel }: {
  ok: boolean; label: string; good: string; bad: string;
  action?: () => void; actionLabel?: string;
}) {
  return (
    <div className={`border rounded-xl p-4 flex items-center gap-3 ${ok ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
      {ok ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{ok ? good : bad}</p>
      </div>
      {action && <Button variant="outline" size="sm" onClick={action}>{actionLabel}</Button>}
    </div>
  );
}
