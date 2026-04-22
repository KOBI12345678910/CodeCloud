import { useState, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "@clerk/react";
import {
  Rocket, RotateCcw, ArrowLeftRight, Clock, Check, X, Loader2,
  ChevronDown, ChevronRight, FilePlus, FileX, FileEdit, AlertCircle,
  CircleDot, StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Deployment {
  id: string;
  projectId: string;
  version: number;
  status: "queued" | "building" | "deploying" | "live" | "failed" | "stopped";
  subdomain: string | null;
  buildLog: string | null;
  testLog: string | null;
  testStatus: string | null;
  errorLog: string | null;
  commitMessage: string | null;
  rollbackFromId: string | null;
  environment: string | null;
  duration: number | null;
  createdAt: string;
  stoppedAt: string | null;
  completedAt: string | null;
}

interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

interface DiffFile {
  path: string;
  status: "added" | "removed" | "modified";
  fromContent?: string | null;
  toContent?: string | null;
  fromSize?: number;
  toSize?: number;
}

interface CompareResult {
  from: { id: string; version: number; createdAt: string };
  to: { id: string; version: number; createdAt: string };
  summary: DiffSummary;
  files: DiffFile[];
}

interface DeploymentHistoryProps {
  projectId: string;
  onClose?: () => void;
}

export default function DeploymentHistory({ projectId, onClose }: DeploymentHistoryProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareFrom, setCompareFrom] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDiffFile, setExpandedDiffFile] = useState<string | null>(null);
  const { toast } = useToast();

  const [liveLogs, setLiveLogs] = useState<Record<string, string[]>>({});
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const { session } = useSession();

  useEffect(() => {
    fetchDeployments();
  }, [projectId]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const token = await session.getToken();
      if (cancelled || !token) return;
      const socket = io(API_URL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: { token },
      });
      socketRef.current = socket;
      socket.on("deployment:log", (data: { deploymentId: string; line: string }) => {
        setLiveLogs((prev) => {
          const next = { ...prev };
          const cur = next[data.deploymentId] || [];
          next[data.deploymentId] = [...cur, data.line].slice(-1000);
          return next;
        });
      });
      socket.on("deployment:status", (data: { deploymentId: string; status: string; url?: string }) => {
        setLiveStatuses((prev) => ({ ...prev, [data.deploymentId]: data.status }));
        if (data.status === "live" || data.status === "failed" || data.status === "stopped") {
          void fetchDeployments();
        }
      });
    })();
    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        subscribedRef.current.clear();
      }
    };
  }, [session]);

  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const inProgress = deployments.filter(
      (d) => d.status === "queued" || d.status === "building" || d.status === "deploying",
    );
    for (const d of inProgress) {
      if (!subscribedRef.current.has(d.id)) {
        sock.emit("deployment:subscribe", { deploymentId: d.id, projectId });
        subscribedRef.current.add(d.id);
        fetch(`${API_URL}/api/projects/${projectId}/deployments/${d.id}/logs`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.lines) setLiveLogs((prev) => ({ ...prev, [d.id]: data.lines }));
          })
          .catch(() => {});
      }
    }
    if (inProgress.length > 0) {
      const poll = setInterval(() => { void fetchDeployments(); }, 3000);
      return () => clearInterval(poll);
    }
  }, [deployments, projectId]);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/deployments`, {
        credentials: "include",
      });
      if (res.ok) {
        setDeployments(await res.json());
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    setRolling(deploymentId);
    try {
      const res = await fetch(
        `${API_URL}/api/deployments/${deploymentId}/rollback`,
        { method: "POST", credentials: "include" }
      );

      if (res.ok) {
        toast({ title: "Rollback Successful", description: "Project has been rolled back" });
        fetchDeployments();
      } else {
        const data = await res.json();
        toast({ title: "Rollback Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to rollback", variant: "destructive" });
    } finally {
      setRolling(null);
    }
  };

  const handleStop = async (deploymentId: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/deployments/${deploymentId}/stop`,
        { method: "POST", credentials: "include" }
      );
      if (res.ok) {
        toast({ title: "Deployment Stopped" });
        fetchDeployments();
      }
    } catch {}
  };

  const handleCompare = async () => {
    if (!compareFrom || !compareTo) return;
    setCompareLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/deployments/compare/${compareFrom}/${compareTo}`,
        { credentials: "include" }
      );
      if (res.ok) {
        setCompareResult(await res.json());
      }
    } catch {} finally {
      setCompareLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "live":
        return <CircleDot className="w-3.5 h-3.5 text-green-400" />;
      case "building":
      case "deploying":
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      case "failed":
        return <X className="w-3.5 h-3.5 text-red-400" />;
      case "stopped":
        return <StopCircle className="w-3.5 h-3.5 text-gray-400" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "live": return "text-green-400 bg-green-400/10";
      case "building": case "deploying": return "text-blue-400 bg-blue-400/10";
      case "failed": return "text-red-400 bg-red-400/10";
      case "stopped": return "text-gray-400 bg-gray-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const diffFileIcon = (status: string) => {
    switch (status) {
      case "added": return <FilePlus className="w-3.5 h-3.5 text-green-400" />;
      case "removed": return <FileX className="w-3.5 h-3.5 text-red-400" />;
      case "modified": return <FileEdit className="w-3.5 h-3.5 text-yellow-400" />;
      default: return null;
    }
  };

  const last5 = deployments.slice(0, 5);
  const liveDeployment = deployments.find((d) => d.status === "live");

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300 font-medium">Deployment History</span>
          {liveDeployment && (
            <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
              v{liveDeployment.version} live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareFrom(null);
              setCompareTo(null);
              setCompareResult(null);
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
              compareMode ? "text-blue-400 bg-blue-400/10" : "text-gray-400 hover:bg-[#333]"
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Compare
          </button>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-300 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {compareMode && (
        <div className="px-3 py-2 border-b border-[#333] bg-[#252525] space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>From:</span>
            <select
              value={compareFrom || ""}
              onChange={(e) => setCompareFrom(e.target.value || null)}
              className="bg-[#1e1e1e] border border-[#444] rounded px-2 py-1 text-gray-300 text-xs flex-1"
            >
              <option value="">Select deployment</option>
              {deployments.map((d) => (
                <option key={d.id} value={d.id}>v{d.version} — {formatDate(d.createdAt)}</option>
              ))}
            </select>
            <span>To:</span>
            <select
              value={compareTo || ""}
              onChange={(e) => setCompareTo(e.target.value || null)}
              className="bg-[#1e1e1e] border border-[#444] rounded px-2 py-1 text-gray-300 text-xs flex-1"
            >
              <option value="">Select deployment</option>
              {deployments.map((d) => (
                <option key={d.id} value={d.id}>v{d.version} — {formatDate(d.createdAt)}</option>
              ))}
            </select>
            <button
              onClick={handleCompare}
              disabled={!compareFrom || !compareTo || compareLoading}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 disabled:opacity-50"
            >
              {compareLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Diff"}
            </button>
          </div>
        </div>
      )}

      {compareResult && (
        <div className="border-b border-[#333]">
          <div className="px-3 py-2 bg-[#252525] flex items-center gap-3 text-xs">
            <span className="text-gray-400">v{compareResult.from.version} → v{compareResult.to.version}</span>
            <span className="text-green-400">+{compareResult.summary.added}</span>
            <span className="text-red-400">-{compareResult.summary.removed}</span>
            <span className="text-yellow-400">~{compareResult.summary.modified}</span>
            <span className="text-gray-500">{compareResult.summary.unchanged} unchanged</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {compareResult.files.map((file) => (
              <div key={file.path}>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 w-full hover:bg-[#2a2a2a] text-left"
                  onClick={() => setExpandedDiffFile(expandedDiffFile === file.path ? null : file.path)}
                >
                  {expandedDiffFile === file.path ? (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  )}
                  {diffFileIcon(file.status)}
                  <span className="text-gray-300 text-xs font-mono truncate">{file.path}</span>
                  <span className={`text-[10px] ml-auto capitalize ${
                    file.status === "added" ? "text-green-400" :
                    file.status === "removed" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {file.status}
                  </span>
                </button>
                {expandedDiffFile === file.path && file.status === "modified" && (
                  <div className="px-3 pb-2">
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="bg-red-900/20 rounded p-2 overflow-auto max-h-40">
                        <div className="text-red-400 mb-1 font-medium">v{compareResult.from.version}</div>
                        <pre className="text-gray-400 whitespace-pre-wrap">{(file.fromContent || "").slice(0, 500)}</pre>
                      </div>
                      <div className="bg-green-900/20 rounded p-2 overflow-auto max-h-40">
                        <div className="text-green-400 mb-1 font-medium">v{compareResult.to.version}</div>
                        <pre className="text-gray-400 whitespace-pre-wrap">{(file.toContent || "").slice(0, 500)}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {compareResult.files.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500 text-xs">No file changes between these deployments</div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        ) : last5.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Rocket className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No deployments yet</span>
          </div>
        ) : (
          last5.map((dep, idx) => (
            <div key={dep.id} className="border-b border-[#2a2a2a]">
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] cursor-pointer"
                onClick={() => setExpandedId(expandedId === dep.id ? null : dep.id)}
              >
                {expandedId === dep.id ? (
                  <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                )}
                {statusIcon(dep.status)}
                <span className="text-gray-300 font-medium text-xs">v{dep.version}</span>
                <span className="text-gray-500 text-xs truncate flex-1">
                  {dep.commitMessage || `Deployment v${dep.version}`}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${statusColor(dep.status)}`}>
                  {dep.status}
                </span>
                {dep.rollbackFromId && (
                  <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                    rollback
                  </span>
                )}
              </div>

              {expandedId === dep.id && (
                <div className="px-3 pb-3 pl-8 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Created:</span>
                    <span className="text-gray-400">{formatDate(dep.createdAt)}</span>
                    <span>Duration:</span>
                    <span className="text-gray-400">{formatDuration(dep.duration)}</span>
                    <span>Environment:</span>
                    <span className="text-gray-400">{dep.environment || "production"}</span>
                    {dep.subdomain && (
                      <>
                        <span>URL:</span>
                        <span className="text-blue-400 font-mono">{dep.subdomain}.deploy.codecloud.dev</span>
                      </>
                    )}
                  </div>

                  {dep.testLog && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-400 font-medium">Test Results</span>
                        {dep.testStatus === "passed" && (
                          <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">passed</span>
                        )}
                        {dep.testStatus === "failed" && (
                          <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">failed</span>
                        )}
                      </div>
                      <div className="bg-[#151515] rounded p-2 text-[10px] font-mono text-gray-500 max-h-24 overflow-y-auto whitespace-pre-wrap border-l-2 border-l-blue-500/40">
                        {dep.testLog}
                      </div>
                    </div>
                  )}

                  {(liveLogs[dep.id]?.length || dep.buildLog) && (
                    <div className="space-y-1">
                      {dep.testLog && (
                        <span className="text-xs text-gray-400 font-medium">Build Output</span>
                      )}
                      <div className="bg-[#151515] rounded p-2 text-[10px] font-mono text-gray-500 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {liveLogs[dep.id]?.length
                          ? liveLogs[dep.id].join("\n")
                          : dep.buildLog}
                        {(dep.status === "building" || dep.status === "deploying") && (
                          <span className="inline-block ml-1 text-blue-400 animate-pulse">▌</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {dep.status !== "live" && dep.status !== "building" && dep.status !== "deploying" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                        onClick={(e) => { e.stopPropagation(); handleRollback(dep.id); }}
                        disabled={rolling === dep.id}
                      >
                        {rolling === dep.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Rollback
                      </Button>
                    )}
                    {dep.status === "live" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-red-400 border-red-400/30 hover:bg-red-400/10"
                        onClick={(e) => { e.stopPropagation(); handleStop(dep.id); }}
                      >
                        <StopCircle className="w-3 h-3" />
                        Stop
                      </Button>
                    )}
                    {compareMode && (
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCompareFrom(dep.id); }}
                          className={`px-2 py-0.5 text-[10px] rounded ${
                            compareFrom === dep.id ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:bg-[#333]"
                          }`}
                        >
                          From
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCompareTo(dep.id); }}
                          className={`px-2 py-0.5 text-[10px] rounded ${
                            compareTo === dep.id ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:bg-[#333]"
                          }`}
                        >
                          To
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {deployments.length > 5 && (
        <div className="px-3 py-2 border-t border-[#333] text-center">
          <span className="text-[10px] text-gray-500">
            Showing last 5 of {deployments.length} deployments
          </span>
        </div>
      )}

      <DomainManagement projectId={projectId} />
    </div>
  );
}

interface ProjectDomain {
  id: string;
  domain: string;
  dnsVerified: boolean;
  sslStatus: string | null;
}

function DomainManagement({ projectId }: { projectId: string }) {
  const [domains, setDomains] = useState<ProjectDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/api/projects/${projectId}/domains`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setDomains(data.domains || []);
      }
    } catch {}
  };

  useEffect(() => { void load(); }, [projectId]);

  const add = async () => {
    if (!newDomain.trim()) return;
    setBusy("add");
    try {
      const r = await fetch(`${API_URL}/api/domains`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, domain: newDomain.trim() }),
      });
      if (r.ok) {
        setNewDomain("");
        await load();
        toast({ title: "Domain added" });
      } else {
        const e = await r.json().catch(() => ({}));
        toast({ title: "Error", description: e.error || "Failed to add domain", variant: "destructive" });
      }
    } finally { setBusy(null); }
  };

  const verify = async (id: string) => {
    setBusy(id + ":verify");
    try {
      const r = await fetch(`${API_URL}/api/domains/${id}/verify`, { method: "POST", credentials: "include" });
      if (r.ok) await load();
      else toast({ title: "Verification failed", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const provisionSsl = async (id: string) => {
    setBusy(id + ":ssl");
    try {
      const r = await fetch(`${API_URL}/api/domains/${id}/ssl`, { method: "POST", credentials: "include" });
      if (r.ok) {
        toast({ title: "SSL provisioning started" });
        setTimeout(() => { void load(); }, 2000);
      } else toast({ title: "SSL request failed", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const remove = async (id: string) => {
    setBusy(id + ":del");
    try {
      const r = await fetch(`${API_URL}/api/domains/${id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) await load();
      else toast({ title: "Failed to remove", variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <div className="border-t border-[#333] px-3 py-3">
      <div className="text-xs font-semibold text-gray-300 mb-2">Custom Domains</div>
      <div className="flex gap-2 mb-2">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="app.example.com"
          className="flex-1 text-xs px-2 py-1 bg-[#1e1e1e] border border-[#333] rounded text-gray-200"
        />
        <Button size="sm" onClick={add} disabled={busy === "add" || !newDomain.trim()}>Add</Button>
      </div>
      {domains.length === 0 ? (
        <div className="text-[10px] text-gray-500">No custom domains.</div>
      ) : (
        <div className="space-y-1">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-xs bg-[#1e1e1e] border border-[#333] rounded px-2 py-1">
              <div className="truncate">
                <span className="text-gray-200">{d.domain}</span>
                <span className={`ml-2 text-[10px] ${d.dnsVerified ? "text-green-400" : "text-yellow-400"}`}>
                  {d.dnsVerified ? "DNS verified" : "DNS pending"}
                </span>
                {d.sslStatus && <span className="ml-2 text-[10px] text-blue-400">SSL: {d.sslStatus}</span>}
              </div>
              <div className="flex gap-1">
                {!d.dnsVerified && (
                  <Button size="sm" variant="ghost" onClick={() => verify(d.id)} disabled={busy === d.id + ":verify"}>Verify</Button>
                )}
                {d.dnsVerified && d.sslStatus !== "active" && (
                  <Button size="sm" variant="ghost" onClick={() => provisionSsl(d.id)} disabled={busy === d.id + ":ssl"}>SSL</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(d.id)} disabled={busy === d.id + ":del"}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
