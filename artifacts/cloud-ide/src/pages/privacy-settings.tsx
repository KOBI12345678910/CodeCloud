import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Download, Trash2, FileText, Clock,
  AlertTriangle, Check, X, RefreshCw, Edit, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const apiUrl = import.meta.env.VITE_API_URL || "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${apiUrl}/api${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts.headers || {}) },
    credentials: "include",
  });
}

interface DsarRequest {
  id: string;
  type: "export" | "deletion";
  status: string;
  downloadUrl: string | null;
  scheduledPurgeAt: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

type TabId = "overview" | "export" | "deletion" | "rectification";

export default function PrivacySettingsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [requests, setRequests] = useState<DsarRequest[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({ displayName: "", username: "", bio: "" });
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, profileRes] = await Promise.all([
        apiFetch("/privacy/requests"),
        apiFetch("/privacy/profile"),
      ]);
      if (reqRes.ok) setRequests(await reqRes.json());
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
        setEditFields({ displayName: p.displayName || "", username: p.username || "", bio: p.bio || "" });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const requestExport = async () => {
    try {
      const res = await apiFetch("/privacy/export", { method: "POST" });
      if (res.ok) {
        toast({ title: "Data export requested. You will be notified when ready." });
        loadData();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed to request export", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to request export", variant: "destructive" });
    }
  };

  const requestDeletion = async () => {
    if (deleteConfirm !== "DELETE") return;
    try {
      const res = await apiFetch("/privacy/deletion", {
        method: "POST",
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (res.ok) {
        toast({ title: "Account deletion scheduled. 30-day grace period started." });
        setDeleteConfirm("");
        setDeleteReason("");
        loadData();
      }
    } catch {}
  };

  const cancelDeletionReq = async (id: string) => {
    try {
      const res = await apiFetch(`/privacy/deletion/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Deletion request cancelled" });
        loadData();
      }
    } catch {}
  };

  const saveProfile = async () => {
    try {
      const res = await apiFetch("/privacy/profile", {
        method: "PATCH",
        body: JSON.stringify(editFields),
      });
      if (res.ok) {
        toast({ title: "Profile updated (Right to Rectification)" });
        setEditMode(false);
        loadData();
      }
    } catch {}
  };

  const exportRequests = requests.filter(r => r.type === "export");
  const deletionRequests = requests.filter(r => r.type === "deletion");
  const pendingDeletion = deletionRequests.find(r => r.status === "pending");

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "export", label: "Data Export", icon: Download },
    { id: "deletion", label: "Account Deletion", icon: Trash2 },
    { id: "rectification", label: "Edit Data", icon: Edit },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="privacy-settings-page">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/settings"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Privacy & Data</h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-4 border-b border-border mb-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium whitespace-nowrap transition ${tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Your Privacy Rights</CardTitle>
                <CardDescription>Under GDPR, CCPA, and similar regulations, you have the right to access, export, correct, and delete your personal data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Right to Access & Portability</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Request a full export of your data including projects, profile, and activity history.</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Right to Erasure</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Request permanent deletion of your account and all associated data.</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Right to Rectification</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Correct or update any of your personal data at any time.</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Consent Management</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Control what data is collected through cookie and tracking preferences.</p>
                  </div>
                </div>

                {pendingDeletion && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-500">Account Deletion Pending</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your account is scheduled for deletion on {new Date(pendingDeletion.scheduledPurgeAt!).toLocaleDateString()}.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => cancelDeletionReq(pendingDeletion.id)}>
                        Cancel Deletion
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {requests.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Recent Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {requests.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          {r.type === "export" ? <Download className="w-4 h-4 text-blue-500" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                          <span className="capitalize">{r.type} request</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${r.status === "completed" ? "bg-green-500/20 text-green-500" : r.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : r.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-blue-500/20 text-blue-500"}`}>
                            {r.status}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Request Data Export</CardTitle>
                <CardDescription>Download a complete copy of all your data. This includes your profile, projects, files, conversations, billing history, and consent records. Rate limited to one request per 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={requestExport}>
                  <Download className="w-4 h-4 mr-2" /> Request Data Export
                </Button>
              </CardContent>
            </Card>

            {exportRequests.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Export History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exportRequests.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Download className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Data Export</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${r.status === "completed" ? "bg-green-500/20 text-green-500" : r.status === "failed" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                            {r.status}
                          </span>
                          {r.status === "completed" && r.downloadUrl && (
                            <a href={`${apiUrl}${r.downloadUrl}`} className="text-xs text-primary hover:underline">Download</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "deletion" && (
          <div className="space-y-6">
            {pendingDeletion ? (
              <Card className="bg-card border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-base text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Deletion Scheduled
                  </CardTitle>
                  <CardDescription>
                    Your account and all data will be permanently deleted on{" "}
                    <strong>{new Date(pendingDeletion.scheduledPurgeAt!).toLocaleDateString()}</strong>.
                    You can cancel this request during the 30-day grace period.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={() => cancelDeletionReq(pendingDeletion.id)}>
                    <X className="w-4 h-4 mr-2" /> Cancel Deletion Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Delete Account</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data. This includes all projects, files, conversations, and billing history.
                    There is a 30-day grace period during which you can cancel the deletion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Reason for leaving (optional)</label>
                    <Input value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="We'd love to know why..." />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Type <span className="font-mono font-bold">DELETE</span> to confirm
                    </label>
                    <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
                  </div>
                  <Button variant="destructive" disabled={deleteConfirm !== "DELETE"} onClick={requestDeletion}>
                    <Trash2 className="w-4 h-4 mr-2" /> Request Account Deletion
                  </Button>
                </CardContent>
              </Card>
            )}

            {deletionRequests.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Deletion History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deletionRequests.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-sm">Deletion request</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${r.status === "cancelled" ? "bg-muted text-muted-foreground" : r.status === "completed" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === "rectification" && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Right to Rectification</CardTitle>
              <CardDescription>Correct or update your personal data. All changes are logged for compliance purposes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile && (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Display Name</label>
                    <Input
                      value={editFields.displayName}
                      onChange={e => setEditFields(prev => ({ ...prev, displayName: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Username</label>
                    <Input
                      value={editFields.username}
                      onChange={e => setEditFields(prev => ({ ...prev, username: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Bio</label>
                    <textarea
                      value={editFields.bio}
                      onChange={e => setEditFields(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!editMode}
                      rows={3}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Email</label>
                    <Input value={profile.email} disabled className="bg-muted/30" />
                    <p className="text-xs text-muted-foreground mt-1">Email changes are managed through your authentication provider</p>
                  </div>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <Button onClick={saveProfile}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                        <Button variant="outline" onClick={() => {
                          setEditMode(false);
                          setEditFields({ displayName: profile.displayName || "", username: profile.username || "", bio: profile.bio || "" });
                        }}>Cancel</Button>
                      </>
                    ) : (
                      <Button onClick={() => setEditMode(true)}><Edit className="w-4 h-4 mr-2" /> Edit Personal Data</Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
