import React, { useState, useCallback } from "react";
import {
  GitBranch, GitCommit, GitMerge, ChevronDown, ChevronRight,
  Copy, Check, CherryIcon, RotateCcw, Merge, User, Clock,
  X, MoreVertical
} from "lucide-react";

interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  parents: string[];
  isMerge: boolean;
  tags: string[];
}

interface Branch {
  name: string;
  color: string;
  column: number;
  active: boolean;
}

const BRANCHES: Branch[] = [
  { name: "main", color: "#3b82f6", column: 0, active: true },
  { name: "feature/auth", color: "#10b981", column: 1, active: false },
  { name: "feature/dashboard", color: "#f59e0b", column: 2, active: true },
  { name: "fix/login-bug", color: "#ef4444", column: 1, active: false },
  { name: "release/v2.4", color: "#8b5cf6", column: 3, active: true },
];

const COMMITS: Commit[] = [
  { hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", shortHash: "a1b2c3d", message: "Merge branch 'feature/dashboard' into main", author: "Sarah Chen", date: new Date(Date.now() - 3600000).toISOString(), branch: "main", parents: ["b2c3d4e", "k1l2m3n"], isMerge: true, tags: ["v2.4.0"] },
  { hash: "k1l2m3n4o5p6k1l2m3n4o5p6k1l2m3n4o5p6k1l2", shortHash: "k1l2m3n", message: "Add revenue analytics chart filters", author: "Alex Kim", date: new Date(Date.now() - 7200000).toISOString(), branch: "feature/dashboard", parents: ["l2m3n4o"], isMerge: false, tags: [] },
  { hash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3", shortHash: "b2c3d4e", message: "Update deployment WebSocket config defaults", author: "Sarah Chen", date: new Date(Date.now() - 10800000).toISOString(), branch: "main", parents: ["c3d4e5f"], isMerge: false, tags: [] },
  { hash: "l2m3n4o5p6k1l2m3n4o5p6k1l2m3n4o5p6k1l2m3", shortHash: "l2m3n4o", message: "Add date range picker to dashboard", author: "Alex Kim", date: new Date(Date.now() - 14400000).toISOString(), branch: "feature/dashboard", parents: ["m3n4o5p"], isMerge: false, tags: [] },
  { hash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", shortHash: "c3d4e5f", message: "Merge branch 'fix/login-bug' into main", author: "Sarah Chen", date: new Date(Date.now() - 18000000).toISOString(), branch: "main", parents: ["d4e5f6a", "p1q2r3s"], isMerge: true, tags: [] },
  { hash: "p1q2r3s4t5u6p1q2r3s4t5u6p1q2r3s4t5u6p1q2", shortHash: "p1q2r3s", message: "Fix session token validation on refresh", author: "Mike Johnson", date: new Date(Date.now() - 21600000).toISOString(), branch: "fix/login-bug", parents: ["q2r3s4t"], isMerge: false, tags: [] },
  { hash: "m3n4o5p6k1l2m3n4o5p6k1l2m3n4o5p6k1l2m3n4", shortHash: "m3n4o5p", message: "Wire up code metrics API endpoints", author: "Alex Kim", date: new Date(Date.now() - 25200000).toISOString(), branch: "feature/dashboard", parents: ["d4e5f6a"], isMerge: false, tags: [] },
  { hash: "q2r3s4t5u6p1q2r3s4t5u6p1q2r3s4t5u6p1q2r3", shortHash: "q2r3s4t", message: "Add rate limiting to auth endpoints", author: "Mike Johnson", date: new Date(Date.now() - 28800000).toISOString(), branch: "fix/login-bug", parents: ["d4e5f6a"], isMerge: false, tags: [] },
  { hash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5", shortHash: "d4e5f6a", message: "Add container startup optimizer service", author: "Sarah Chen", date: new Date(Date.now() - 32400000).toISOString(), branch: "main", parents: ["e5f6a1b"], isMerge: false, tags: ["v2.3.1"] },
  { hash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6", shortHash: "e5f6a1b", message: "Merge branch 'feature/auth' into main", author: "Sarah Chen", date: new Date(Date.now() - 43200000).toISOString(), branch: "main", parents: ["f6a1b2c", "r3s4t5u"], isMerge: true, tags: [] },
  { hash: "r3s4t5u6p1q2r3s4t5u6p1q2r3s4t5u6p1q2r3s4", shortHash: "r3s4t5u", message: "Add Clerk webhook handler for user sync", author: "Emily Wong", date: new Date(Date.now() - 50400000).toISOString(), branch: "feature/auth", parents: ["s4t5u6p"], isMerge: false, tags: [] },
  { hash: "s4t5u6p1q2r3s4t5u6p1q2r3s4t5u6p1q2r3s4t5", shortHash: "s4t5u6p", message: "Implement OAuth2 PKCE flow for auth", author: "Emily Wong", date: new Date(Date.now() - 57600000).toISOString(), branch: "feature/auth", parents: ["f6a1b2c"], isMerge: false, tags: [] },
  { hash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1", shortHash: "f6a1b2c", message: "Release v2.3.0 — database provisioning", author: "Sarah Chen", date: new Date(Date.now() - 64800000).toISOString(), branch: "main", parents: ["g1h2i3j"], isMerge: false, tags: ["v2.3.0"] },
  { hash: "n1o2p3q4r5s6n1o2p3q4r5s6n1o2p3q4r5s6n1o2", shortHash: "n1o2p3q", message: "Add release notes generator", author: "Sarah Chen", date: new Date(Date.now() - 72000000).toISOString(), branch: "release/v2.4", parents: ["f6a1b2c"], isMerge: false, tags: [] },
  { hash: "g1h2i3j4k5l6g1h2i3j4k5l6g1h2i3j4k5l6g1h2", shortHash: "g1h2i3j", message: "Add multi-root workspace component", author: "Sarah Chen", date: new Date(Date.now() - 86400000).toISOString(), branch: "main", parents: [], isMerge: false, tags: [] },
];

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function GitGraph(): React.ReactElement {
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState(true);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>("all");

  const copyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }, []);

  const getBranchColor = (branchName: string): string => {
    const b = BRANCHES.find(br => br.name === branchName);
    return b ? b.color : "#6b7280";
  };

  const getBranchColumn = (branchName: string): number => {
    const b = BRANCHES.find(br => br.name === branchName);
    return b ? b.column : 0;
  };

  const filteredCommits = filterBranch === "all" ? COMMITS : COMMITS.filter(c => c.branch === filterBranch);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Git Graph</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            className="bg-[#3c3c3c] text-gray-300 text-[10px] px-2 py-0.5 rounded border border-[#555] focus:outline-none">
            <option value="all">All branches</option>
            {BRANCHES.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#333] bg-[#252526]">
        <button onClick={() => setExpandedBranches(!expandedBranches)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300">
          {expandedBranches ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span>Branches ({BRANCHES.length})</span>
        </button>
        {expandedBranches && (
          <div className="flex items-center gap-1 ml-2 overflow-x-auto">
            {BRANCHES.map(b => (
              <button key={b.name} onClick={() => setFilterBranch(filterBranch === b.name ? "all" : b.name)}
                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${filterBranch === b.name ? "bg-blue-600/20 text-blue-300" : "text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]"}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                {b.name}
                {b.active && <span className="w-1 h-1 rounded-full bg-green-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {filteredCommits.map((commit, i) => {
            const col = getBranchColumn(commit.branch);
            const color = getBranchColor(commit.branch);
            const isSelected = selectedCommit?.hash === commit.hash;

            return (
              <div key={commit.hash} className={`flex items-stretch hover:bg-[#2a2d2e] ${isSelected ? "bg-[#37373d]" : ""}`}>
                <div className="w-32 shrink-0 relative" style={{ minHeight: 40 }}>
                  <svg width="128" height="40" className="absolute inset-0">
                    {i < filteredCommits.length - 1 && (
                      <line x1={20 + col * 20} y1={20} x2={20 + getBranchColumn(filteredCommits[i + 1].branch) * 20} y2={40} stroke={color} strokeWidth={2} opacity={0.4} />
                    )}
                    {commit.isMerge && commit.parents.length > 1 && (
                      <line x1={20 + col * 20} y1={20} x2={20 + ((col + 1) % 4) * 20} y2={0} stroke={getBranchColor(commit.branch)} strokeWidth={1.5} opacity={0.3} strokeDasharray="3,3" />
                    )}
                    {commit.isMerge ? (
                      <>
                        <circle cx={20 + col * 20} cy={20} r={7} fill="none" stroke={color} strokeWidth={2} />
                        <circle cx={20 + col * 20} cy={20} r={3} fill={color} />
                      </>
                    ) : (
                      <circle cx={20 + col * 20} cy={20} r={5} fill={color} />
                    )}
                  </svg>
                </div>

                <div className="flex-1 flex items-center gap-2 py-1.5 pr-3 cursor-pointer border-b border-[#2a2a2a]"
                  onClick={() => setSelectedCommit(isSelected ? null : commit)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 truncate">{commit.message}</span>
                      {commit.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1 py-0 rounded bg-amber-600/20 text-amber-400 whitespace-nowrap">{tag}</span>
                      ))}
                      {commit.isMerge && <GitMerge size={10} className="text-purple-400 shrink-0" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-gray-600">
                    <span className="font-mono hover:text-blue-400 cursor-pointer" onClick={e => { e.stopPropagation(); copyHash(commit.hash); }}>
                      {copiedHash === commit.hash ? <Check size={10} className="text-green-400 inline" /> : null} {commit.shortHash}
                    </span>
                    <span className="flex items-center gap-1 w-20 truncate"><User size={9} /> {commit.author.split(" ")[0]}</span>
                    <span className="flex items-center gap-1 w-12"><Clock size={9} /> {timeAgo(commit.date)}</span>
                    <div className="relative">
                      <button onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === commit.hash ? null : commit.hash); }}
                        className="p-0.5 rounded hover:bg-[#3c3c3c] text-gray-600 hover:text-gray-300">
                        <MoreVertical size={12} />
                      </button>
                      {actionMenu === commit.hash && (
                        <div className="absolute right-0 top-5 z-20 bg-[#252526] border border-[#555] rounded shadow-lg py-1 min-w-[140px]"
                          onMouseLeave={() => setActionMenu(null)}>
                          {[
                            { icon: CherryIcon, label: "Cherry-pick", color: "text-pink-400" },
                            { icon: RotateCcw, label: "Revert", color: "text-orange-400" },
                            { icon: Merge, label: "Merge into...", color: "text-purple-400" },
                            { icon: GitBranch, label: "Create branch", color: "text-green-400" },
                            { icon: Copy, label: "Copy SHA", color: "text-gray-400" },
                          ].map(a => (
                            <button key={a.label} onClick={e => { e.stopPropagation(); setActionMenu(null); if (a.label === "Copy SHA") copyHash(commit.hash); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] text-gray-300 hover:bg-[#2a2d2e]">
                              <a.icon size={11} className={a.color} /> {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedCommit && (
        <div className="border-t border-[#333] bg-[#252526] p-3 max-h-48 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Commit Details</span>
            <button onClick={() => setSelectedCommit(null)} className="text-gray-600 hover:text-gray-300"><X size={12} /></button>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex gap-2">
              <span className="text-gray-600 w-14 shrink-0">SHA</span>
              <span className="font-mono text-gray-400 flex items-center gap-1">
                {selectedCommit.hash}
                <button onClick={() => copyHash(selectedCommit.hash)} className="text-gray-600 hover:text-blue-400">
                  {copiedHash === selectedCommit.hash ? <Check size={9} className="text-green-400" /> : <Copy size={9} />}
                </button>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600 w-14 shrink-0">Message</span>
              <span className="text-gray-300">{selectedCommit.message}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600 w-14 shrink-0">Author</span>
              <span className="text-gray-300">{selectedCommit.author}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600 w-14 shrink-0">Date</span>
              <span className="text-gray-400">{new Date(selectedCommit.date).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600 w-14 shrink-0">Branch</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBranchColor(selectedCommit.branch) }} />
                <span className="text-gray-300">{selectedCommit.branch}</span>
              </span>
            </div>
            {selectedCommit.parents.length > 0 && (
              <div className="flex gap-2">
                <span className="text-gray-600 w-14 shrink-0">Parents</span>
                <span className="text-gray-400 font-mono">{selectedCommit.parents.join(", ")}</span>
              </div>
            )}
            {selectedCommit.tags.length > 0 && (
              <div className="flex gap-2">
                <span className="text-gray-600 w-14 shrink-0">Tags</span>
                <div className="flex gap-1">{selectedCommit.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400">{t}</span>)}</div>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-[#333]">
              <button className="flex items-center gap-1 px-2 py-1 rounded bg-pink-600/10 text-pink-400 hover:bg-pink-600/20 text-[10px]"><CherryIcon size={10} /> Cherry-pick</button>
              <button className="flex items-center gap-1 px-2 py-1 rounded bg-orange-600/10 text-orange-400 hover:bg-orange-600/20 text-[10px]"><RotateCcw size={10} /> Revert</button>
              <button className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 text-[10px]"><Merge size={10} /> Merge</button>
              <button className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/10 text-green-400 hover:bg-green-600/20 text-[10px]"><GitBranch size={10} /> Branch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
