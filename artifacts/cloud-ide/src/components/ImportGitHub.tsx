import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Github, Search, Star, Lock, Globe, ArrowRight, Loader2,
  FolderOpen, Code2, GitBranch, ChevronRight, AlertCircle,
  ExternalLink, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  stars: number;
  updatedAt: string;
  detectedLanguage: string;
}

interface ImportResult {
  name: string;
  owner: string;
  branch: string;
  fileCount: number;
  detectedLanguage: string;
  runCommand: string;
}

const LANG_COLORS: Record<string, string> = {
  javascript: "bg-yellow-500",
  typescript: "bg-blue-500",
  python: "bg-green-500",
  html: "bg-orange-500",
  go: "bg-cyan-500",
  rust: "bg-red-500",
  java: "bg-red-600",
  ruby: "bg-rose-500",
  cpp: "bg-purple-500",
  php: "bg-indigo-500",
};

interface ImportGitHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportGitHub({ open, onOpenChange }: ImportGitHubProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"connect" | "select" | "importing" | "done">("connect");
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredRepos(repos.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredRepos(repos);
    }
  }, [searchQuery, repos]);

  useEffect(() => {
    if (!open) {
      setStep("connect");
      setToken("");
      setRepos([]);
      setSearchQuery("");
      setSelectedRepo(null);
      setImportResult(null);
      setError(null);
    }
  }, [open]);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/github/repos?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch repositories. Check your token.");
      const data = await res.json();
      setRepos(data);
      setFilteredRepos(data);
      setStep("select");
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (repo: Repo) => {
    setSelectedRepo(repo);
    setStep("importing");
    setError(null);
    try {
      const [owner, repoName] = repo.fullName.split("/");
      const res = await fetch(`${API_BASE}/api/github/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          owner,
          repo: repoName,
          branch: repo.defaultBranch,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      setImportResult(result);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Import failed");
      setStep("select");
    }
  };

  const handleCreateProject = () => {
    toast({ title: `Project "${importResult?.name}" imported successfully` });
    onOpenChange(false);
    navigate("/dashboard");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="import-github-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" /> Import from GitHub
          </DialogTitle>
          <DialogDescription>
            {step === "connect" && "Connect your GitHub account to import a repository"}
            {step === "select" && "Select a repository to import into CodeCloud"}
            {step === "importing" && "Importing repository files..."}
            {step === "done" && "Repository imported successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <div className="space-y-4 mt-2" data-testid="step-connect">
            <div>
              <Label>Personal Access Token</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                data-testid="input-github-token"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Generate a token at{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  github.com/settings/tokens <ExternalLink className="w-3 h-3" />
                </a>
                {" "}with <code className="text-[10px] bg-muted px-1 py-0.5 rounded">repo</code> scope.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button onClick={handleConnect} disabled={!token.trim() || loading} className="w-full" data-testid="button-connect-github">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Github className="w-4 h-4 mr-2" />}
              {loading ? "Connecting..." : "Connect & List Repos"}
            </Button>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-3 mt-2" data-testid="step-select">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="pl-9"
                  data-testid="input-search-repos"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleConnect} className="shrink-0" data-testid="button-refresh-repos">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-1">
              {filteredRepos.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No repositories match your search" : "No repositories found"}
                  </p>
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleImport(repo)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
                    data-testid={`repo-${repo.name}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{repo.name}</span>
                        {repo.isPrivate ? (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${LANG_COLORS[repo.detectedLanguage] || "bg-gray-500"}`} />
                            {repo.language}
                          </span>
                        )}
                        {repo.stars > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> {repo.stars}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <GitBranch className="w-3 h-3" /> {repo.defaultBranch}
                        </span>
                        <span>{formatDate(repo.updatedAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center" data-testid="step-importing">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="font-medium">Importing {selectedRepo?.name}...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cloning files from {selectedRepo?.fullName}
            </p>
          </div>
        )}

        {step === "done" && importResult && (
          <div className="space-y-4 mt-2" data-testid="step-done">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{importResult.name}</p>
                  <p className="text-xs text-muted-foreground">{importResult.owner}/{importResult.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-background/50">
                  <p className="text-lg font-bold text-primary">{importResult.fileCount}</p>
                  <p className="text-[10px] text-muted-foreground">Files</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <p className="text-sm font-bold capitalize">{importResult.detectedLanguage}</p>
                  <p className="text-[10px] text-muted-foreground">Language</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <p className="text-sm font-bold">{importResult.branch}</p>
                  <p className="text-[10px] text-muted-foreground">Branch</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Detected Run Command</Label>
              <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-muted/30 border border-border/30 font-mono text-sm">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {importResult.runCommand}
              </div>
            </div>

            <Button onClick={handleCreateProject} className="w-full" data-testid="button-create-imported-project">
              Create Project <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
