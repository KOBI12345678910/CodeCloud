import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Code2, LogOut, ArrowLeft, Key, Copy, Eye, EyeOff, Trash2, Shield, Palette,
  Zap, Check, CreditCard, User, Settings, AlertTriangle, Camera, Lock, Sparkles,
} from "lucide-react";
import MultiAiSettings from "@/components/ide/MultiAiSettings";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type TabId = "profile" | "account" | "editor" | "billing" | "api-keys" | "multi-ai";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Shield },
  { id: "editor", label: "Editor", icon: Settings },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "multi-ai", label: "Multi-AI", icon: Sparkles },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [fontSize, setFontSize] = useState("14");
  const [tabSize, setTabSize] = useState("2");
  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key?: string; keyPrefix?: string; createdAt?: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showKey, setShowKey] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "api-keys") {
      fetch(`${import.meta.env.VITE_API_URL || ""}/api/settings/api-keys`, { credentials: "include" })
        .then((r) => r.json())
        .then((keys) => setApiKeys(keys))
        .catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
      setBio((profile as any)?.bio || "");
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { data: { displayName, username } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Profile updated" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    toast({ title: "Password updated" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") return;
    toast({ title: "Account deletion requested" });
    setDeleteConfirmOpen(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()} data-testid="button-signout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <nav className="sm:w-48 shrink-0 flex sm:flex-col gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-6 min-w-0">
            {activeTab === "profile" && (
              <>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Profile</CardTitle>
                    <CardDescription>Manage your public profile information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="relative group">
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} alt="" className="w-20 h-20 rounded-full" data-testid="profile-avatar" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                            {(displayName || username || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <button className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid="button-upload-avatar">
                          <Camera className="w-5 h-5 text-white" />
                        </button>
                      </div>
                      <div>
                        <p className="font-medium">{user?.fullName || profile?.displayName || "User"}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      </div>
                    </div>
                    <div>
                      <Label>Display Name</Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" data-testid="input-display-name" />
                    </div>
                    <div>
                      <Label>Username</Label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" data-testid="input-username" />
                    </div>
                    <div>
                      <Label>Bio</Label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
                        data-testid="input-bio"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={profile?.email || ""} disabled className="bg-muted/30" data-testid="input-email" />
                      <p className="text-xs text-muted-foreground mt-1">Email is managed through your authentication provider</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} data-testid="button-save-profile">
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "account" && (
              <>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Current Password</Label>
                      <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" data-testid="input-current-password" />
                    </div>
                    <div>
                      <Label>New Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" data-testid="input-new-password" />
                    </div>
                    <div>
                      <Label>Confirm New Password</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" data-testid="input-confirm-password" />
                    </div>
                    <Button onClick={handleChangePassword} data-testid="button-change-password">
                      <Lock className="w-4 h-4 mr-2" /> Update Password
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-destructive/30">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Permanently delete your account and all data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, all projects, files, and data will be permanently removed. This action cannot be undone.
                    </p>
                    <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-account">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                    </Button>
                  </CardContent>
                </Card>

                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" /> Delete Account
                      </DialogTitle>
                      <DialogDescription>
                        This will permanently delete your account and all associated data. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                        <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" data-testid="input-delete-confirm" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(""); }}>Cancel</Button>
                        <Button variant="destructive" disabled={deleteConfirmText !== "DELETE"} onClick={handleDeleteAccount} data-testid="button-confirm-delete">
                          Delete My Account
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {activeTab === "editor" && (
              <>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Editor Preferences</CardTitle>
                    <CardDescription>Customize your code editing experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Theme</Label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setTheme("dark")}
                          className={`flex-1 p-4 rounded-lg bg-[hsl(222,47%,11%)] text-white text-center text-sm font-medium ${theme === "dark" ? "ring-2 ring-primary" : "border border-border/50"}`}
                          data-testid="theme-dark"
                        >
                          Dark
                        </button>
                        <button
                          onClick={() => setTheme("light")}
                          className={`flex-1 p-4 rounded-lg bg-white text-gray-900 text-center text-sm font-medium ${theme === "light" ? "ring-2 ring-primary" : "border border-border/50"}`}
                          data-testid="theme-light"
                        >
                          Light
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Font Size</Label>
                        <Select value={fontSize} onValueChange={setFontSize}>
                          <SelectTrigger data-testid="select-font-size">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["12", "13", "14", "15", "16", "18", "20", "24"].map((s) => (
                              <SelectItem key={s} value={s}>{s}px</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tab Size</Label>
                        <Select value={tabSize} onValueChange={setTabSize}>
                          <SelectTrigger data-testid="select-tab-size">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["2", "4", "8"].map((s) => (
                              <SelectItem key={s} value={s}>{s} spaces</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Word Wrap</Label>
                          <p className="text-xs text-muted-foreground">Wrap long lines to fit the editor width</p>
                        </div>
                        <Switch checked={wordWrap} onCheckedChange={setWordWrap} data-testid="switch-word-wrap" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Minimap</Label>
                          <p className="text-xs text-muted-foreground">Show a miniature overview of the file</p>
                        </div>
                        <Switch checked={minimap} onCheckedChange={setMinimap} data-testid="switch-minimap" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto Save</Label>
                          <p className="text-xs text-muted-foreground">Automatically save files after changes</p>
                        </div>
                        <Switch checked={autoSave} onCheckedChange={setAutoSave} data-testid="switch-auto-save" />
                      </div>
                    </div>

                    <Button onClick={() => toast({ title: "Editor preferences saved" })} data-testid="button-save-editor">
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "billing" && (
              <>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Current Plan</CardTitle>
                    <CardDescription>Manage your subscription and billing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-lg font-bold capitalize">{profile?.plan || "Free"} Plan</p>
                          <p className="text-sm text-muted-foreground">$0 / month</p>
                        </div>
                        <Link href="/pricing">
                          <Button size="sm">
                            <Zap className="w-3 h-3 mr-1" /> Upgrade to Pro
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2 text-sm">
                        {["3 projects", "1 GB storage", "Shared compute", "Community support"].map((f) => (
                          <div key={f} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">Usage This Month</h4>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Projects</span>
                          <span className="font-medium">0 / 3</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: "0%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Storage</span>
                          <span className="font-medium">{Math.round((profile?.storageUsedBytes ?? 0) / 1024 / 1024)} MB / 1,024 MB</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((profile?.storageUsedBytes ?? 0) / 1073741824) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Deployments</span>
                          <span className="font-medium">0 / 10</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: "0%" }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Payment Method</CardTitle>
                    <CardDescription>Add a payment method to upgrade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/pricing">
                      <Button variant="outline" className="w-full" data-testid="button-add-payment">
                        <CreditCard className="w-4 h-4 mr-2" /> Add Payment Method
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Billing History</CardTitle>
                    <CardDescription>Your recent invoices and payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No billing history yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Invoices will appear here when you upgrade to a paid plan</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "api-keys" && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name (e.g. CI/CD)"
                      className="flex-1"
                      data-testid="input-api-key-name"
                    />
                    <Button
                      onClick={() => {
                        if (!newKeyName.trim()) return;
                        fetch(`${import.meta.env.VITE_API_URL || ""}/api/settings/api-keys`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ name: newKeyName.trim() }),
                        })
                          .then((r) => r.json())
                          .then((newKey) => {
                            setRevealedKey(newKey.key);
                            setApiKeys((prev) => [...prev, newKey]);
                            setShowKey(newKey.id);
                            setNewKeyName("");
                            toast({ title: "API key created. Copy it now — it won't be shown again." });
                          })
                          .catch(() => toast({ title: "Failed to create key", variant: "destructive" }));
                      }}
                      data-testid="button-create-api-key"
                    >
                      <Key className="w-4 h-4 mr-2" /> Generate
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No API keys yet. Create one to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{k.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {showKey === k.id && (k.key || revealedKey) ? (k.key || revealedKey) : `${k.keyPrefix || k.key?.slice(0, 8) || "cc_"}${"*".repeat(20)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(showKey === k.id ? null : k.id)}>
                              {showKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            {(k.key || revealedKey) && showKey === k.id && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(k.key || revealedKey || ""); toast({ title: "Copied" }); }}>
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => {
                                fetch(`${import.meta.env.VITE_API_URL || ""}/api/settings/api-keys/${k.id}`, {
                                  method: "DELETE",
                                  credentials: "include",
                                })
                                  .then(() => {
                                    setApiKeys((prev) => prev.filter((x) => x.id !== k.id));
                                    toast({ title: "API key deleted" });
                                  })
                                  .catch(() => toast({ title: "Failed to delete", variant: "destructive" }));
                              }}
                              data-testid={`button-revoke-key-${k.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "multi-ai" && (
              <MultiAiSettings />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
