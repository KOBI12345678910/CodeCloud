import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { GitBranch, GitPullRequest, ArrowUpFromLine, ArrowDownToLine, RefreshCw, Plus, Link2, Unlink, Clock, CheckCircle2, XCircle, Globe, Lock, Star, GitFork, Search, Settings2, Loader2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface Repo { id: number; name: string; full_name: string; description: string | null; private: boolean; language: string | null; stargazers_count: number; updated_at: string; default_branch: string; }
interface SyncEntry { id: string; action: string; status: string; filesChanged: number; commitSha: string; message: string; timestamp: string; repoFullName: string; }

const DEMO_REPOS: Repo[] = [
  { id: 1, name: "codecloud-platform", full_name: "user/codecloud-platform", description: "Main CodeCloud platform repository", private: true, language: "TypeScript", stargazers_count: 142, updated_at: "2026-04-22T10:00:00Z", default_branch: "main" },
  { id: 2, name: "api-microservices", full_name: "user/api-microservices", description: "Backend microservices architecture", private: true, language: "TypeScript", stargazers_count: 87, updated_at: "2026-04-21T10:00:00Z", default_branch: "main" },
  { id: 3, name: "design-system", full_name: "user/design-system", description: "Shared component library and design tokens", private: false, language: "TypeScript", stargazers_count: 256, updated_at: "2026-04-20T10:00:00Z", default_branch: "main" },
  { id: 4, name: "mobile-app", full_name: "user/mobile-app", description: "React Native mobile application", private: true, language: "TypeScript", stargazers_count: 45, updated_at: "2026-04-19T10:00:00Z", default_branch: "main" },
  { id: 5, name: "landing-page", full_name: "user/landing-page", description: "Marketing landing page with Next.js", private: false, language: "TypeScript", stargazers_count: 312, updated_at: "2026-04-18T10:00:00Z", default_branch: "main" },
];

const DEMO_HISTORY: SyncEntry[] = [
  { id: "s1", action: "push", status: "success", filesChanged: 12, commitSha: "a3f8c9d", message: "feat: add pricing engine", timestamp: "2026-04-22T15:30:00Z", repoFullName: "user/codecloud-platform" },
  { id: "s2", action: "pull", status: "success", filesChanged: 5, commitSha: "b7e2f1a", message: "fix: auth redirect", timestamp: "2026-04-22T14:15:00Z", repoFullName: "user/codecloud-platform" },
  { id: "s3", action: "push", status: "success", filesChanged: 23, commitSha: "c4d9e8f", message: "feat: model connector UI", timestamp: "2026-04-22T12:00:00Z", repoFullName: "user/codecloud-platform" },
  { id: "s4", action: "push", status: "failed", filesChanged: 0, commitSha: "", message: "Merge conflict in App.tsx", timestamp: "2026-04-22T10:30:00Z", repoFullName: "user/api-microservices" },
  { id: "s5", action: "pull", status: "success", filesChanged: 8, commitSha: "d1a2b3c", message: "chore: dependency updates", timestamp: "2026-04-21T18:00:00Z", repoFullName: "user/codecloud-platform" },
];

export default function GitHubSyncPage() {
  const [tab, setTab] = useState<"repos" | "sync" | "settings">("repos");
  const [search, setSearch] = useState("");
  const [connectedRepo, setConnectedRepo] = useState<string | null>("user/codecloud-platform");
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<"push" | "pull" | "bidirectional">("bidirectional");
  const [autoSync, setAutoSync] = useState(true);

  const filteredRepos = DEMO_REPOS.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()));

  const handleSync = async (direction: "push" | "pull") => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setSyncing(false);
  };

  return (
    <FeaturePageLayout title="GitHub Sync" description="Two-way synchronization between CodeCloud and GitHub repositories" icon={<GitBranch className="w-7 h-7 text-white" />} badge="Connected" badgeVariant="success">
      <div className="flex gap-2 mb-6">
        {(["repos", "sync", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            {t === "repos" ? "Repositories" : t === "sync" ? "Sync History" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "repos" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> New Repo
            </button>
          </div>

          {connectedRepo && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><Link2 className="w-5 h-5 text-green-400" /></div>
                  <div>
                    <p className="text-sm font-medium text-green-400">Connected Repository</p>
                    <p className="text-xs text-gray-400">{connectedRepo} · Last sync 30 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSync("push")} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50">
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpFromLine className="w-3 h-3" />} Push
                  </button>
                  <button onClick={() => handleSync("pull")} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50">
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownToLine className="w-3 h-3" />} Pull
                  </button>
                  <button onClick={() => setConnectedRepo(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg transition-colors">
                    <Unlink className="w-3 h-3" /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {filteredRepos.map(repo => (
              <div key={repo.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {repo.private ? <Lock className="w-4 h-4 text-yellow-500" /> : <Globe className="w-4 h-4 text-green-500" />}
                    <div>
                      <p className="text-sm font-medium text-white">{repo.full_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{repo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-gray-500"><Star className="w-3 h-3" />{repo.stargazers_count}</div>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">{repo.language}</span>
                    {connectedRepo === repo.full_name ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg">Connected</span>
                    ) : (
                      <button onClick={() => setConnectedRepo(repo.full_name)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">Connect</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "sync" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">48</p>
              <p className="text-xs text-gray-400 mt-1">Total Syncs</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-green-400">45</p>
              <p className="text-xs text-gray-400 mt-1">Successful</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-red-400">3</p>
              <p className="text-xs text-gray-400 mt-1">Failed</p>
            </div>
          </div>
          <div className="space-y-2">
            {DEMO_HISTORY.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.action === "push" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                  {entry.action === "push" ? <ArrowUpFromLine className="w-4 h-4 text-blue-400" /> : <ArrowDownToLine className="w-4 h-4 text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.message}</p>
                  <p className="text-xs text-gray-500">{entry.repoFullName} · {entry.commitSha && <span className="font-mono">{entry.commitSha}</span>}</p>
                </div>
                <div className="flex items-center gap-3">
                  {entry.filesChanged > 0 && <span className="text-xs text-gray-400">{entry.filesChanged} files</span>}
                  {entry.status === "success" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-white flex items-center gap-2"><Settings2 className="w-4 h-4" /> Sync Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Sync Direction</label>
                <div className="flex gap-2">
                  {(["push", "pull", "bidirectional"] as const).map(d => (
                    <button key={d} onClick={() => setSyncDirection(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${syncDirection === d ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                      {d === "push" ? "Push Only" : d === "pull" ? "Pull Only" : "Bidirectional"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Auto Sync</p>
                  <p className="text-xs text-gray-400">Automatically sync on every save</p>
                </div>
                <button onClick={() => setAutoSync(!autoSync)} className={`w-11 h-6 rounded-full transition-colors relative ${autoSync ? "bg-blue-600" : "bg-gray-600"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${autoSync ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Default Branch</label>
                <input defaultValue="main" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Commit Message Template</label>
                <input defaultValue="sync: {{action}} from CodeCloud" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
          </div>
          <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <h3 className="text-sm font-medium text-white">Ignore Patterns</h3>
            <textarea defaultValue={"node_modules/\n.env\n.env.local\ndist/\n.cache/"} rows={5} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>
      )}
    </FeaturePageLayout>
  );
}
