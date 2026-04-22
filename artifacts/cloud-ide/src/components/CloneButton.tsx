import { useState } from "react";
import { Copy, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CloneButtonProps {
  projectId: string;
  projectName: string;
  cloneCount?: number;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showCount?: boolean;
  className?: string;
}

export default function CloneButton({
  projectId,
  projectName,
  cloneCount = 0,
  variant = "outline",
  size = "sm",
  showCount = true,
  className,
}: CloneButtonProps) {
  const [open, setOpen] = useState(false);
  const [cloneName, setCloneName] = useState(`${projectName} (Clone)`);
  const [isCloning, setIsCloning] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: cloneName.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Clone failed");
      }

      const clonedProject = await res.json();
      toast({ title: "Project cloned successfully" });
      setOpen(false);
      setLocation(`/project/${clonedProject.id}`);
    } catch (err) {
      toast({
        title: "Clone failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setCloneName(`${projectName} (Clone)`);
          setOpen(true);
        }}
        className={className}
      >
        <Copy className="w-3.5 h-3.5 mr-1.5" />
        Clone
        {showCount && cloneCount > 0 && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            {cloneCount.toLocaleString()}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                Cloned from: <span className="text-foreground font-medium">{projectName}</span>
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-name">Project name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCloning) handleClone();
                }}
                placeholder="My cloned project"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              All files will be copied to your new project. The original project will show a "cloned from" badge.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isCloning}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={isCloning || !cloneName.trim()}>
              {isCloning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Clone Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ClonedFromBadgeProps {
  clonedFromId: string;
  clonedFromName?: string;
}

export function ClonedFromBadge({ clonedFromId, clonedFromName }: ClonedFromBadgeProps) {
  const [, setLocation] = useLocation();

  return (
    <button
      onClick={() => setLocation(`/project/${clonedFromId}`)}
      className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
    >
      <Copy className="w-3 h-3" />
      Cloned from {clonedFromName || "original"}
    </button>
  );
}
