import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Key, Smartphone, Monitor, Trash2,
  Check, AlertTriangle, Copy, Download, Eye, EyeOff, RefreshCw, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SSHKey {
  id: string;
  name: string;
  key: string;
  fingerprint: string;
  createdAt: string;
}

const apiUrl = import.meta.env.VITE_API_URL || "";

export default function SecurityPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"2fa" | "ssh">("2fa");

  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string; backupCodes: string[] } | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [sshKeys, setSshKeys] = useState<SSHKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showAddKey, setShowAddKey] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/auth/2fa/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setIs2faEnabled(data.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "ssh") {
      setLoadingKeys(true);
      fetch(`${apiUrl}/api/auth/ssh-keys`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setSshKeys(data.keys || []))
        .catch(() => {})
        .finally(() => setLoadingKeys(false));
    }
  }, [tab]);

  const setup2FA = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/2fa/setup`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setSetupData(data);
      setBackupCodes(data.backupCodes || []);
    } catch {}
  };

  const verify2FA = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: verifyToken }),
      });
      const data = await res.json();
      if (data.success) {
        setIs2faEnabled(true);
        setSetupData(null);
        setShowBackupCodes(true);
        toast({ title: "Two-factor authentication enabled" });
      }
    } catch {}
    setVerifying(false);
  };

  const disable2FA = async () => {
    if (!confirm("Disable two-factor authentication? This will make your account less secure.")) return;
    try {
      await fetch(`${apiUrl}/api/auth/2fa/disable`, { method: "POST", credentials: "include" });
      setIs2faEnabled(false);
      toast({ title: "Two-factor authentication disabled" });
    } catch {}
  };

  const addSSHKey = async () => {
    if (!newKeyName || !newKeyValue) return;
    try {
      const res = await fetch(`${apiUrl}/api/auth/ssh-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newKeyName, publicKey: newKeyValue }),
      });
      const data = await res.json();
      setSshKeys((prev) => [...prev, data.key]);
      setNewKeyName("");
      setNewKeyValue("");
      setShowAddKey(false);
      toast({ title: "SSH key added" });
    } catch {}
  };

  const removeSSHKey = async (keyId: string) => {
    if (!confirm("Remove this SSH key?")) return;
    try {
      await fetch(`${apiUrl}/api/auth/ssh-keys/${keyId}`, { method: "DELETE", credentials: "include" });
      setSshKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast({ title: "SSH key removed" });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/settings"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Account Security</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-6 border-b border-border mb-6">
          {[
            { id: "2fa", label: "Two-Factor Auth", icon: Smartphone },
            { id: "ssh", label: "SSH Keys", icon: Key },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

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

        {tab === "ssh" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{sshKeys.length} SSH key(s)</p>
              <Button size="sm" onClick={() => setShowAddKey(!showAddKey)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Key
              </Button>
            </div>

            {showAddKey && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Key name</label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="My laptop" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Public key</label>
                  <textarea value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="ssh-rsa AAAA... or ssh-ed25519 AAAA..."
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-xs font-mono h-24 resize-none" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addSSHKey} disabled={!newKeyName || !newKeyValue}>Add SSH Key</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddKey(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {loadingKeys ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : sshKeys.length === 0 && !showAddKey ? (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No SSH keys</p>
                <p className="text-xs text-muted-foreground">Add an SSH key to access your containers via terminal</p>
              </div>
            ) : (
              sshKeys.map((key) => (
                <div key={key.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{key.fingerprint}</p>
                    <p className="text-xs text-muted-foreground">Added {new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSSHKey(key.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
