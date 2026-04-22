import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetProfile,
  useUpdateProfile,
  useListProjects,
} from "@workspace/api-client-react";
import {
  Code2, Calendar, Star, FolderOpen, Globe, Lock, Eye,
  Pencil, X, Check, MapPin, Link as LinkIcon, Twitter,
  Github, ExternalLink, Users, ChevronRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const LANG_COLORS: Record<string, string> = {
  javascript: "bg-yellow-500/20 text-yellow-400",
  typescript: "bg-blue-500/20 text-blue-400",
  python: "bg-green-500/20 text-green-400",
  html: "bg-orange-500/20 text-orange-400",
  go: "bg-cyan-500/20 text-cyan-300",
  rust: "bg-red-500/20 text-red-400",
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { toast } = useToast();
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;

  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: projectsData } = useListProjects();
  const updateProfile = useUpdateProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");

  const isOwnProfile = !username || username === profile?.username;
  const displayProfile = profile;
  const projects = projectsData?.projects?.filter((p: any) => p.isPublic) || [];

  const openEditModal = () => {
    setEditDisplayName(profile?.displayName || "");
    setEditBio((profile as any)?.bio || "");
    setEditLocation((profile as any)?.location || "");
    setEditWebsite((profile as any)?.website || "");
    setEditOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      {
        data: {
          displayName: editDisplayName,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Profile updated" });
          setEditOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          <div className="shrink-0">
            {clerkUser?.imageUrl ? (
              <img
                src={clerkUser.imageUrl}
                alt={displayProfile?.displayName || displayProfile?.username || ""}
                className="w-28 h-28 rounded-full border-4 border-border/50"
                data-testid="profile-avatar"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-4 border-border/50" data-testid="profile-avatar">
                {(displayProfile?.displayName || displayProfile?.username || "?")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold" data-testid="profile-display-name">
                  {displayProfile?.displayName || displayProfile?.username || "User"}
                </h1>
                <p className="text-muted-foreground" data-testid="profile-username">
                  @{displayProfile?.username || "user"}
                </p>
                {(displayProfile as any)?.bio && (
                  <p className="mt-3 text-sm max-w-lg" data-testid="profile-bio">
                    {(displayProfile as any).bio}
                  </p>
                )}
              </div>
              {isOwnProfile && (
                <Button variant="outline" size="sm" onClick={openEditModal} data-testid="button-edit-profile">
                  <Pencil className="w-3 h-3 mr-1.5" /> Edit Profile
                </Button>
              )}
              {!isOwnProfile && (
                <Button size="sm" data-testid="button-follow">
                  <Users className="w-3 h-3 mr-1.5" /> Follow
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span data-testid="profile-join-date">
                  Joined {displayProfile?.createdAt ? formatDate(displayProfile.createdAt) : "recently"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                <span data-testid="profile-project-count">
                  {projects.length} public project{projects.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span data-testid="profile-stars">
                  {(displayProfile as any)?.starsReceived || 0} stars received
                </span>
              </div>
              {(displayProfile as any)?.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{(displayProfile as any).location}</span>
                </div>
              )}
              {(displayProfile as any)?.website && (
                <a
                  href={(displayProfile as any).website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{(displayProfile as any).website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4" data-testid="section-projects">
            {isOwnProfile ? "Your Public Projects" : "Public Projects"}
          </h2>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p: any) => (
                <Link key={p.id} href={`/project/${p.id}`}>
                  <Card className="bg-card border-border/50 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer group" data-testid={`profile-project-${p.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${LANG_COLORS[p.language?.toLowerCase()] || "bg-primary/10 text-primary"}`}>
                            <Code2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{p.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{p.language}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Public
                        </span>
                        {p.starsCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-400" /> {p.starsCount}
                          </span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${p.containerStatus === "running" ? "bg-emerald-400" : "bg-zinc-500"}`} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No public projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isOwnProfile ? "Create a public project to show it here" : "This user hasn't shared any projects yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Display Name</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Your display name"
                data-testid="input-edit-display-name"
              />
            </div>
            <div>
              <Label>Bio</Label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
                data-testid="input-edit-bio"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="San Francisco, CA"
                data-testid="input-edit-location"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                data-testid="input-edit-website"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} data-testid="button-save-profile">
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
