import { useState, useEffect, useCallback } from "react";
import { Link, useRoute } from "wouter";
import { useUser } from "@clerk/react";
import {
  Building2, Users, Settings, Key, Shield, Crown, UserPlus,
  Trash2, Mail, Check, X, Copy, Loader2, ChevronLeft,
  Eye, EyeOff, Plus, MoreHorizontal, AlertTriangle, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface OrgMember {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; username: string; email: string; avatarUrl: string | null };
}

interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface OrgSecret {
  id: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  plan: string;
  members: OrgMember[];
  memberCount: number;
}

const ROLE_ICONS: Record<string, React.ElementType> = { owner: Crown, admin: Shield, member: Users };
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  admin: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  member: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export default function OrgSettings() {
  const { toast } = useToast();
  const [, params] = useRoute("/org/:orgId/:rest*");
  const orgId = params?.orgId || "";
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [secrets, setSecrets] = useState<OrgSecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "members" | "secrets" | "billing">("general");
  const [myRole, setMyRole] = useState<string>("");
  const { user: clerkUser } = useUser();

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
        setMembers(data.members || []);
        const me = data.members?.find((m: OrgMember) => m.user.email === clerkUser?.primaryEmailAddress?.emailAddress);
        setMyRole(me?.role || "");
      }
    } catch {
      toast({ title: "Failed to load organization", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [orgId, clerkUser, toast]);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/invites`, { credentials: "include" });
      if (res.ok) setInvites(await res.json());
    } catch {}
  }, [orgId]);

  const fetchSecrets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/secrets`, { credentials: "include" });
      if (res.ok) setSecrets(await res.json());
    } catch {}
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchOrg();
      fetchInvites();
      fetchSecrets();
    }
  }, [orgId, fetchOrg, fetchInvites, fetchSecrets]);

  const isAdmin = myRole === "owner" || myRole === "admin";

  const handleUpdateOrg = async (updates: { name?: string; avatarUrl?: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrg((prev) => prev ? { ...prev, ...updated } : prev);
        toast({ title: "Organization updated" });
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/members/${memberId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast({ title: "Member removed" });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to remove", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
        toast({ title: "Role updated" });
      }
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/invites/${inviteId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        toast({ title: "Invite cancelled" });
      }
    } catch {
      toast({ title: "Failed to cancel invite", variant: "destructive" });
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/secrets/${secretId}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setSecrets((prev) => prev.filter((s) => s.id !== secretId));
        toast({ title: "Secret deleted" });
      }
    } catch {
      toast({ title: "Failed to delete secret", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Organization not found</h2>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{org.name}</h1>
              <p className="text-xs text-muted-foreground">@{org.slug} · {org.memberCount} members</p>
            </div>
            <Badge variant="outline" className="ml-2 capitalize">{org.plan}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-border/50">
          {(["general", "members", "secrets", "billing"] as const).map((tab) => {
            const icons = { general: Settings, members: Users, secrets: Key, billing: FolderOpen };
            const Icon = icons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {tab}
                </div>
              </button>
            );
          })}
        </div>

        {activeTab === "general" && <GeneralTab org={org} isAdmin={isAdmin} onUpdate={handleUpdateOrg} />}
        {activeTab === "members" && (
          <MembersTab
            orgId={orgId}
            members={members}
            invites={invites}
            isAdmin={isAdmin}
            myRole={myRole}
            onRemoveMember={handleRemoveMember}
            onChangeRole={handleChangeRole}
            onCancelInvite={handleCancelInvite}
            onInviteSent={fetchInvites}
          />
        )}
        {activeTab === "secrets" && (
          <SecretsTab orgId={orgId} secrets={secrets} isAdmin={isAdmin} onDelete={handleDeleteSecret} onCreated={fetchSecrets} />
        )}
        {activeTab === "billing" && <BillingTab org={org} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function GeneralTab({ org, isAdmin, onUpdate }: { org: Organization; isAdmin: boolean; onUpdate: (u: { name?: string }) => void }) {
  const [name, setName] = useState(org.name);
  const dirty = name !== org.name;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Organization Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Slug</Label>
            <Input value={org.slug} disabled className="font-mono text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">The slug cannot be changed after creation</p>
          </div>
          {isAdmin && dirty && (
            <Button size="sm" onClick={() => onUpdate({ name })}>Save Changes</Button>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="bg-card border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Deleting the organization will remove all associated data, including shared projects and secrets.
            </p>
            <Button variant="destructive" size="sm">Delete Organization</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MembersTab({
  orgId, members, invites, isAdmin, myRole, onRemoveMember, onChangeRole, onCancelInvite, onInviteSent,
}: {
  orgId: string;
  members: OrgMember[];
  invites: OrgInvite[];
  isAdmin: boolean;
  myRole: string;
  onRemoveMember: (id: string) => void;
  onChangeRole: (id: string, role: string) => void;
  onCancelInvite: (id: string) => void;
  onInviteSent: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Members ({members.length})</h3>
        {isAdmin && <InviteDialog orgId={orgId} onInvited={onInviteSent} />}
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const RoleIcon = ROLE_ICONS[m.role] || Users;
          return (
            <Card key={m.id} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} className="w-9 h-9 rounded-full" alt="" />
                    ) : (
                      m.user.username?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.user.username || m.user.email}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[m.role] || ""}`}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {m.role}
                  </Badge>
                  {isAdmin && myRole === "owner" && m.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {m.role !== "admin" && (
                          <DropdownMenuItem onClick={() => onChangeRole(m.id, "admin")}>
                            <Shield className="w-3.5 h-3.5 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {m.role !== "member" && (
                          <DropdownMenuItem onClick={() => onChangeRole(m.id, "member")}>
                            <Users className="w-3.5 h-3.5 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-400" onClick={() => onRemoveMember(m.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {invites.filter((i) => i.status === "pending").length > 0 && (
        <>
          <h3 className="text-sm font-medium mt-6">Pending Invites</h3>
          <div className="space-y-2">
            {invites.filter((i) => i.status === "pending").map((invite) => (
              <Card key={invite.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {invite.role} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => onCancelInvite(invite.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InviteDialog({ orgId, onInvited }: { orgId: string; onInvited: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) {
        toast({ title: "Invite sent" });
        setEmail("");
        setRole("member");
        setOpen(false);
        onInvited();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to invite", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send invite", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Email Address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member — can view and edit projects</SelectItem>
                <SelectItem value="admin">Admin — can manage members and settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={!email || sending}>
            {sending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecretsTab({
  orgId, secrets, isAdmin, onDelete, onCreated,
}: {
  orgId: string;
  secrets: OrgSecret[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onCreated: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Shared Secrets</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organization-wide environment variables available to all org projects
          </p>
        </div>
        {isAdmin && <CreateSecretDialog orgId={orgId} onCreated={onCreated} />}
      </div>

      {secrets.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <Key className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No shared secrets yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {secrets.map((secret) => (
            <Card key={secret.id} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-medium">{secret.key}</p>
                  {secret.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{secret.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Updated {new Date(secret.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    <span className="tracking-widest">••••••••</span>
                  </Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => onDelete(secret.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSecretDialog({ orgId, onCreated }: { orgId: string; onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!key || !value) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: key.toUpperCase(), value, description: description || undefined }),
      });
      if (res.ok) {
        toast({ title: "Secret created" });
        setKey(""); setValue(""); setDescription("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to create", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to create secret", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Secret
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Shared Secret</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Key</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="DATABASE_URL" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter secret value" type="password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this secret for?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!key || !value || saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingTab({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  const PLAN_FEATURES: Record<string, string[]> = {
    free: ["Up to 3 members", "5 projects", "Basic support"],
    team: ["Up to 25 members", "Unlimited projects", "Shared secrets", "Priority support", "Team analytics"],
    enterprise: ["Unlimited members", "Unlimited projects", "SSO/SAML", "Audit logs", "Dedicated support", "Custom contracts"],
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Current Plan</CardTitle>
          <CardDescription className="text-xs">
            Your organization is on the <span className="font-semibold capitalize">{org.plan}</span> plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(PLAN_FEATURES[org.plan] || []).map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {org.plan === "free" && isAdmin && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-2">Upgrade to Team</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Get unlimited projects, shared secrets, priority support, and team analytics.
            </p>
            <Link href="/pricing">
              <Button size="sm">View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
