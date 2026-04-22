import React, { useState, useCallback } from "react";
import {
  FolderOpen, FolderPlus, Search, Terminal, Settings, ChevronDown, ChevronRight,
  File, Trash2, X, Plus, RefreshCw, Filter, MoreVertical
} from "lucide-react";

interface WorkspaceFolder {
  id: string;
  name: string;
  path: string;
  expanded: boolean;
  files: WorkspaceFile[];
  color: string;
}

interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: WorkspaceFile[];
  expanded?: boolean;
}

interface SearchResult {
  file: string;
  folder: string;
  line: number;
  content: string;
  match: string;
}

interface WorkspaceSettings {
  sharedTerminal: boolean;
  excludePatterns: string[];
  searchScope: "all" | "current";
  autoSave: boolean;
  syncSettings: boolean;
}

const SAMPLE_FOLDERS: WorkspaceFolder[] = [
  {
    id: "f1", name: "frontend", path: "/workspace/frontend", expanded: true, color: "#3b82f6",
    files: [
      { name: "src", path: "/workspace/frontend/src", type: "folder", expanded: true, children: [
        { name: "App.tsx", path: "/workspace/frontend/src/App.tsx", type: "file" },
        { name: "index.tsx", path: "/workspace/frontend/src/index.tsx", type: "file" },
        { name: "components", path: "/workspace/frontend/src/components", type: "folder", children: [
          { name: "Header.tsx", path: "/workspace/frontend/src/components/Header.tsx", type: "file" },
          { name: "Sidebar.tsx", path: "/workspace/frontend/src/components/Sidebar.tsx", type: "file" },
        ]},
      ]},
      { name: "package.json", path: "/workspace/frontend/package.json", type: "file" },
      { name: "tsconfig.json", path: "/workspace/frontend/tsconfig.json", type: "file" },
    ],
  },
  {
    id: "f2", name: "api-server", path: "/workspace/api-server", expanded: true, color: "#10b981",
    files: [
      { name: "src", path: "/workspace/api-server/src", type: "folder", expanded: true, children: [
        { name: "index.ts", path: "/workspace/api-server/src/index.ts", type: "file" },
        { name: "routes", path: "/workspace/api-server/src/routes", type: "folder", children: [
          { name: "auth.ts", path: "/workspace/api-server/src/routes/auth.ts", type: "file" },
          { name: "users.ts", path: "/workspace/api-server/src/routes/users.ts", type: "file" },
        ]},
        { name: "services", path: "/workspace/api-server/src/services", type: "folder", children: [
          { name: "db.ts", path: "/workspace/api-server/src/services/db.ts", type: "file" },
        ]},
      ]},
      { name: "package.json", path: "/workspace/api-server/package.json", type: "file" },
    ],
  },
  {
    id: "f3", name: "shared-lib", path: "/workspace/shared-lib", expanded: false, color: "#f59e0b",
    files: [
      { name: "src", path: "/workspace/shared-lib/src", type: "folder", children: [
        { name: "types.ts", path: "/workspace/shared-lib/src/types.ts", type: "file" },
        { name: "utils.ts", path: "/workspace/shared-lib/src/utils.ts", type: "file" },
        { name: "constants.ts", path: "/workspace/shared-lib/src/constants.ts", type: "file" },
      ]},
      { name: "package.json", path: "/workspace/shared-lib/package.json", type: "file" },
    ],
  },
];

const SAMPLE_SEARCH_RESULTS: SearchResult[] = [
  { file: "App.tsx", folder: "frontend", line: 12, content: 'import { useAuth } from "./hooks/useAuth";', match: "useAuth" },
  { file: "auth.ts", folder: "api-server", line: 34, content: "export async function validateToken(token: string) {", match: "validateToken" },
  { file: "types.ts", folder: "shared-lib", line: 8, content: "export interface AuthUser { id: string; email: string; }", match: "AuthUser" },
  { file: "Header.tsx", folder: "frontend", line: 22, content: "const { user, logout } = useAuth();", match: "useAuth" },
  { file: "users.ts", folder: "api-server", line: 15, content: 'router.get("/me", requireAuth, async (req, res) => {', match: "requireAuth" },
];

export default function MultiRootWorkspace(): React.ReactElement {
  const [folders, setFolders] = useState<WorkspaceFolder[]>(SAMPLE_FOLDERS);
  const [activeTab, setActiveTab] = useState<"explorer" | "search" | "terminal" | "settings">("explorer");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ npm run dev",
    "[frontend] Starting dev server on port 3000...",
    "[api-server] Starting API server on port 4000...",
    "[frontend] ✓ Ready in 1.2s",
    "[api-server] ✓ Server listening on http://localhost:4000",
    "[shared-lib] Watching for changes...",
    "$",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [settings, setSettings] = useState<WorkspaceSettings>({
    sharedTerminal: true, excludePatterns: ["node_modules", ".git", "dist", "build"],
    searchScope: "all", autoSave: true, syncSettings: false,
  });
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");

  const toggleFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, expanded: !f.expanded } : f));
  }, []);

  const removeFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }, []);

  const addFolder = useCallback(() => {
    if (!newFolderPath.trim()) return;
    const name = newFolderPath.split("/").pop() || newFolderPath;
    const colors = ["#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
    setFolders(prev => [...prev, {
      id: `f${Date.now()}`, name, path: newFolderPath, expanded: true,
      color: colors[prev.length % colors.length],
      files: [{ name: "src", path: `${newFolderPath}/src`, type: "folder", children: [] },
        { name: "package.json", path: `${newFolderPath}/package.json`, type: "file" }],
    }]);
    setNewFolderPath("");
    setAddFolderOpen(false);
  }, [newFolderPath]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setTimeout(() => {
      const filtered = SAMPLE_SEARCH_RESULTS.filter(r =>
        r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.match.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.length > 0 ? filtered : SAMPLE_SEARCH_RESULTS);
      setSearching(false);
    }, 400);
  }, [searchQuery]);

  const handleTerminalSubmit = useCallback(() => {
    if (!terminalInput.trim()) return;
    setTerminalLines(prev => [...prev, `$ ${terminalInput}`, `Running "${terminalInput}" across workspace...`, "$"]);
    setTerminalInput("");
  }, [terminalInput]);

  const toggleFileExpand = useCallback((filePath: string) => {
    const toggle = (files: WorkspaceFile[]): WorkspaceFile[] =>
      files.map(f => f.path === filePath ? { ...f, expanded: !f.expanded }
        : f.children ? { ...f, children: toggle(f.children) } : f);
    setFolders(prev => prev.map(f => ({ ...f, files: toggle(f.files) })));
  }, []);

  const renderFiles = (files: WorkspaceFile[], depth: number, folderColor: string) => (
    files.map(file => (
      <div key={file.path}>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer text-xs hover:bg-[#2a2d2e] ${selectedFile === file.path ? "bg-[#37373d]" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => file.type === "folder" ? toggleFileExpand(file.path) : setSelectedFile(file.path)}
        >
          {file.type === "folder" ? (
            file.expanded ? <ChevronDown size={12} className="text-gray-500 shrink-0" /> : <ChevronRight size={12} className="text-gray-500 shrink-0" />
          ) : <span className="w-3 shrink-0" />}
          {file.type === "folder" ? (
            <FolderOpen size={14} style={{ color: folderColor }} className="shrink-0" />
          ) : (
            <File size={14} className="text-gray-400 shrink-0" />
          )}
          <span className="text-gray-300 truncate">{file.name}</span>
        </div>
        {file.type === "folder" && file.expanded && file.children && renderFiles(file.children, depth + 1, folderColor)}
      </div>
    ))
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Multi-Root Workspace</span>
        <div className="flex items-center gap-1">
          {(["explorer", "search", "terminal", "settings"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`p-1.5 rounded ${activeTab === tab ? "bg-[#37373d] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]"}`}
              title={tab.charAt(0).toUpperCase() + tab.slice(1)}>
              {tab === "explorer" ? <FolderOpen size={14} /> : tab === "search" ? <Search size={14} /> : tab === "terminal" ? <Terminal size={14} /> : <Settings size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "explorer" && (
          <div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#333]">
              <span className="text-xs text-gray-500">{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
              <button onClick={() => setAddFolderOpen(true)} className="p-1 rounded hover:bg-[#2a2d2e] text-gray-500 hover:text-gray-300" title="Add Folder">
                <FolderPlus size={14} />
              </button>
            </div>
            {addFolderOpen && (
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[#333] bg-[#252526]">
                <input value={newFolderPath} onChange={e => setNewFolderPath(e.target.value)} onKeyDown={e => e.key === "Enter" && addFolder()}
                  placeholder="/path/to/folder" className="flex-1 bg-[#3c3c3c] text-gray-200 text-xs px-2 py-1 rounded border border-[#555] focus:border-blue-500 outline-none" autoFocus />
                <button onClick={addFolder} className="p-1 text-green-400 hover:bg-[#2a2d2e] rounded"><Plus size={14} /></button>
                <button onClick={() => setAddFolderOpen(false)} className="p-1 text-gray-500 hover:bg-[#2a2d2e] rounded"><X size={14} /></button>
              </div>
            )}
            {folders.map(folder => (
              <div key={folder.id}>
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#252526] border-b border-[#333] group cursor-pointer hover:bg-[#2a2d2e]" onClick={() => toggleFolder(folder.id)}>
                  <div className="flex items-center gap-2">
                    {folder.expanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                    <span className="text-xs font-medium text-gray-200">{folder.name}</span>
                    <span className="text-[10px] text-gray-600">{folder.path}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button className="p-0.5 rounded hover:bg-[#3c3c3c] text-gray-500"><RefreshCw size={12} /></button>
                    <button className="p-0.5 rounded hover:bg-[#3c3c3c] text-gray-500" title="More"><MoreVertical size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); removeFolder(folder.id); }} className="p-0.5 rounded hover:bg-[#3c3c3c] text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
                {folder.expanded && renderFiles(folder.files, 0, folder.color)}
              </div>
            ))}
          </div>
        )}

        {activeTab === "search" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Search across all folders..." className="w-full bg-[#3c3c3c] text-gray-200 text-xs pl-7 pr-2 py-1.5 rounded border border-[#555] focus:border-blue-500 outline-none" />
              </div>
              <button onClick={handleSearch} disabled={searching} className="px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                {searching ? "..." : "Search"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-gray-500" />
              <span className="text-[10px] text-gray-500">Scope:</span>
              {(["all", "current"] as const).map(scope => (
                <button key={scope} onClick={() => setSettings(s => ({ ...s, searchScope: scope }))}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${settings.searchScope === scope ? "bg-blue-600/30 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
                  {scope === "all" ? "All Folders" : "Current Folder"}
                </button>
              ))}
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} across workspace</div>
                {searchResults.map((r, i) => (
                  <div key={i} className="p-2 rounded bg-[#252526] hover:bg-[#2a2d2e] cursor-pointer border border-[#333]" onClick={() => setSelectedFile(r.file)}>
                    <div className="flex items-center gap-2 mb-1">
                      <File size={11} className="text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-300">{r.file}</span>
                      <span className="text-[10px] px-1 py-0.5 rounded text-gray-500 bg-[#333]">{r.folder}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">L{r.line}</span>
                    </div>
                    <pre className="text-[10px] text-gray-400 overflow-hidden whitespace-nowrap text-ellipsis">{r.content}</pre>
                  </div>
                ))}
              </div>
            )}
            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-xs text-gray-500 text-center py-6">No results found</div>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#333] bg-[#252526]">
              <Terminal size={12} className="text-gray-500" />
              <span className="text-xs text-gray-400">Shared Terminal</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 ml-auto">Connected</span>
            </div>
            <div className="flex-1 p-3 font-mono text-xs overflow-y-auto bg-[#0d1117]">
              {terminalLines.map((line, i) => (
                <div key={i} className={`${line.startsWith("$") ? "text-green-400" : line.includes("✓") ? "text-green-300" : line.includes("[") ? "text-blue-300" : "text-gray-400"}`}>{line}</div>
              ))}
              <div className="flex items-center mt-1">
                <span className="text-green-400 mr-1">$</span>
                <input value={terminalInput} onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTerminalSubmit()}
                  className="flex-1 bg-transparent text-gray-300 outline-none" autoFocus />
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-3 space-y-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace Settings</div>
            {([
              { key: "sharedTerminal" as const, label: "Shared Terminal", desc: "Use a single terminal across all workspace folders" },
              { key: "autoSave" as const, label: "Auto Save", desc: "Automatically save files after editing" },
              { key: "syncSettings" as const, label: "Sync Settings", desc: "Synchronize settings across workspace folders" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-2 rounded bg-[#252526] border border-[#333]">
                <div>
                  <div className="text-xs text-gray-300">{label}</div>
                  <div className="text-[10px] text-gray-500">{desc}</div>
                </div>
                <button onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                  className={`w-8 h-4 rounded-full relative transition-colors ${settings[key] ? "bg-blue-600" : "bg-[#555]"}`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${settings[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
            <div>
              <div className="text-xs text-gray-400 mb-2">Exclude Patterns</div>
              <div className="flex flex-wrap gap-1">
                {settings.excludePatterns.map(p => (
                  <span key={p} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#333] text-gray-400">
                    {p}
                    <button onClick={() => setSettings(s => ({ ...s, excludePatterns: s.excludePatterns.filter(x => x !== p) }))} className="text-gray-600 hover:text-red-400"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-2">Workspace Folders</div>
              {folders.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-[#252526] border border-[#333] mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="text-xs text-gray-300">{f.name}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{f.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
