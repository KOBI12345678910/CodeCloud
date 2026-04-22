import { useState, useCallback, useEffect, useMemo, useRef, Fragment } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import Editor, { loader } from "@monaco-editor/react";
import { registerMonacoExtensions, getEditorOptions, setupMultiCursorKeybindings } from "@/lib/monaco-extensions";
import ImagePreview, { isImageFile } from "@/components/ide/ImagePreview";
import ResourceMonitor from "@/components/ide/ResourceMonitor";
import TerminalPanel from "@/components/ide/TerminalPanel";
import AiPanel from "@/components/ide/AgentPanel";
import Breadcrumbs from "@/components/ide/Breadcrumbs";
import SplitEditor from "@/components/ide/SplitEditor";
import DropZone from "@/components/ide/DropZone";
import FileWatcherPanel from "@/components/ide/FileWatcherPanel";
import DeploymentHistory from "@/components/ide/DeploymentHistory";
import DeploySettingsPanel from "@/components/ide/DeploySettingsPanel";
import { SSLCertificates } from "@/components/ide/SSLCertificates";
import { SnapshotManager } from "@/components/ide/SnapshotManager";
import { Whiteboard } from "@/components/ide/Whiteboard";
import { MinimapHeatmap } from "@/components/ide/MinimapHeatmap";
import { REPL } from "@/components/ide/REPL";
import { DeployEnvVars } from "@/components/DeployEnvVars";
import { GitHubPR } from "@/components/ide/GitHubPR";
import { ContainerNetwork } from "@/components/ide/ContainerNetwork";
import { CoverageOverlay } from "@/components/ide/CoverageOverlay";
import { ReadmeGenerator } from "@/components/ide/ReadmeGenerator";
import { MultiPreview } from "@/components/ide/MultiPreview";
import { DockerfileEditor } from "@/components/ide/DockerfileEditor";
import { RateLimitDashboard } from "@/components/RateLimitDashboard";
import { PerfReport } from "@/components/PerfReport";
import { LicenseReport } from "@/components/LicenseReport";
import { TodoPanel } from "@/components/ide/TodoPanel";
import { MilestonePanel } from "@/components/MilestonePanel";
import { TrafficDashboard } from "@/components/TrafficDashboard";
import { CommandHistory } from "@/components/ide/CommandHistory";
import { CodingStats } from "@/components/CodingStats";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import { EnvComparison } from "@/components/EnvComparison";
import { NetworkDashboard } from "@/components/NetworkDashboard";
import { RegionSelector } from "@/components/RegionSelector";
import { DeploymentRegions } from "@/components/DeploymentRegions";
import { CostOptimizer } from "@/components/CostOptimizer";
import { ContainerDebug } from "@/components/ide/ContainerDebug";
import { LayoutPresets } from "@/components/ide/LayoutPresets";
import { RegexSearch } from "@/components/ide/RegexSearch";
import { DeployAlerts } from "@/components/DeployAlerts";
import { SecurityPatch } from "@/components/SecurityPatch";
import { VulnScanner } from "@/components/VulnScanner";
import { EmbedConfig } from "@/components/EmbedConfig";
import { SmartTerminal } from "@/components/SmartTerminal";
import { ProjectMigration } from "@/components/ProjectMigration";
import { ApiTestRunner } from "@/components/ApiTestRunner";
import { TemplateCustomizer } from "@/components/TemplateCustomizer";
import { FsSnapshotDiff } from "@/components/FsSnapshotDiff";
import { ExtensionManager } from "@/components/ExtensionManager";
import { StarterKits } from "@/components/StarterKits";
import { ResourceForecast } from "@/components/ResourceForecast";
import { TrafficRules } from "@/components/TrafficRules";
import { DependencyTree } from "@/components/DependencyTree";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { FileSizeAnalyzer } from "@/components/FileSizeAnalyzer";
import { WorkspaceTabs } from "@/components/ide/WorkspaceTabs";
import { EditorBreadcrumbs } from "@/components/ide/EditorBreadcrumbs";
import { ImageLayerInspector } from "@/components/ImageLayerInspector";
import { AiCommitMessage } from "@/components/AiCommitMessage";
import { FileEncryption } from "@/components/FileEncryption";
import { TypingIndicator } from "@/components/ide/TypingIndicator";
import { LockIndicator } from "@/components/ide/LockIndicator";
import { MacroRecorder } from "@/components/ide/MacroRecorder";
import { AnalyticsExport } from "@/components/AnalyticsExport";
import { CacheManager } from "@/components/CacheManager";
import { SqlQueryBuilder } from "@/components/ide/SqlQueryBuilder";
import { FileTemplates } from "@/components/ide/FileTemplates";
import { SLADashboard } from "@/components/SLADashboard";
import { CostTags } from "@/components/CostTags";
import { LiveMetrics } from "@/components/LiveMetrics";
import { ImageOptimizer } from "@/components/ImageOptimizer";
import { TemplateAnalytics } from "@/components/TemplateAnalytics";
import { AutoHealing } from "@/components/AutoHealing";
import { FileNotifications } from "@/components/FileNotifications";
import { ExecTimeout } from "@/components/ExecTimeout";
import { StyleEnforcer } from "@/components/ide/StyleEnforcer";
import { TrafficMirror } from "@/components/TrafficMirror";
import { FileTypeStats } from "@/components/FileTypeStats";
import { EnvInspector } from "@/components/ide/EnvInspector";
import { NotificationCenter } from "@/components/ide/NotificationCenter";
import { SSLMonitor } from "@/components/SSLMonitor";
import { DuplicationReport } from "@/components/DuplicationReport";
import { NetworkPolicies } from "@/components/NetworkPolicies";
import { APIDesigner } from "@/components/APIDesigner";
import { EnvPromotion } from "@/components/EnvPromotion";
import { ContributorInsights } from "@/components/ContributorInsights";
import { FsMonitor } from "@/components/FsMonitor";
import { CommandLog } from "@/components/ide/CommandLog";
import { ResponseBudget } from "@/components/ResponseBudget";
import { ReadmeUpdater } from "@/components/ReadmeUpdater";
import { RuntimeSecurity } from "@/components/RuntimeSecurity";
import { DataModelDesigner } from "@/components/DataModelDesigner";
import { ArchitectPlanner } from "@/components/ArchitectPlanner";
import { CanaryDashboard } from "@/components/CanaryDashboard";
import { AnnotationLayer } from "@/components/ide/AnnotationLayer";
import { LogShipping } from "@/components/LogShipping";
import { ThemeCreator } from "@/components/ThemeCreator";
import { CircuitBreakerDashboard } from "@/components/CircuitBreakerDashboard";
import { CodeActionsMenu } from "@/components/ide/ContextMenu";
import { ErrorPageEditor } from "@/components/ErrorPageEditor";
import MultiRootWorkspace from "@/components/ide/MultiRootWorkspace";
import GitGraph from "@/components/ide/GitGraph";
import InlineTestRunner from "@/components/ide/InlineTestRunner";
import { NginxConfigEditor } from "@/components/NginxConfigEditor";
import DatabaseConsole from "@/components/ide/DatabaseConsole";
import GitPanel from "@/components/ide/GitPanel";
import EnvEditor from "@/components/ide/EnvEditor";
import DatabaseViewer from "@/components/ide/DatabaseViewer";
import PackagesPanel from "@/components/ide/PackagesPanel";
import PreviewAnnotator from "@/components/PreviewAnnotator";
import CSSVisualizer from "@/components/ide/CSSVisualizer";
import FileTreeSearch from "@/components/ide/FileTreeSearch";
import TodoScanner from "@/components/ide/TodoScanner";
import { MiddlewarePipeline } from "@/components/MiddlewarePipeline";
import { IssueTrackerPanel } from "@/components/ide/IssueTrackerPanel";
import { PresenceBar } from "@/components/ide/PresenceBar";
import { useSocketIO } from "@/hooks/useSocketIO";
import { useRemoteCursors } from "@/hooks/useRemoteCursors";
import { useYjsCollaboration } from "@/hooks/useYjsCollaboration";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import MarkdownPreview from "@/components/ide/MarkdownPreview";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  useGetProject,
  useGetProfile,
  useListFiles,
  useGetFile,
  useCreateFile,
  useUpdateFile,
  useDeleteFile,
  useMoveFile,
  useCreateDeployment,
  useListCollaborators,
  getListFilesQueryKey,
  getGetFileQueryKey,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Code2,
  Play,
  Square,
  Rocket,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  X,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Save,
  MessageSquare,
  Send,
  Bot,
  Star,
  Share2,
  Copy,
  Check,
  GitBranch,
  AlertCircle,
  Wifi,
  Eye,
  Clock,
  ShieldCheck,
  Camera,
  PenTool,
  Flame,
  TerminalSquare,
  KeyRound,
  GitPullRequest,
  Network,
  BarChart3,
  BookOpen,
  Package,
  Activity,
  Gauge,
  Shield,
  ListTodo,
  Globe,
  Terminal,
  Award,
  ArrowLeftRight,
  DollarSign,
  Bell,
  Bug,
  Layout,
  Search,
  Scan,
  Code,
  FileText,
  Zap,
  ArrowRight,
  FileCode,
  Wand2,
  HardDrive,
  Puzzle,
  TrendingUp,
  ArrowLeftRight as TrafficIcon,
  Layers,
  Database,
  BoxSelect,
  Lock,
  Keyboard,
  Download,
  Zap as CacheIcon,
  ShieldAlert,
  ScrollText,
  Tag,
  Radio,
  FileStack,
  Type,
  Eye as PreviewIcon,
  Cpu,
  HeartPulse,
  Timer,
  Paintbrush,
  Variable,
  Users,
  History,
  Truck,
  Settings,
  Server,
  LayoutGrid,
  Columns2,
  Sparkles,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { useLayoutPersistence } from "@/hooks/useLayoutPersistence";
import { useTheme } from "@/contexts/theme-context";

function buildSampleFiles(projectId: string): FileNode[] {
  const nowIso = new Date().toISOString();
  const make = (name: string, content: string, mimeType: string): FileNode => ({
    id: `sample-${name}`,
    projectId,
    path: name,
    name,
    isDirectory: false,
    content,
    sizeBytes: content.length,
    mimeType,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  return [
    make("index.html", `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodeCloud Demo</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main class="container">
      <h1>Hello from CodeCloud</h1>
      <p id="counter">Clicks: 0</p>
      <button id="bump">Click me</button>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`, "text/html"),
    make("style.css", `:root { color-scheme: dark; --bg:#0a0a0b; --fg:#e6edf3; --accent:#1d4ed8; }
* { box-sizing: border-box; }
body { margin:0; font-family: -apple-system, system-ui, sans-serif; background:var(--bg); color:var(--fg); }
.container { max-width:480px; margin:10vh auto; padding:2rem; border-radius:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); text-align:center; }
button { margin-top:1rem; padding:0.6rem 1.2rem; background:var(--accent); color:#fff; border:0; border-radius:8px; font-size:1rem; cursor:pointer; }
button:hover { filter: brightness(1.1); }
`, "text/css"),
    make("app.js", `const counter = document.getElementById("counter");
const button = document.getElementById("bump");
let clicks = 0;
button.addEventListener("click", () => {
  clicks += 1;
  counter.textContent = \`Clicks: \${clicks}\`;
});
console.log("CodeCloud demo ready");
`, "application/javascript"),
  ];
}

function sampleStorageKey(projectId: string): string {
  return `cc:samplefiles:${projectId}`;
}

function loadSampleOverrides(projectId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(sampleStorageKey(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSampleOverride(projectId: string, fileId: string, content: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadSampleOverrides(projectId);
    all[fileId] = content;
    window.localStorage.setItem(sampleStorageKey(projectId), JSON.stringify(all));
  } catch {}
}

function getSampleFiles(projectId: string): FileNode[] {
  const base = buildSampleFiles(projectId);
  const overrides = loadSampleOverrides(projectId);
  return base.map((f) => overrides[f.id] != null ? { ...f, content: overrides[f.id], sizeBytes: overrides[f.id].length } : f);
}

function buildPreviewDoc(files: Array<{ name: string; path: string; content?: string | null; isDirectory: boolean }>): string {
  if (!files || files.length === 0) return "";
  const byName = new Map<string, string>();
  for (const f of files) {
    if (f.isDirectory) continue;
    const key = (f.path || f.name).replace(/^\.?\//, "");
    byName.set(key, f.content || "");
    byName.set(f.name, f.content || "");
  }
  const entry =
    byName.get("index.html") ||
    Array.from(byName.entries()).find(([k]) => k.toLowerCase().endsWith(".html"))?.[1];
  if (!entry) {
    const jsFile = Array.from(byName.entries()).find(([k]) => k.toLowerCase().endsWith(".js"))?.[1];
    if (jsFile) {
      return `<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body><pre id="out" style="font:13px ui-monospace,monospace;padding:1rem;color:#111;background:#fff;white-space:pre-wrap;"></pre><script>(function(){var out=document.getElementById('out');var orig=console.log;console.log=function(){var s=Array.prototype.map.call(arguments,function(x){try{return typeof x==='string'?x:JSON.stringify(x);}catch(e){return String(x);}}).join(' ');out.textContent+=s+'\\n';orig.apply(console,arguments);};window.addEventListener('error',function(e){out.textContent+='[error] '+e.message+'\\n';});})();<\/script><script>${jsFile}<\/script></body></html>`;
    }
    return "";
  }
  let html = entry;
  html = html.replace(/<link\b[^>]*?\bhref=["']([^"']+\.css)["'][^>]*>/gi, (_m, href) => {
    const css = byName.get(href.replace(/^\.?\//, "")) || byName.get(href);
    return css != null ? `<style>\n${css}\n</style>` : _m;
  });
  html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+\.js)["']([^>]*)><\/script>/gi, (_m, pre, src, post) => {
    const js = byName.get(src.replace(/^\.?\//, "")) || byName.get(src);
    return js != null ? `<script${pre}${post}>\n${js}\n</script>` : _m;
  });
  return html;
}

interface FileNode {
  id: string;
  projectId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  content?: string | null;
  sizeBytes: number;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

function getLanguageFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    go: "go",
    rs: "rust",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

function getFileIcon(name: string, isDirectory: boolean, isOpen: boolean) {
  if (isDirectory) {
    return isOpen ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />;
  }
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    ts: "text-blue-400",
    tsx: "text-blue-400",
    py: "text-green-400",
    html: "text-orange-400",
    css: "text-cyan-400",
    json: "text-yellow-300",
    md: "text-gray-400",
    go: "text-cyan-300",
    png: "text-purple-400",
    jpg: "text-purple-400",
    jpeg: "text-purple-400",
    gif: "text-purple-400",
    svg: "text-purple-400",
    webp: "text-purple-400",
  };
  return <File className={`w-4 h-4 ${colors[ext] || "text-gray-400"}`} />;
}

interface TreeNode {
  file: FileNode;
  children: TreeNode[];
}

function buildTree(files: FileNode[]): TreeNode[] {
  const pathMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const f of sorted) {
    pathMap.set(f.path, { file: f, children: [] });
  }

  for (const f of sorted) {
    const node = pathMap.get(f.path)!;
    const parts = f.path.split("/");
    if (parts.length <= 1) {
      roots.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = pathMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  const sortChildren = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.file.isDirectory !== b.file.isDirectory) return a.file.isDirectory ? -1 : 1;
      return a.file.name.localeCompare(b.file.name);
    }).map(n => ({ ...n, children: sortChildren(n.children) }));
  };

  return sortChildren(roots);
}

function FileTreeItem({
  node,
  depth,
  expandedDirs,
  toggleDir,
  selectedFileId,
  onSelectFile,
  onNewFile,
  onNewFolder,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  renamingId,
  renameValue,
  setRenameValue,
  onRenameSubmit,
  onRenameCancel,
  activeEditors,
}: {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  toggleDir: (id: string) => void;
  selectedFileId: string | null;
  onSelectFile: (file: FileNode) => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onDeleteFile: (file: FileNode) => void;
  onRenameFile: (file: FileNode) => void;
  onMoveFile: (fileId: string, targetPath: string) => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  activeEditors?: Map<string, { userName: string; color: string }[]>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isOpen = expandedDirs.has(node.file.id);
  const isSelected = selectedFileId === node.file.id;
  const isRenaming = renamingId === node.file.id;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
              isSelected ? "bg-primary/10 text-primary" : "text-foreground/80"
            } ${dragOver && node.file.isDirectory ? "bg-primary/20 border border-primary/40 rounded" : ""}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", JSON.stringify({ id: node.file.id, path: node.file.path, name: node.file.name }));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (node.file.isDirectory) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(true);
              }
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!node.file.isDirectory) return;
              try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                if (data.id !== node.file.id) {
                  onMoveFile(data.id, node.file.path);
                }
              } catch {}
            }}
            onClick={() => {
              if (node.file.isDirectory) {
                toggleDir(node.file.id);
              } else {
                onSelectFile(node.file);
              }
            }}
            onDoubleClick={() => onRenameFile(node.file)}
            data-testid={`file-tree-item-${node.file.name}`}
          >
            {node.file.isDirectory && (
              isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            {getFileIcon(node.file.name, node.file.isDirectory, isOpen)}
            {isRenaming ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                  if (e.key === "Escape") onRenameCancel();
                }}
                onBlur={onRenameCancel}
                autoFocus
                className="flex-1 bg-muted/50 border border-border rounded px-1 py-0 text-xs outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex items-center gap-1">
                {node.file.name}
                {!node.file.isDirectory && activeEditors?.get(node.file.path || node.file.name)?.map((editor, i) => (
                  <span
                    key={i}
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: editor.color }}
                    title={`${editor.userName} is editing`}
                  />
                ))}
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.file.isDirectory && (
            <>
              <ContextMenuItem onClick={() => onNewFile(node.file.path)} data-testid="context-new-file">
                <Plus className="w-3.5 h-3.5 mr-2" /> New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onNewFolder(node.file.path)} data-testid="context-new-folder">
                <FolderPlus className="w-3.5 h-3.5 mr-2" /> New Folder
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onClick={() => onRenameFile(node.file)} data-testid="context-rename">
            <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDeleteFile(node.file)} className="text-destructive" data-testid="context-delete">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {node.file.isDirectory && isOpen && node.children.map((child) => (
        <FileTreeItem
          key={child.file.id}
          node={child}
          depth={depth + 1}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
          selectedFileId={selectedFileId}
          onSelectFile={onSelectFile}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
          onMoveFile={onMoveFile}
          renamingId={renamingId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          activeEditors={activeEditors}
        />
      ))}
    </>
  );
}

function EditorPaneView({
  projectId,
  selectedFileId,
  openTabs,
  isActive,
  showClose,
  editorTheme,
  modifiedFiles,
  setModifiedFiles,
  onSelectFileId,
  onUpdateTabs,
  onFocus,
  onClose,
  onEditorMount,
  onCursorChange,
  files,
}: {
  projectId: string;
  selectedFileId: string | null;
  openTabs: FileNode[];
  isActive: boolean;
  showClose: boolean;
  editorTheme: string;
  modifiedFiles: Set<string>;
  setModifiedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSelectFileId: (id: string | null) => void;
  onUpdateTabs: (tabs: FileNode[]) => void;
  onFocus: () => void;
  onClose: () => void;
  onEditorMount: (editor: { getValue: () => string }, monaco?: any) => void;
  onCursorChange: (pos: { line: number; column: number }) => void;
  files: FileNode[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateFile = useUpdateFile();
  const editorRef = useRef<{ getValue: () => string } | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: apiActiveFileData } = useGetFile(projectId, selectedFileId || "", {
    query: {
      enabled: !!selectedFileId && !String(selectedFileId).startsWith("sample-"),
      queryKey: getGetFileQueryKey(projectId, selectedFileId || ""),
      retry: false,
    },
  });
  const activeFileData = apiActiveFileData ?? (selectedFileId && String(selectedFileId).startsWith("sample-")
    ? (getSampleFiles(projectId).find((f) => f.id === selectedFileId) ?? null)
    : null);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!selectedFileId || value === undefined) return;
      setModifiedFiles((prev) => new Set(prev).add(selectedFileId));
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      const fileId = selectedFileId;
      autoSaveTimerRef.current = setTimeout(() => {
        const content = editorRef.current?.getValue() ?? "";
        if (!fileId) return;
        updateFile.mutate(
          { projectId, fileId, data: { content } },
          {
            onSuccess: () => {
              setModifiedFiles((prev) => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
              });
              queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(projectId, fileId) });
            },
          }
        );
      }, 2000);
    },
    [selectedFileId, projectId, updateFile, queryClient, setModifiedFiles]
  );

  const handleSave = useCallback(() => {
    if (!selectedFileId || !activeFileData) return;
    const content = editorRef.current?.getValue() ?? activeFileData.content ?? "";
    updateFile.mutate(
      { projectId, fileId: selectedFileId, data: { content } },
      {
        onSuccess: () => {
          setModifiedFiles((prev) => {
            const next = new Set(prev);
            next.delete(selectedFileId);
            return next;
          });
          queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(projectId, selectedFileId) });
          toast({ title: "File saved" });
        },
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  }, [selectedFileId, activeFileData, projectId, updateFile, queryClient, toast, setModifiedFiles]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, handleSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const closeTab = useCallback((fileId: string) => {
    const newTabs = openTabs.filter((t) => t.id !== fileId);
    onUpdateTabs(newTabs);
    if (selectedFileId === fileId) {
      onSelectFileId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  }, [openTabs, selectedFileId, onUpdateTabs, onSelectFileId]);

  return (
    <div
      className={`h-full flex flex-col ${isActive && showClose ? "ring-1 ring-primary/30" : ""}`}
      onClick={onFocus}
      data-testid="editor-pane"
    >
      <div className="h-8 border-b border-border/30 flex items-center overflow-x-auto bg-card/30 shrink-0" data-testid="editor-tabs">
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-border/20 shrink-0 transition-colors ${
              selectedFileId === tab.id
                ? "bg-background text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
            onClick={(e) => { e.stopPropagation(); onFocus(); onSelectFileId(tab.id); }}
            data-testid={`tab-${tab.name}`}
          >
            {getFileIcon(tab.name, false, false)}
            <span>{tab.name}</span>
            {modifiedFiles.has(tab.id) && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            <button
              className="ml-1 p-0.5 rounded hover:bg-muted/50"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              data-testid={`close-tab-${tab.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {showClose && (
          <button
            className="ml-auto mr-1 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Close split"
            data-testid="close-split-pane"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden" data-testid="editor-area">
        {selectedFileId && activeFileData ? (
          isImageFile(activeFileData.name) ? (
            <ImagePreview
              fileName={activeFileData.name}
              content={activeFileData.content || ""}
              mimeType={(activeFileData as any).mimeType}
            />
          ) : (
          <Editor
            height="100%"
            language={getLanguageFromFilename(activeFileData.name)}
            value={activeFileData.content || ""}
            onChange={handleEditorChange}
            onMount={(editor: any, monaco: any) => {
              editorRef.current = editor;
              onEditorMount(editor, monaco);
              editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
                onCursorChange({ line: e.position.lineNumber, column: e.position.column });
              });
              editor.onDidFocusEditorText(() => { onFocus(); });
            }}
            theme={editorTheme}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              smoothScrolling: true,
              padding: { top: 8 },
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              folding: true,
              foldingStrategy: "auto",
              foldingHighlight: true,
              showFoldingControls: "always",
              foldingImportsByDefault: false,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              autoIndent: "full",
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              detectIndentation: true,
              renderWhitespace: "selection",
              matchBrackets: "always",
            }}
          />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Code2 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Select a file to start editing</p>
            <p className="text-xs mt-1 opacity-50">
              {openTabs.length === 0 ? "Open a file from the sidebar" : "Click a tab above"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectPage({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: fetchedProject, isLoading: projectLoading, error: projectError } = useGetProject(id, {
    query: { queryKey: getGetProjectQueryKey(id), retry: false },
  });
  const project = fetchedProject ?? (projectError ? ({
    id,
    name: "Demo Workspace",
    description: "Sample project",
    language: "javascript",
    visibility: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as typeof fetchedProject) : fetchedProject);
  const { data: profile } = useGetProfile();
  const userPlan = (profile?.plan as string) || "free";
  const { data: apiFiles, error: filesError } = useListFiles(id, {
    query: { queryKey: getListFilesQueryKey(id), retry: false },
  });
  const [sampleVersion, setSampleVersion] = useState(0);
  const sampleFiles = useMemo<FileNode[]>(() => getSampleFiles(id), [id, sampleVersion]);
  const files = (apiFiles && apiFiles.length > 0) ? apiFiles : sampleFiles;
  const { data: collaborators } = useListCollaborators(id, {
    query: { queryKey: ["collaborators", id] },
  });

  const [panes, setPanes] = useState<Array<{ selectedFileId: string | null; openTabs: FileNode[] }>>([
    { selectedFileId: null, openTabs: [] },
  ]);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const selectedFileId = panes[activePaneIndex]?.selectedFileId ?? null;
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [containerRunning, setContainerRunning] = useState(false);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string | undefined>(undefined);
  const [gpuToggling, setGpuToggling] = useState(false);
  const [previewSize, setPreviewSize] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showFileWatcher, setShowFileWatcher] = useState(false);
  const [showDeployHistory, setShowDeployHistory] = useState(false);
  const [showSSL, setShowSSL] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showRepl, setShowRepl] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [showGitHubPR, setShowGitHubPR] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [showDocker, setShowDocker] = useState(false);
  const [showRateLimits, setShowRateLimits] = useState(false);
  const [showPerfTest, setShowPerfTest] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [showTodos, setShowTodos] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showExecHistory, setShowExecHistory] = useState(false);
  const [showCodingStats, setShowCodingStats] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showEnvCompare, setShowEnvCompare] = useState(false);
  const [showNetworkDash, setShowNetworkDash] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [showGeoRegions, setShowGeoRegions] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showContainerDebug, setShowContainerDebug] = useState(false);
  const [showLayoutPresets, setShowLayoutPresets] = useState(false);
  const [showRegexSearch, setShowRegexSearch] = useState(false);
  const [showDeployAlerts, setShowDeployAlerts] = useState(false);
  const [showSecurityPatch, setShowSecurityPatch] = useState(false);
  const [showVulnScan, setShowVulnScan] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showSmartTerminal, setShowSmartTerminal] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showApiTester, setShowApiTester] = useState(false);
  const [showTemplateCustomizer, setShowTemplateCustomizer] = useState(false);
  const [showFsDiff, setShowFsDiff] = useState(false);
  const [showExtensions, setShowExtensions] = useState(false);
  const [showStarterKits, setShowStarterKits] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showTrafficRules, setShowTrafficRules] = useState(false);
  const [showDependencyTree, setShowDependencyTree] = useState(false);
  const [showActivityHeatmap, setShowActivityHeatmap] = useState(false);
  const [showFileSizeAnalyzer, setShowFileSizeAnalyzer] = useState(false);
  const [showWorkspaceTabs, setShowWorkspaceTabs] = useState(false);
  const [showImageLayers, setShowImageLayers] = useState(false);
  const [showAiCommit, setShowAiCommit] = useState(false);
  const [showFileEncryption, setShowFileEncryption] = useState(false);
  const [showLockIndicator, setShowLockIndicator] = useState(false);
  const [showMacroRecorder, setShowMacroRecorder] = useState(false);
  const [showAnalyticsExport, setShowAnalyticsExport] = useState(false);
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [showSqlBuilder, setShowSqlBuilder] = useState(false);
  const [showFileTemplates, setShowFileTemplates] = useState(false);
  const [showSLADashboard, setShowSLADashboard] = useState(false);
  const [showCostTags, setShowCostTags] = useState(false);
  const [showLiveMetrics, setShowLiveMetrics] = useState(false);
  const [showImageOptimizer, setShowImageOptimizer] = useState(false);
  const [showTemplateAnalytics, setShowTemplateAnalytics] = useState(false);
  const [showAutoHealing, setShowAutoHealing] = useState(false);
  const [showFileNotifications, setShowFileNotifications] = useState(false);
  const [showExecTimeout, setShowExecTimeout] = useState(false);
  const [showStyleEnforcer, setShowStyleEnforcer] = useState(false);
  const [showTrafficMirror, setShowTrafficMirror] = useState(false);
  const [showFileTypeStats, setShowFileTypeStats] = useState(false);
  const [showEnvInspector, setShowEnvInspector] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSSLMonitor, setShowSSLMonitor] = useState(false);
  const [showDuplication, setShowDuplication] = useState(false);
  const [showNetworkPolicies, setShowNetworkPolicies] = useState(false);
  const [showAPIDesigner, setShowAPIDesigner] = useState(false);
  const [showEnvPromotion, setShowEnvPromotion] = useState(false);
  const [showContributorInsights, setShowContributorInsights] = useState(false);
  const [showFsMonitor, setShowFsMonitor] = useState(false);
  const [showCommandLog, setShowCommandLog] = useState(false);
  const [showResponseBudget, setShowResponseBudget] = useState(false);
  const [showReadmeUpdater, setShowReadmeUpdater] = useState(false);
  const [showRuntimeSecurity, setShowRuntimeSecurity] = useState(false);
  const [showDataModel, setShowDataModel] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const [showCanary, setShowCanary] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showLogShipping, setShowLogShipping] = useState(false);
  const [showThemeCreator, setShowThemeCreator] = useState(false);
  const [showCircuitBreaker, setShowCircuitBreaker] = useState(false);
  const [codeActionsMenu, setCodeActionsMenu] = useState<{ x: number; y: number } | null>(null);
  const [showErrorPages, setShowErrorPages] = useState(false);
  const [showMultiRoot, setShowMultiRoot] = useState(false);
  const [showGitGraph, setShowGitGraph] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [showNginxConfig, setShowNginxConfig] = useState(false);
  const [showDbConsole, setShowDbConsole] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [showCSSVisualizer, setShowCSSVisualizer] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showTodoScanner, setShowTodoScanner] = useState(false);
  const [showMiddlewarePipeline, setShowMiddlewarePipeline] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [issueCountTotal, setIssueCountTotal] = useState(0);
  const [showDeploySettings, setShowDeploySettings] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const layoutPersistence = useLayoutPersistence(id);
  const layoutRestoredRef = useRef(false);
  const { theme: appTheme, toggleTheme } = useTheme();
  const editorTheme = appTheme === "dark" ? "vs-dark" : "light";
  interface EditorInstance {
    getValue: () => string;
    getModel: () => { getLineCount: () => number } | null;
    onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => void;
    getSelection: () => { toString: () => string } | null;
    trigger: (source: string | null | undefined, handlerId: string, payload: unknown) => void;
    getPosition: () => { lineNumber: number; column: number } | null;
    getScrolledVisiblePosition: (pos: { lineNumber: number; column: number }) => { left: number; top: number; height: number } | null;
    getDomNode: () => HTMLElement | null;
    addAction: (action: { id: string; label: string; run: () => void }) => void;
    onDidDispose: (cb: () => void) => void;
    revealLineInCenter: (line: number) => void;
    setPosition: (pos: { lineNumber: number; column: number }) => void;
    setSelection: (selection: any) => void;
    setValue: (value: string) => void;
    executeEdits: (source: string, edits: Array<{ range: any; text: string; forceMoveMarkers?: boolean }>) => void;
    onDidChangeCursorSelection: (cb: (e: { selection: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number } }) => void) => void;
  }
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoInstanceRef = useRef<typeof import("monaco-editor") | null>(null);

  const openTabs = panes[activePaneIndex]?.openTabs ?? [];
  const selectedFileIdRef = useRef<string | null>(selectedFileId);
  selectedFileIdRef.current = selectedFileId;
  const openTabsRef = useRef(openTabs);
  openTabsRef.current = openTabs;
  const [liveMarkdownContent, setLiveMarkdownContent] = useState<string>("");
  const markdownPreviewRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncLock = useRef<"editor" | "preview" | null>(null);
  const scrollSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const paneEditorsRef = useRef<Record<number, { getValue: () => string } | null>>({});

  useEffect(() => {
    const fetchIssueCount = async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || ""}/projects/${id}/issues/counts`, {
          credentials: "include"
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.total !== undefined) setIssueCountTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch issue count:", err);
      }
    };
    fetchIssueCount();
    const interval = setInterval(fetchIssueCount, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileWatcherHook = useFileWatcher({
    projectId: id,
    autoConnect: true,
    onFileChange: (changes: any[]) => {
      const hasTreeChange = changes.some(
        (c) => c.changeType === "created" || c.changeType === "deleted" || c.changeType === "renamed"
      );
      if (hasTreeChange) {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
      }
    },
  });

  const socketIO = useSocketIO(
    user ? {
      userId: user.id,
      userName: user.username || user.firstName || "User",
      avatarUrl: user.imageUrl,
      projectId: id,
    } : null
  );
  const socketIORef = useRef(socketIO);
  socketIORef.current = socketIO;

  const recentTerminalErrorsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!socketIO.connected || !socketIO.onTerminalOutput) return;
    const errorRegex = /(error|exception|traceback|failed|cannot find|undefined|warning):/i;
    const unsubscribe = socketIO.onTerminalOutput((data) => {
      const text = String(data?.data ?? "");
      // Strip ANSI color codes
      const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
      const lines = clean.split(/\r?\n/);
      for (const line of lines) {
        if (errorRegex.test(line)) {
          recentTerminalErrorsRef.current.push(line.trim());
          if (recentTerminalErrorsRef.current.length > 50) {
            recentTerminalErrorsRef.current.shift();
          }
        }
      }
    });
    return unsubscribe;
  }, [socketIO.connected, socketIO.onTerminalOutput]);

  const currentFilePath = useMemo(() => {
    const f = openTabs.find(t => t.id === selectedFileId);
    return f?.path || f?.name || null;
  }, [openTabs, selectedFileId]);

  useRemoteCursors(editorRef as any, monacoInstanceRef, socketIO.remoteCursors, socketIO.remoteSelections, currentFilePath);

  const activeEditorsMap = useMemo(() => {
    const map = new Map<string, { userName: string; color: string }[]>();
    socketIO.presenceUsers.forEach((u) => {
      if (u.activeFile) {
        const existing = map.get(u.activeFile) || [];
        existing.push({ userName: u.userName, color: u.color });
        map.set(u.activeFile, existing);
      }
    });
    return map;
  }, [socketIO.presenceUsers]);

  const yjsCollab = useYjsCollaboration({
    projectId: id,
    fileId: selectedFileId || "",
    userId: user?.id || "",
    userName: user?.fullName || user?.username || "Anonymous",
    color: "#ff6b6b",
    enabled: !!selectedFileId && !!user?.id,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && yjsCollab.isInitialized) {
      // @ts-ignore - Monaco editor type mismatch in simplified ref
      const model = (editor as any).getModel?.();
      if (model) {
        yjsCollab.bindToMonaco(editor as any, model);
      }
    }
    return () => {
      yjsCollab.unbindMonaco();
    };
  }, [yjsCollab.isInitialized, selectedFileId, yjsCollab.bindToMonaco, yjsCollab.unbindMonaco, activePaneIndex, panes]);

  const { data: apiActiveFileData2 } = useGetFile(
    id,
    selectedFileId || "",
    {
      query: {
        enabled: !!selectedFileId && !String(selectedFileId).startsWith("sample-"),
        queryKey: getGetFileQueryKey(id, selectedFileId || ""),
        retry: false,
      },
    }
  );
  const activeFileData = apiActiveFileData2 ?? (selectedFileId && String(selectedFileId).startsWith("sample-")
    ? (getSampleFiles(id).find((f) => f.id === selectedFileId) ?? null)
    : null);

  const createFile = useCreateFile();
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const createDeployment = useCreateDeployment();

  const treeNodes = useMemo(() => buildTree(files || []), [files]);

  const toggleDir = useCallback((id: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectFile = useCallback((file: FileNode) => {
    setPanes((prev) => prev.map((p, i) => {
      if (i !== activePaneIndex) return p;
      const tabs = p.openTabs.find((t) => t.id === file.id) ? p.openTabs : [...p.openTabs, file];
      return { selectedFileId: file.id, openTabs: tabs };
    }));
    const filePath = file.path || file.name;
    socketIORef.current?.sendFileOpen(filePath);
  }, [activePaneIndex]);

  const closeTabFromAllPanes = useCallback((fileId: string) => {
    setPanes((prev) => prev.map((p) => {
      const newTabs = p.openTabs.filter((t) => t.id !== fileId);
      const newSelected = p.selectedFileId === fileId
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
        : p.selectedFileId;
      return { selectedFileId: newSelected, openTabs: newTabs };
    }));
  }, []);

  const handleSplitEditor = useCallback(() => {
    if (panes.length >= 2) return;
    const activePane = panes[activePaneIndex];
    const currentFile = activePane.openTabs.find((t) => t.id === activePane.selectedFileId);
    setPanes((prev) => [...prev, {
      selectedFileId: activePane.selectedFileId,
      openTabs: currentFile ? [currentFile] : [],
    }]);
    setActivePaneIndex(1);
  }, [panes, activePaneIndex]);

  const isMarkdownFile = activeFileData?.name?.toLowerCase().endsWith(".md") ?? false;

  useEffect(() => {
    if (activeFileData?.content !== undefined) {
      setLiveMarkdownContent(activeFileData.content || "");
    }
  }, [activeFileData?.content]);

  useEffect(() => {
    return () => {
      if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
      if (scrollDisposableRef.current) scrollDisposableRef.current.dispose();
    };
  }, []);

  const handleCloseSplit = useCallback((paneIndex: number) => {
    if (panes.length <= 1) return;
    setPanes((prev) => prev.filter((_, i) => i !== paneIndex));
    paneEditorsRef.current = { 0: paneEditorsRef.current[paneIndex === 0 ? 1 : 0] };
    setActivePaneIndex(0);
  }, [panes.length]);

  useEffect(() => {
    if (!files || layoutRestoredRef.current) return;
    layoutRestoredRef.current = true;
    const saved = layoutPersistence.restore();
    if (!saved || saved.openTabs.length === 0) return;

    const fileList = files as FileNode[];
    const restoredTabs: FileNode[] = [];
    for (const tab of saved.openTabs) {
      const match = fileList.find((f) => f.id === tab.id || f.path === tab.path);
      if (match) restoredTabs.push(match);
    }
    if (restoredTabs.length > 0) {
      const activeMatch = restoredTabs.find((t) => t.id === saved.activeFileId);
      const activeId = activeMatch ? activeMatch.id : restoredTabs[0]!.id;
      setPanes([{ selectedFileId: activeId, openTabs: restoredTabs }]);
      setActivePaneIndex(0);
    }
    if (saved.expandedFolders.length > 0) {
      setExpandedDirs(new Set(saved.expandedFolders));
    }
    if (saved.showAiChat) {
      setShowAiChat(true);
    }
  }, [files, layoutPersistence]);

  useEffect(() => {
    if (!layoutRestoredRef.current) return;
    layoutPersistence.setOpenTabs(
      openTabs.map((t) => ({ id: t.id, path: t.path, name: t.name }))
    );
  }, [openTabs, layoutPersistence]);

  useEffect(() => {
    if (!layoutRestoredRef.current) return;
    layoutPersistence.setActiveFileId(selectedFileId);
  }, [selectedFileId, layoutPersistence]);

  useEffect(() => {
    if (!layoutRestoredRef.current) return;
    layoutPersistence.setExpandedFolders(Array.from(expandedDirs));
  }, [expandedDirs, layoutPersistence]);

  useEffect(() => {
    if (!layoutRestoredRef.current) return;
    layoutPersistence.setShowAiChat(showAiChat);
  }, [showAiChat, layoutPersistence]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    loader.init().then((monaco) => {
      cleanup = registerMonacoExtensions(monaco);
    });
    return () => cleanup?.();
  }, []);

  const yjsCollabRef = useRef(yjsCollab);
  yjsCollabRef.current = yjsCollab;

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    if (monaco) monacoInstanceRef.current = monaco;
    editor.onDidChangeCursorPosition?.((e: { position: { lineNumber: number; column: number } }) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
      const fileId = selectedFileIdRef.current;
      const tabs = openTabsRef.current;
      const activeFile = tabs.find(t => t.id === fileId);
      if (activeFile) {
        socketIORef.current?.sendCursorUpdate(activeFile.path || activeFile.name, e.position.lineNumber, e.position.column);
      }
    });
    editor.onDidChangeCursorSelection((e: { selection: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number } }) => {
      const sel = e.selection;
      if (sel.startLineNumber === sel.endLineNumber && sel.startColumn === sel.endColumn) return;
      const fileId = selectedFileIdRef.current;
      const tabs = openTabsRef.current;
      const activeFile = tabs.find(t => t.id === fileId);
      if (activeFile) {
        socketIORef.current?.sendSelection(
          activeFile.path || activeFile.name,
          sel.startLineNumber,
          sel.startColumn,
          sel.endLineNumber,
          sel.endColumn
        );
      }
    });
    const multiCursorDisposables = setupMultiCursorKeybindings(monaco, editor);
    editor.addAction({
      id: "custom-context-menu",
      label: "Show Code Actions",
      contextMenuGroupId: "navigation",
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F10],
      run: () => {
        const pos = editor.getPosition();
        if (pos) {
          const coords = editor.getScrolledVisiblePosition(pos);
          const domNode = editor.getDomNode();
          if (coords && domNode) {
            const rect = domNode.getBoundingClientRect();
            setCodeActionsMenu({ x: rect.left + coords.left, y: rect.top + coords.top + coords.height });
          }
        }
      },
    });
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCodeActionsMenu({ x: e.clientX, y: e.clientY });
      });
    }
    editor.onDidDispose(() => {
      multiCursorDisposables.forEach((d: any) => d.dispose());
    });
    if (scrollDisposableRef.current) {
      scrollDisposableRef.current.dispose();
      scrollDisposableRef.current = null;
    }
    scrollDisposableRef.current = editor.onDidScrollChange(() => {
      if (scrollSyncLock.current === "preview") return;
      scrollSyncLock.current = "editor";
      if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
      scrollSyncTimer.current = setTimeout(() => { scrollSyncLock.current = null; }, 100);
      const previewEl = markdownPreviewRef.current;
      if (!previewEl) return;
      const scrollTop = editor.getScrollTop();
      const scrollHeight = editor.getScrollHeight() - editor.getLayoutInfo().height;
      if (scrollHeight <= 0) return;
      const ratio = scrollTop / scrollHeight;
      previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight);
    });
  }, []);

  const handleSave = useCallback(() => {
    const activePane = panes[activePaneIndex];
    if (!activePane?.selectedFileId) return;

    const fileId = activePane.selectedFileId;
    const file = activePane.openTabs.find(t => t.id === fileId);
    if (file && isImageFile(file.name)) return;

    const editor = editorRef.current;
    if (!editor) return;
    const content = editor.getValue();

    if (String(fileId).startsWith("sample-")) {
      saveSampleOverride(id, fileId, content);
      setModifiedFiles((prev) => { const next = new Set(prev); next.delete(fileId); return next; });
      setSampleVersion((v) => v + 1);
      queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(id, fileId) });
      toast({ title: "File saved" });
      return;
    }

    updateFile.mutate(
      { projectId: id, fileId, data: { content } },
      {
        onSuccess: () => {
          setModifiedFiles((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
          });
          queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(id, fileId) });
          toast({ title: "File saved" });
        },
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  }, [panes, activePaneIndex, id, updateFile, queryClient, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        handleSplitEditor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleSplitEditor]);

  useEffect(() => {
    if (!socketIO.followTarget) return;
    const { file: followFile, line, column } = socketIO.followTarget;
    const matchingFile = (files || []).find(f => f.path === followFile || f.name === followFile);
    if (matchingFile) {
      selectFile(matchingFile);
      setTimeout(() => {
        const editor = editorRef.current;
        const monaco = monacoInstanceRef.current;
        if (editor && monaco) {
          editor.revealLineInCenter(line);
          editor.setPosition({ lineNumber: line, column });
          editor.setSelection(new monaco.Selection(line, column, line, column));
        }
      }, 200);
    }
  }, [socketIO.followTarget, files, selectFile]);

  const handleAiSend = useCallback(() => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);
    const context = paneEditorsRef.current[activePaneIndex]?.getValue() || "";
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/ai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ projectId: id, title: userMsg.slice(0, 50) }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((conv) =>
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/ai/conversations/${conv.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: userMsg, context: context.slice(0, 2000) }),
        })
      )
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((resp) => {
        setAiMessages((prev) => [...prev, { role: "assistant", content: resp.content || "No response" }]);
      })
      .catch(() => {
        setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that request." }]);
      })
      .finally(() => setAiLoading(false));
  }, [aiInput, aiLoading, id, panes, activePaneIndex]);

  const handleNewFile = (parentPath: string) => {
    setNewFileParentPath(parentPath);
    setCreatingFile(true);
    setCreatingFolder(false);
    setNewFileName("");
  };

  const handleNewFolder = (parentPath: string) => {
    setNewFileParentPath(parentPath);
    setCreatingFolder(true);
    setCreatingFile(false);
    setNewFileName("");
  };

  const submitNewFile = () => {
    if (!newFileName.trim()) return;
    const path = newFileParentPath ? `${newFileParentPath}/${newFileName}` : newFileName;
    const isDir = creatingFolder;
    createFile.mutate(
      { id, data: { path, name: newFileName, isDirectory: isDir, content: isDir ? undefined : "" } },
      {
        onSuccess: (file) => {
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
          setCreatingFile(false);
          setCreatingFolder(false);
          if (!isDir) selectFile(file as FileNode);
        },
        onError: () => toast({ title: `Failed to create ${isDir ? "folder" : "file"}`, variant: "destructive" }),
      }
    );
  };

  const handleDeleteFile = (file: FileNode) => {
    deleteFile.mutate(
      { projectId: id, fileId: file.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
          closeTabFromAllPanes(file.id);
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleDropUpload = useCallback(async (file: { path: string; name: string; content: string; isDirectory: boolean }) => {
    return new Promise<void>((resolve, reject) => {
      createFile.mutate(
        { id, data: { path: file.path, name: file.name, isDirectory: file.isDirectory, content: file.isDirectory ? undefined : file.content } },
        {
          onSuccess: () => resolve(),
          onError: () => reject(new Error(`Failed to upload ${file.name}`)),
        }
      );
    });
  }, [id, createFile]);

  const handleDropComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
  }, [id, queryClient]);

  const handleRenameFile = (file: FileNode) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  const handleRenameSubmit = () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const file = (files || []).find((f) => f.id === renamingId);
    if (!file) { setRenamingId(null); return; }
    const parts = file.path.split("/");
    parts[parts.length - 1] = renameValue.trim();
    const newPath = parts.join("/");
    updateFile.mutate(
      { projectId: id, fileId: renamingId, data: { name: renameValue.trim(), path: newPath } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
          setRenamingId(null);
        },
        onError: () => {
          toast({ title: "Rename failed", variant: "destructive" });
          setRenamingId(null);
        },
      }
    );
  };

  const handleRenameCancel = () => setRenamingId(null);

  const moveFile = useMoveFile();

  const handleMoveFile = useCallback(
    (fileId: string, targetDirPath: string) => {
      const file = files?.find((f) => f.id === fileId);
      if (!file) return;
      const fileName = file.name;
      const newPath = targetDirPath === "/" ? `/${fileName}` : `${targetDirPath}/${fileName}`;
      moveFile.mutate(
        { projectId: id, fileId, data: { newPath } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) });
            toast({ title: "File moved" });
          },
          onError: () => toast({ title: "Move failed", variant: "destructive" }),
        }
      );
    },
    [id, files, moveFile, queryClient, toast]
  );

  const handleGpuToggle = useCallback(async () => {
    if (gpuToggling) return;
    setGpuToggling(true);
    try {
      const endpoint = project?.gpuEnabled ? "disable" : "enable";
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/projects/${id}/gpu/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) {
          toast({ title: "GPU requires Pro plan", description: "Upgrade to Pro to enable GPU acceleration.", variant: "destructive" });
        } else {
          toast({ title: data.error || "Failed to toggle GPU", variant: "destructive" });
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      toast({ title: data.gpuEnabled ? "GPU enabled" : "GPU disabled" });
    } catch {
      toast({ title: "Failed to toggle GPU", variant: "destructive" });
    } finally {
      setGpuToggling(false);
    }
  }, [id, project?.gpuEnabled, gpuToggling, queryClient, toast]);

  const handleRun = () => {
    try {
      const html = buildPreviewDoc(files as FileNode[]);
      setPreviewSrcDoc(html);
    } catch {
      setPreviewSrcDoc(undefined);
    }
    setContainerRunning(true);
    toast({ title: "App running", description: "Preview is live in the right pane" });
  };

  const handleStop = () => {
    setContainerRunning(false);
    setPreviewSrcDoc(undefined);
  };

  const handleDeploy = () => {
    createDeployment.mutate(
      { id },
      {
        onSuccess: () => toast({ title: "Deployment started" }),
        onError: () => toast({ title: "Deploy failed", variant: "destructive" }),
      }
    );
  };

  const [activeSidebarTab, setActiveSidebarTab] = useState<"files" | "search" | "git" | "secrets" | "packages" | "database" | "extensions" | "settings" | "issues">("files");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (projectLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden" data-testid="project-page">
      <header className="h-11 border-b border-sidebar-border flex items-center px-2 shrink-0 bg-sidebar gap-1" data-testid="header-bar">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-1.5 px-2 min-w-0">
          <Code2 className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate" data-testid="text-project-name">{project?.name || "Project"}</span>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">({project?.language})</span>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-l border-border/30 ml-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => toast({ title: "Download started" })}>
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Version Control" onClick={() => setShowGitGraph(v => !v)}>
            <GitBranch className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Issues" onClick={() => setShowIssues(v => !v)}>
            <Bug className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview" onClick={() => setShowHeatmap(v => !v)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Share" onClick={() => setShowShareMenu(v => !v)}>
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Bookmark">
            <Star className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 mx-3 max-w-xl">
          <div className="flex items-center bg-muted/40 border border-border/50 rounded-md px-3 h-7 text-xs text-muted-foreground font-mono truncate">
            <Lock className="w-3 h-3 mr-2 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{project?.deployedUrl || `${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}.codecloud.dev`}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PresenceBar
            users={socketIO.presenceUsers}
            followingUser={socketIO.followingUser}
            onFollow={socketIO.startFollowing}
            onStopFollow={socketIO.stopFollowing}
            connected={socketIO.connected}
          />
          {!containerRunning ? (
            <Button size="sm" className="h-7 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleRun} data-testid="button-run">
              <Play className="w-3 h-3" /> Run
            </Button>
          ) : (
            <Button size="sm" className="h-7 px-3 text-xs gap-1.5 bg-red-500 hover:bg-red-600 text-white" onClick={handleStop} data-testid="button-stop">
              <Loader2 className="w-3 h-3 animate-spin" />
              <Square className="w-3 h-3" /> Stop
            </Button>
          )}
          <Button
            size="sm"
            variant={project?.gpuEnabled ? "secondary" : "ghost"}
            className={`h-7 px-3 text-xs gap-1.5 ${project?.gpuEnabled ? "text-green-400 border-green-500/30" : ""}`}
            onClick={handleGpuToggle}
            disabled={gpuToggling}
            data-testid="button-gpu-toggle"
          >
            <Zap className={`w-3 h-3 ${project?.gpuEnabled ? "text-green-400" : ""}`} />
            {gpuToggling ? "..." : project?.gpuEnabled ? "GPU On" : "GPU"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleDeploy}
            disabled={createDeployment.isPending}
            data-testid="button-deploy"
          >
            <Rocket className="w-3 h-3" /> Deploy
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant={showToolsMenu ? "secondary" : "ghost"}
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              data-testid="button-tools"
            >
              <Zap className="w-3 h-3" /> Tools
            </Button>
            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 max-h-[70vh] overflow-y-auto">
                {[
                  { label: "Deployment History", icon: Clock, fn: () => setShowDeployHistory(v => !v) },
                  { label: "Deploy Settings", icon: Settings, fn: () => setShowDeploySettings(v => !v) },
                  { label: "SSL Certificates", icon: ShieldCheck, fn: () => setShowSSL(v => !v) },
                  { label: "Snapshots", icon: Camera, fn: () => setShowSnapshots(v => !v) },
                  { label: "Whiteboard", icon: PenTool, fn: () => setShowWhiteboard(v => !v) },
                  { label: "REPL", icon: TerminalSquare, fn: () => setShowRepl(v => !v) },
                  { label: "Env Variables", icon: KeyRound, fn: () => setShowEnvVars(v => !v) },
                  { label: "GitHub PRs", icon: GitPullRequest, fn: () => setShowGitHubPR(v => !v) },
                  { label: "Network", icon: Network, fn: () => setShowNetwork(v => !v) },
                  { label: "Coverage", icon: BarChart3, fn: () => setShowCoverage(v => !v) },
                  { label: "README Generator", icon: BookOpen, fn: () => setShowReadme(v => !v) },
                  { label: "TODOs", icon: ListTodo, fn: () => setShowTodos(v => !v) },
                  { label: "Milestones", icon: Flag, fn: () => setShowMilestones(v => !v) },
                  { label: "Search Files", icon: Search, fn: () => setShowRegexSearch(v => !v) },
                  { label: "Docker Builder", icon: Package, fn: () => setShowDocker(v => !v) },
                  { label: "Rate Limits", icon: Activity, fn: () => setShowRateLimits(v => !v) },
                  { label: "Performance Audit", icon: Gauge, fn: () => setShowPerfTest(v => !v) },
                  { label: "License Checker", icon: Shield, fn: () => setShowLicenses(v => !v) },
                  { label: "Traffic Analytics", icon: Globe, fn: () => setShowTraffic(v => !v) },
                  { label: "Command History", icon: Terminal, fn: () => setShowExecHistory(v => !v) },
                  { label: "Coding Stats", icon: Clock, fn: () => setShowCodingStats(v => !v) },
                  { label: "Badge Generator", icon: Award, fn: () => setShowBadges(v => !v) },
                  { label: "Env Comparison", icon: ArrowLeftRight, fn: () => setShowEnvCompare(v => !v) },
                  { label: "Network Dashboard", icon: Network, fn: () => setShowNetworkDash(v => !v) },
                  { label: "Multi-Region", icon: Globe, fn: () => setShowRegions(v => !v) },
                  { label: "Geo Routing", icon: Globe, fn: () => setShowGeoRegions(v => !v) },
                  { label: "Cost Optimizer", icon: DollarSign, fn: () => setShowCosts(v => !v) },
                  { label: "Container Inspector", icon: Bug, fn: () => setShowContainerDebug(v => !v) },
                  { label: "Deploy Alerts", icon: Bell, fn: () => setShowDeployAlerts(v => !v) },
                  { label: "Security Patching", icon: Shield, fn: () => setShowSecurityPatch(v => !v) },
                  { label: "Vuln Scanner", icon: Scan, fn: () => setShowVulnScan(v => !v) },
                  { label: "Embed Widget", icon: Code, fn: () => setShowEmbed(v => !v) },
                  { label: "Layout Presets", icon: Layout, fn: () => setShowLayoutPresets(v => !v) },
                  { label: "Smart Terminal", icon: Terminal, fn: () => setShowSmartTerminal(v => !v) },
                  { label: "Migration Tool", icon: ArrowRight, fn: () => setShowMigration(v => !v) },
                  { label: "API Tester", icon: FileCode, fn: () => setShowApiTester(v => !v) },
                  { label: "Template Wizard", icon: Wand2, fn: () => setShowTemplateCustomizer(v => !v) },
                  { label: "FS Snapshot Diff", icon: HardDrive, fn: () => setShowFsDiff(v => !v) },
                  { label: "Extensions", icon: Puzzle, fn: () => setShowExtensions(v => !v) },
                  { label: "Starter Kits", icon: Package, fn: () => setShowStarterKits(v => !v) },
                  { label: "Resource Forecast", icon: TrendingUp, fn: () => setShowForecast(v => !v) },
                  { label: "Traffic Shaping", icon: Globe, fn: () => setShowTrafficRules(v => !v) },
                  { label: "Dependency Tree", icon: Layers, fn: () => setShowDependencyTree(v => !v) },
                  { label: "Activity Heatmap", icon: Flame, fn: () => setShowActivityHeatmap(v => !v) },
                  { label: "File Size Analyzer", icon: HardDrive, fn: () => setShowFileSizeAnalyzer(v => !v) },
                  { label: "Workspace Tabs", icon: BoxSelect, fn: () => setShowWorkspaceTabs(v => !v) },
                  { label: "Image Layers", icon: Layers, fn: () => setShowImageLayers(v => !v) },
                  { label: "AI Commit Message", icon: GitBranch, fn: () => setShowAiCommit(v => !v) },
                  { label: "File Encryption", icon: KeyRound, fn: () => setShowFileEncryption(v => !v) },
                  { label: "File Locks", icon: Lock, fn: () => setShowLockIndicator(v => !v) },
                  { label: "Macro Recorder", icon: Keyboard, fn: () => setShowMacroRecorder(v => !v) },
                  { label: "Analytics Export", icon: Download, fn: () => setShowAnalyticsExport(v => !v) },
                  { label: "CDN Cache", icon: Zap, fn: () => setShowCacheManager(v => !v) },
                  { label: "SQL Query Builder", icon: Database, fn: () => setShowSqlBuilder(v => !v) },
                  { label: "File Templates", icon: FileStack, fn: () => setShowFileTemplates(v => !v) },
                  { label: "SLA Monitor", icon: ShieldAlert, fn: () => setShowSLADashboard(v => !v) },
                  { label: "Cost Tags", icon: Tag, fn: () => setShowCostTags(v => !v) },
                  { label: "Live Metrics", icon: Radio, fn: () => setShowLiveMetrics(v => !v) },
                  { label: "Docker Optimizer", icon: Cpu, fn: () => setShowImageOptimizer(v => !v) },
                  { label: "Template Analytics", icon: BarChart3, fn: () => setShowTemplateAnalytics(v => !v) },
                  { label: "Auto-Healing", icon: HeartPulse, fn: () => setShowAutoHealing(v => !v) },
                  { label: "File Notifications", icon: Bell, fn: () => setShowFileNotifications(v => !v) },
                  { label: "Exec Timeouts", icon: Timer, fn: () => setShowExecTimeout(v => !v) },
                  { label: "Code Style", icon: Paintbrush, fn: () => setShowStyleEnforcer(v => !v) },
                  { label: "Traffic Mirror", icon: Copy, fn: () => setShowTrafficMirror(v => !v) },
                  { label: "File Type Stats", icon: FileCode, fn: () => setShowFileTypeStats(v => !v) },
                  { label: "Env Inspector", icon: Variable, fn: () => setShowEnvInspector(v => !v) },
                  { label: "Notifications", icon: Bell, fn: () => setShowNotificationCenter(v => !v) },
                  { label: "SSL Certificates", icon: Shield, fn: () => setShowSSLMonitor(v => !v) },
                  { label: "Code Duplication", icon: Copy, fn: () => setShowDuplication(v => !v) },
                  { label: "Network Policies", icon: Shield, fn: () => setShowNetworkPolicies(v => !v) },
                  { label: "API Designer", icon: Wand2, fn: () => setShowAPIDesigner(v => !v) },
                  { label: "Env Promotion", icon: Rocket, fn: () => setShowEnvPromotion(v => !v) },
                  { label: "Contributors", icon: Users, fn: () => setShowContributorInsights(v => !v) },
                  { label: "FS Monitor", icon: Eye, fn: () => setShowFsMonitor(v => !v) },
                  { label: "Command History", icon: History, fn: () => setShowCommandLog(v => !v) },
                  { label: "Response Budget", icon: Clock, fn: () => setShowResponseBudget(v => !v) },
                  { label: "README Updater", icon: FileText, fn: () => setShowReadmeUpdater(v => !v) },
                  { label: "Runtime Security", icon: ShieldCheck, fn: () => setShowRuntimeSecurity(v => !v) },
                  { label: "Data Model", icon: Database, fn: () => setShowDataModel(v => !v) },
                  { label: "AI Architect", icon: Sparkles, fn: () => setShowArchitect(v => !v) },
                  { label: "Canary Metrics", icon: GitBranch, fn: () => setShowCanary(v => !v) },
                  { label: "Annotations", icon: MessageSquare, fn: () => setShowAnnotations(v => !v) },
                  { label: "Log Shipping", icon: Truck, fn: () => setShowLogShipping(v => !v) },
                  { label: "Theme Creator", icon: Paintbrush, fn: () => setShowThemeCreator(v => !v) },
                  { label: "Circuit Breakers", icon: Zap, fn: () => setShowCircuitBreaker(v => !v) },
                  { label: "Error Pages", icon: FileText, fn: () => setShowErrorPages(v => !v) },
                  { label: "Multi-Root Workspace", icon: FolderOpen, fn: () => setShowMultiRoot(v => !v) },
                  { label: "Git Graph", icon: GitBranch, fn: () => setShowGitGraph(v => !v) },
                  { label: "Test Runner", icon: Play, fn: () => setShowTestRunner(v => !v) },
                  { label: "Nginx Config", icon: Server, fn: () => setShowNginxConfig(v => !v) },
                  { label: "Database Console", icon: Database, fn: () => setShowDbConsole(v => !v) },
                  { label: "Preview Annotator", icon: PenTool, fn: () => setShowAnnotator(v => !v) },
                  { label: "CSS Visualizer", icon: LayoutGrid, fn: () => setShowCSSVisualizer(v => !v) },
                  { label: "File Search", icon: Search, fn: () => setShowFileSearch(v => !v) },
                  { label: "TODO Scanner", icon: ListTodo, fn: () => setShowTodoScanner(v => !v) },
                  { label: "Middleware Pipeline", icon: Layers, fn: () => setShowMiddlewarePipeline(v => !v) },
                  { label: "Issues", icon: Bug, fn: () => setShowIssues(v => !v) },
                  { label: "Compliance Reports", icon: Shield, fn: () => window.open("/compliance", "_blank") },
                  { label: "Analytics Funnel", icon: BarChart3, fn: () => window.open("/funnel", "_blank") },
                  { label: "Error Tracking", icon: Bug, fn: () => window.open("/errors", "_blank") },
                  { label: "Wiki", icon: FileText, fn: () => window.open(`/wiki/${id}`, "_blank") },
                  { label: "Incidents", icon: Bell, fn: () => window.open("/incidents", "_blank") },
                ].map(item => (
                  <button key={item.label} onClick={() => { item.fn(); setShowToolsMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/50 text-left">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleSplitEditor}
            disabled={panes.length >= 2}
            title="Split Editor (Ctrl+\)"
            data-testid="button-split-editor"
          >
            <Columns2 className="w-3 h-3" /> Split
          </Button>
          <Button
            size="sm"
            variant={showAiChat ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setShowAiChat(!showAiChat)}
            data-testid="button-ai-chat"
          >
            <Bot className="w-3 h-3" /> AI
          </Button>
          <button
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            onClick={toggleTheme}
            title={editorTheme === "vs-dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            data-testid="button-theme-toggle"
          >
            {editorTheme === "vs-dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>
      </header>

      {showShareMenu && (
        <div className="absolute right-16 top-12 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs font-medium mb-2">Share Project</div>
          <div className="flex items-center gap-2 mb-2">
            <input
              readOnly
              value={`${window.location.origin}/project/${id}`}
              className="flex-1 bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs outline-none font-mono truncate"
              data-testid="input-share-url"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/project/${id}`);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              data-testid="button-copy-share-url"
            >
              {shareCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {project?.isPublic ? "Anyone with the link can view" : "Only collaborators can access"}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-12 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-1.5 gap-0.5 shrink-0" data-testid="activity-bar">
          {([
            { id: "files" as const, icon: FolderOpen, label: "Files" },
            { id: "search" as const, icon: Search, label: "Search" },
            { id: "git" as const, icon: GitBranch, label: "Git" },
            { id: "secrets" as const, icon: KeyRound, label: "Secrets" },
            { id: "packages" as const, icon: Package, label: "Packages" },
            { id: "database" as const, icon: Database, label: "Database" },
            { id: "issues" as const, icon: Bug, label: "Issues" },
            { id: "extensions" as const, icon: Puzzle, label: "Extensions" },
            { id: "settings" as const, icon: Settings, label: "Settings" },
          ] as const).map(item => {
            const isActive = activeSidebarTab === item.id && !sidebarCollapsed;
            return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "settings") { window.location.href = "/settings"; return; }
                if (activeSidebarTab === item.id && !sidebarCollapsed) {
                  setSidebarCollapsed(true);
                } else {
                  setActiveSidebarTab(item.id);
                  setSidebarCollapsed(false);
                }
              }}
              className={`relative w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
              title={item.label}
              data-testid={`activity-${item.id}`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.id === "issues" && issueCountTotal > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1 leading-none" data-testid="nav-issue-count">
                  {issueCountTotal}
                </span>
              )}
            </button>
          );})}
          <div className="flex-1" />
          <button
            onClick={() => setShowAiChat(v => !v)}
            className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
              showAiChat ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
            title="AI Assistant"
            data-testid="activity-ai"
          >
            <Bot className="w-[18px] h-[18px]" />
          </button>
        </div>

      <DropZone projectId={id} targetPath="" onUpload={handleDropUpload} onUploadComplete={handleDropComplete}>
      <PanelGroup direction="horizontal" className="flex-1">
        {!sidebarCollapsed && (
        <Panel defaultSize={18} minSize={12} maxSize={30}>
          <div className="h-full border-r border-sidebar-border flex flex-col bg-sidebar" data-testid={`side-panel-${activeSidebarTab}`}>
            <div className="px-3 h-9 flex items-center justify-between border-b border-sidebar-border/70 shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeSidebarTab === "files" && "Files"}
                {activeSidebarTab === "search" && "Search"}
                {activeSidebarTab === "git" && "Source Control"}
                {activeSidebarTab === "secrets" && "Secrets"}
                {activeSidebarTab === "packages" && "Packages"}
                {activeSidebarTab === "database" && "Database"}
                {activeSidebarTab === "issues" && "Issues"}
                {activeSidebarTab === "extensions" && "Extensions"}
                {activeSidebarTab === "settings" && "Settings"}
              </span>
              <div className="flex items-center gap-0.5">
                {activeSidebarTab === "files" && (
                  <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleNewFile("")}
                  title="New File"
                  data-testid="button-new-file"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleNewFolder("")}
                  title="New Folder"
                  data-testid="button-new-folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </Button>
                  </>
                )}
                {activeSidebarTab === "git" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setShowGitGraph((v) => !v)}
                    title="View commit graph"
                    data-testid="button-git-graph"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </Button>
                )}
                {activeSidebarTab === "search" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setShowRegexSearch((v) => !v)}
                    title="Find & replace in files"
                    data-testid="button-regex-search"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                )}
                {activeSidebarTab === "database" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setShowDbConsole((v) => !v)}
                    title="Open SQL console"
                    data-testid="button-db-console"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {activeSidebarTab !== "files" && (
              <div className="flex-1 overflow-y-auto" data-testid={`side-panel-content-${activeSidebarTab}`}>
                {activeSidebarTab === "search" && (
                  <div className="p-2">
                    <FileTreeSearch
                      files={files || []}
                      onSelectFile={(f) => {
                        const match = (files || []).find((x) => x.id === f.id);
                        if (match) selectFile(match);
                      }}
                    />
                  </div>
                )}
                {activeSidebarTab === "git" && (
                  <GitPanel projectId={id} files={files || []} />
                )}
                {activeSidebarTab === "secrets" && (
                  <EnvEditor />
                )}
                {activeSidebarTab === "packages" && (
                  <PackagesPanel />
                )}
                {activeSidebarTab === "database" && (
                  <DatabaseViewer projectId={id} />
                )}
                {activeSidebarTab === "issues" && (
                  <div className="p-3 text-xs text-muted-foreground">
                    {issueCountTotal > 0 ? `${issueCountTotal} open issue${issueCountTotal === 1 ? "" : "s"}` : "No issues reported"}
                  </div>
                )}
                {activeSidebarTab === "extensions" && (
                  <div className="p-3 text-xs text-muted-foreground">
                    Browse and install workspace extensions from the marketplace.
                  </div>
                )}
              </div>
            )}

            {activeSidebarTab === "files" && (
            <div className="flex-1 overflow-y-auto py-1" data-testid="file-tree">
              {(creatingFile || creatingFolder) && (
                <div className="px-2 py-1 flex items-center gap-1">
                  {creatingFolder && <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitNewFile();
                      if (e.key === "Escape") { setCreatingFile(false); setCreatingFolder(false); }
                    }}
                    autoFocus
                    className="h-6 text-xs"
                    placeholder={creatingFolder ? "folder-name" : "filename.ext"}
                    data-testid="input-new-filename"
                  />
                </div>
              )}
              {treeNodes.map((node) => (
                <FileTreeItem
                  key={node.file.id}
                  node={node}
                  depth={0}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  selectedFileId={selectedFileId}
                  onSelectFile={selectFile}
                  onNewFile={handleNewFile}
                  onNewFolder={handleNewFolder}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  onMoveFile={handleMoveFile}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={handleRenameCancel}
                  activeEditors={activeEditorsMap}
                />
              ))}
              {(!files || files.length === 0) && !creatingFile && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No files yet
                </div>
              )}
            </div>
            )}
            <div className="border-t border-border/30 mt-auto">
              <ResourceMonitor
                gpuEnabled={project?.gpuEnabled ?? false}
                projectId={id}
                userPlan={userPlan}
              />
            </div>
          </div>
        </Panel>
        )}

        {!sidebarCollapsed && (
          <PanelResizeHandle className="w-[5px] bg-transparent hover:bg-primary transition-colors" />
        )}

        <Panel defaultSize={50} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
              <PanelGroup direction="horizontal">
                {panes.map((pane, idx) => (
                  <Fragment key={idx}>
                    {idx > 0 && (
                      <PanelResizeHandle className="w-[5px] bg-transparent hover:bg-primary transition-colors" />
                    )}
                    <Panel defaultSize={Math.floor(100 / panes.length)} minSize={20}>
                      <EditorPaneView
                        projectId={id}
                        selectedFileId={pane.selectedFileId}
                        openTabs={pane.openTabs}
                        isActive={activePaneIndex === idx}
                        showClose={panes.length > 1}
                        editorTheme={editorTheme}
                        modifiedFiles={modifiedFiles}
                        setModifiedFiles={setModifiedFiles}
                        onSelectFileId={(fileId) => {
                          setPanes((prev) => prev.map((p, i) => i === idx ? { ...p, selectedFileId: fileId } : p));
                        }}
                        onUpdateTabs={(tabs) => {
                          setPanes((prev) => prev.map((p, i) => i === idx ? { ...p, openTabs: tabs } : p));
                        }}
                        onFocus={() => setActivePaneIndex(idx)}
                        onClose={() => handleCloseSplit(idx)}
                        onEditorMount={(editor, monaco) => {
                          paneEditorsRef.current[idx] = editor;
                          if (activePaneIndex === idx) {
                            editorRef.current = editor as any;
                            if (monaco) {
                              monacoInstanceRef.current = monaco;
                              handleEditorMount(editor as any, monaco);
                            }
                          }
                        }}
                        onCursorChange={(pos) => { if (activePaneIndex === idx) setCursorPosition(pos); }}
                        files={(files || []) as FileNode[]}
                      />
                    </Panel>
                  </Fragment>
                ))}
              </PanelGroup>
            </Panel>

            <PanelResizeHandle className="h-[5px] bg-transparent hover:bg-primary transition-colors" />

            <Panel defaultSize={30} minSize={10} maxSize={50}>
              <TerminalPanel
                projectId={id}
                files={files}
                onRun={handleRun}
                onStop={handleStop}
                containerRunning={containerRunning}
                runCommand={project?.runCommand ?? undefined}
                socketIO={socketIO.connected ? {
                  connected: socketIO.connected,
                  terminalConnected: socketIO.terminalConnected,
                  createTerminal: socketIO.createTerminal,
                  joinTerminal: socketIO.joinTerminal,
                  sendTerminalInput: socketIO.sendTerminalInput,
                  resizeTerminal: socketIO.resizeTerminal,
                  leaveTerminal: socketIO.leaveTerminal,
                  onTerminalOutput: socketIO.onTerminalOutput,
                  onTerminalCreated: socketIO.onTerminalCreated,
                  onTerminalScrollback: socketIO.onTerminalScrollback,
                } : undefined}
              />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-[5px] bg-transparent hover:bg-primary transition-colors" />

        <Panel defaultSize={32} minSize={15} maxSize={50}>
          <MultiPreview
            projectName={project?.name}
            deployedUrl={project?.deployedUrl ?? undefined}
            containerRunning={containerRunning}
            srcDoc={previewSrcDoc}
          />
        </Panel>
      </PanelGroup>
      </DropZone>
      </div>

      {showAiChat && (
        <AiPanel
          projectId={id}
          activeFilePath={currentFilePath || undefined}
          getActiveFileContent={() => editorRef.current?.getValue() || ""}
          getActiveFileLanguage={() => {
            const f = openTabs.find(t => t.id === selectedFileId);
            return f ? getLanguageFromFilename(f.name) : "typescript";
          }}
          getRecentErrors={() => recentTerminalErrorsRef.current.slice(-20).join("\n")}
          applyToActiveFile={(code) => {
            const editor = editorRef.current;
            if (!editor) return;
            editor.setValue(code);
          }}
          insertAtCursor={(code) => {
            const editor = editorRef.current;
            if (!editor) return;
            const sel = editor.getSelection();
            if (!sel) return;
            editor.executeEdits("ai-insert", [{ range: sel, text: code, forceMoveMarkers: true }]);
          }}
          onClose={() => setShowAiChat(false)}
        />
      )}
      {showDeployHistory && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="deploy-history-panel">
          <DeploymentHistory
            projectId={id}
            onClose={() => setShowDeployHistory(false)}
          />
        </div>
      )}

      {showDeploySettings && (
        <div className="h-48 border-t border-border/50 shrink-0" data-testid="deploy-settings-panel">
          <DeploySettingsPanel
            projectId={id}
            testCommand={project?.testCommand ?? ""}
            onClose={() => setShowDeploySettings(false)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) })}
          />
        </div>
      )}

      {showSSL && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="ssl-panel">
          <SSLCertificates
            projectId={id}
            onClose={() => setShowSSL(false)}
          />
        </div>
      )}

      {showSnapshots && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="snapshots-panel">
          <SnapshotManager
            projectId={id}
            onClose={() => setShowSnapshots(false)}
          />
        </div>
      )}

      {showWhiteboard && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="whiteboard-panel">
          <Whiteboard
            onClose={() => setShowWhiteboard(false)}
          />
        </div>
      )}

      {showTestRunner && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="test-runner-panel">
          <InlineTestRunner onClose={() => setShowTestRunner(false)} />
        </div>
      )}

      {showNginxConfig && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="nginx-config-panel">
          <NginxConfigEditor projectId={id} onClose={() => setShowNginxConfig(false)} />
        </div>
      )}

      {showDbConsole && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="db-console-panel">
          <DatabaseConsole onClose={() => setShowDbConsole(false)} />
        </div>
      )}

      {showAnnotator && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="annotator-panel">
          <PreviewAnnotator
            previewUrl={project?.deployedUrl ?? undefined}
            onClose={() => setShowAnnotator(false)}
          />
        </div>
      )}

      {showCSSVisualizer && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="css-visualizer-panel">
          <CSSVisualizer onClose={() => setShowCSSVisualizer(false)} />
        </div>
      )}

      {showFileSearch && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="file-search-panel">
          <FileTreeSearch
            files={(files || []).map((f: any) => ({ id: f.id, name: f.name, path: f.path, isDirectory: f.isDirectory }))}
            onSelectFile={(f: any) => { selectFile(f); setShowFileSearch(false); }}
            onClose={() => setShowFileSearch(false)}
          />
        </div>
      )}

      {showTodoScanner && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="todo-scanner-panel">
          <TodoScanner onClose={() => setShowTodoScanner(false)} />
        </div>
      )}

      {showMiddlewarePipeline && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="middleware-pipeline-panel">
          <MiddlewarePipeline onClose={() => setShowMiddlewarePipeline(false)} />
        </div>
      )}

      {showIssues && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="issues-panel">
          <IssueTrackerPanel
            projectId={id}
            onClose={() => setShowIssues(false)}
            onNavigateToFile={(filePath, line) => {
              const file = (files || []).find((f: FileNode) => f.path === filePath || f.name === filePath);
              if (file && !file.isDirectory) {
                selectFile(file);
                setTimeout(() => {
                  const editor = editorRef.current;
                  if (editor?.revealLineInCenter) editor.revealLineInCenter(line);
                  if (editor?.setPosition) editor.setPosition({ lineNumber: line, column: 1 });
                }, 200);
              }
            }}
          />
        </div>
      )}

      {showRepl && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="repl-panel">
          <REPL onClose={() => setShowRepl(false)} />
        </div>
      )}

      {showEnvVars && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="env-vars-panel">
          <DeployEnvVars projectId={id} onClose={() => setShowEnvVars(false)} />
        </div>
      )}

      {showGitHubPR && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="github-pr-panel">
          <GitHubPR projectId={id} onClose={() => setShowGitHubPR(false)} />
        </div>
      )}

      {showNetwork && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="network-panel">
          <ContainerNetwork projectId={id} onClose={() => setShowNetwork(false)} />
        </div>
      )}

      {showCoverage && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="coverage-panel">
          <CoverageOverlay projectId={id} onClose={() => setShowCoverage(false)} />
        </div>
      )}

      {showReadme && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="readme-panel">
          <ReadmeGenerator projectId={id} onClose={() => setShowReadme(false)} />
        </div>
      )}

      {showDocker && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="docker-panel">
          <DockerfileEditor projectId={id} onClose={() => setShowDocker(false)} />
        </div>
      )}

      {showRateLimits && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="rate-limits-panel">
          <RateLimitDashboard onClose={() => setShowRateLimits(false)} />
        </div>
      )}

      {showPerfTest && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="perf-test-panel">
          <PerfReport projectId={id} onClose={() => setShowPerfTest(false)} />
        </div>
      )}

      {showLicenses && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="licenses-panel">
          <LicenseReport projectId={id} onClose={() => setShowLicenses(false)} />
        </div>
      )}

      {showTodos && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="todos-panel">
          <TodoPanel projectId={id} onClose={() => setShowTodos(false)} />
        </div>
      )}

      {showMilestones && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="milestones-panel">
          <MilestonePanel projectId={id} onClose={() => setShowMilestones(false)} />
        </div>
      )}

      {showTraffic && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="traffic-panel">
          <TrafficDashboard projectId={id} onClose={() => setShowTraffic(false)} />
        </div>
      )}

      {showExecHistory && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="exec-history-panel">
          <CommandHistory projectId={id} onClose={() => setShowExecHistory(false)} />
        </div>
      )}

      {showCodingStats && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="coding-stats-panel">
          <CodingStats onClose={() => setShowCodingStats(false)} />
        </div>
      )}

      {showBadges && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="badges-panel">
          <BadgeGenerator projectId={id} projectName={project?.name || ""} onClose={() => setShowBadges(false)} />
        </div>
      )}

      {showEnvCompare && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="env-compare-panel">
          <EnvComparison projectId={id} onClose={() => setShowEnvCompare(false)} />
        </div>
      )}

      {showNetworkDash && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="network-dash-panel">
          <NetworkDashboard projectId={id} onClose={() => setShowNetworkDash(false)} />
        </div>
      )}

      {showRegions && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="regions-panel">
          <RegionSelector projectId={id} onClose={() => setShowRegions(false)} />
        </div>
      )}

      {showGeoRegions && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="geo-regions-panel">
          <DeploymentRegions projectId={id} onClose={() => setShowGeoRegions(false)} />
        </div>
      )}

      {showCosts && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="costs-panel">
          <CostOptimizer projectId={id} onClose={() => setShowCosts(false)} />
        </div>
      )}

      {showContainerDebug && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="container-debug-panel">
          <ContainerDebug projectId={id} onClose={() => setShowContainerDebug(false)} />
        </div>
      )}

      {showLayoutPresets && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="layout-presets-panel">
          <LayoutPresets onClose={() => setShowLayoutPresets(false)} onApplyPreset={() => {}} />
        </div>
      )}

      {showRegexSearch && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="regex-search-panel">
          <RegexSearch projectId={id} files={files || []} onClose={() => setShowRegexSearch(false)} />
        </div>
      )}

      {showDeployAlerts && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="deploy-alerts-panel">
          <DeployAlerts projectId={id} onClose={() => setShowDeployAlerts(false)} />
        </div>
      )}

      {showSecurityPatch && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="security-patch-panel">
          <SecurityPatch projectId={id} onClose={() => setShowSecurityPatch(false)} />
        </div>
      )}

      {showVulnScan && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="vuln-scan-panel">
          <VulnScanner onClose={() => setShowVulnScan(false)} />
        </div>
      )}

      {showEmbed && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="embed-panel">
          <EmbedConfig projectId={id} projectName={project?.name || ""} onClose={() => setShowEmbed(false)} />
        </div>
      )}

      {showSmartTerminal && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="smart-terminal-panel">
          <SmartTerminal onClose={() => setShowSmartTerminal(false)} />
        </div>
      )}

      {showMigration && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="migration-panel">
          <ProjectMigration projectId={id} onClose={() => setShowMigration(false)} />
        </div>
      )}

      {showApiTester && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="api-tester-panel">
          <ApiTestRunner projectId={id} onClose={() => setShowApiTester(false)} />
        </div>
      )}

      {showTemplateCustomizer && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="template-customizer-panel">
          <TemplateCustomizer templateId="default" templateName={project?.name || "Project"} onClose={() => setShowTemplateCustomizer(false)} onGenerate={(config) => { console.log("Generated config:", config); setShowTemplateCustomizer(false); }} />
        </div>
      )}

      {showFsDiff && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="fs-diff-panel">
          <FsSnapshotDiff projectId={id} onClose={() => setShowFsDiff(false)} />
        </div>
      )}

      {showExtensions && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="extensions-panel">
          <ExtensionManager onClose={() => setShowExtensions(false)} />
        </div>
      )}

      {showStarterKits && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="starter-kits-panel">
          <StarterKits onClose={() => setShowStarterKits(false)} />
        </div>
      )}

      {showForecast && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="forecast-panel">
          <ResourceForecast projectId={id} onClose={() => setShowForecast(false)} />
        </div>
      )}

      {showTrafficRules && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="traffic-rules-panel">
          <TrafficRules projectId={id} onClose={() => setShowTrafficRules(false)} />
        </div>
      )}

      {showDependencyTree && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="dependency-tree-panel">
          <DependencyTree projectId={id} onClose={() => setShowDependencyTree(false)} />
        </div>
      )}

      {showActivityHeatmap && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="activity-heatmap-panel">
          <ActivityHeatmap onClose={() => setShowActivityHeatmap(false)} />
        </div>
      )}

      {showFileSizeAnalyzer && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="file-size-panel">
          <FileSizeAnalyzer projectId={id} onClose={() => setShowFileSizeAnalyzer(false)} />
        </div>
      )}

      {showImageLayers && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="image-layers-panel">
          <ImageLayerInspector projectId={id} onClose={() => setShowImageLayers(false)} />
        </div>
      )}

      {showAiCommit && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="ai-commit-panel">
          <AiCommitMessage projectId={id} onClose={() => setShowAiCommit(false)} />
        </div>
      )}

      {showFileEncryption && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="file-encryption-panel">
          <FileEncryption projectId={id} onClose={() => setShowFileEncryption(false)} />
        </div>
      )}

      {showLockIndicator && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="lock-indicator-panel">
          <LockIndicator projectId={id} onClose={() => setShowLockIndicator(false)} />
        </div>
      )}

      {showMacroRecorder && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="macro-recorder-panel">
          <MacroRecorder onClose={() => setShowMacroRecorder(false)} />
        </div>
      )}

      {showAnalyticsExport && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="analytics-export-panel">
          <AnalyticsExport projectId={id} onClose={() => setShowAnalyticsExport(false)} />
        </div>
      )}

      {showCacheManager && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="cache-manager-panel">
          <CacheManager projectId={id} onClose={() => setShowCacheManager(false)} />
        </div>
      )}

      {showSqlBuilder && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="sql-builder-panel">
          <SqlQueryBuilder onClose={() => setShowSqlBuilder(false)} />
        </div>
      )}

      {showFileTemplates && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="file-templates-panel">
          <FileTemplates onClose={() => setShowFileTemplates(false)} />
        </div>
      )}

      {showSLADashboard && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="sla-dashboard-panel">
          <SLADashboard projectId={id} onClose={() => setShowSLADashboard(false)} />
        </div>
      )}

      {showCostTags && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="cost-tags-panel">
          <CostTags projectId={id} onClose={() => setShowCostTags(false)} />
        </div>
      )}

      {showLiveMetrics && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="live-metrics-panel">
          <LiveMetrics projectId={id} onClose={() => setShowLiveMetrics(false)} />
        </div>
      )}

      {showImageOptimizer && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="image-optimizer-panel">
          <ImageOptimizer projectId={id} onClose={() => setShowImageOptimizer(false)} />
        </div>
      )}

      {showTemplateAnalytics && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="template-analytics-panel">
          <TemplateAnalytics onClose={() => setShowTemplateAnalytics(false)} />
        </div>
      )}

      {showAutoHealing && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="auto-healing-panel">
          <AutoHealing projectId={id} onClose={() => setShowAutoHealing(false)} />
        </div>
      )}

      {showFileNotifications && (
        <div className="h-72 border-t border-border/50 shrink-0" data-testid="file-notifications-panel">
          <FileNotifications projectId={id} onClose={() => setShowFileNotifications(false)} />
        </div>
      )}

      {showExecTimeout && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="exec-timeout-panel">
          <ExecTimeout projectId={id} onClose={() => setShowExecTimeout(false)} />
        </div>
      )}

      {showStyleEnforcer && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="style-enforcer-panel">
          <StyleEnforcer onClose={() => setShowStyleEnforcer(false)} />
        </div>
      )}

      {showTrafficMirror && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="traffic-mirror-panel">
          <TrafficMirror projectId={id} onClose={() => setShowTrafficMirror(false)} />
        </div>
      )}

      {showFileTypeStats && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="file-type-stats-panel">
          <FileTypeStats projectId={id} onClose={() => setShowFileTypeStats(false)} />
        </div>
      )}

      {showEnvInspector && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="env-inspector-panel">
          <EnvInspector projectId={id} onClose={() => setShowEnvInspector(false)} />
        </div>
      )}

      {showNotificationCenter && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="notification-center-panel">
          <NotificationCenter onClose={() => setShowNotificationCenter(false)} />
        </div>
      )}

      {showSSLMonitor && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="ssl-monitor-panel">
          <SSLMonitor onClose={() => setShowSSLMonitor(false)} />
        </div>
      )}

      {showDuplication && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="duplication-report-panel">
          <DuplicationReport projectId={id} onClose={() => setShowDuplication(false)} />
        </div>
      )}

      {showNetworkPolicies && (
        <div className="h-80 border-t border-border/50 shrink-0" data-testid="network-policies-panel">
          <NetworkPolicies projectId={id} onClose={() => setShowNetworkPolicies(false)} />
        </div>
      )}

      {showAPIDesigner && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="api-designer-panel">
          <APIDesigner onClose={() => setShowAPIDesigner(false)} />
        </div>
      )}

      {showEnvPromotion && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="env-promotion-panel">
          <EnvPromotion onClose={() => setShowEnvPromotion(false)} />
        </div>
      )}

      {showContributorInsights && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="contributor-insights-panel">
          <ContributorInsights projectId={id} onClose={() => setShowContributorInsights(false)} />
        </div>
      )}

      {showFsMonitor && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="fs-monitor-panel">
          <FsMonitor projectId={id} onClose={() => setShowFsMonitor(false)} />
        </div>
      )}

      {showCommandLog && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="command-log-panel">
          <CommandLog onClose={() => setShowCommandLog(false)} />
        </div>
      )}

      {showResponseBudget && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="response-budget-panel">
          <ResponseBudget onClose={() => setShowResponseBudget(false)} />
        </div>
      )}

      {showReadmeUpdater && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="readme-updater-panel">
          <ReadmeUpdater projectId={id} onClose={() => setShowReadmeUpdater(false)} />
        </div>
      )}

      {showRuntimeSecurity && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="runtime-security-panel">
          <RuntimeSecurity projectId={id} onClose={() => setShowRuntimeSecurity(false)} />
        </div>
      )}

      {showDataModel && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="data-model-panel">
          <DataModelDesigner onClose={() => setShowDataModel(false)} />
        </div>
      )}

      {showArchitect && (
        <div className="h-[500px] border-t border-border/50 shrink-0" data-testid="architect-planner-panel">
          <ArchitectPlanner
            projectId={id}
            onClose={() => setShowArchitect(false)}
            onScaffolded={() => queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(id) })}
          />
        </div>
      )}

      {showCanary && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="canary-dashboard-panel">
          <CanaryDashboard onClose={() => setShowCanary(false)} />
        </div>
      )}

      {showAnnotations && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="annotation-layer-panel">
          <AnnotationLayer projectId={id} filePath={activeFileData?.name} onClose={() => setShowAnnotations(false)} />
        </div>
      )}

      {showLogShipping && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="log-shipping-panel">
          <LogShipping projectId={id} onClose={() => setShowLogShipping(false)} />
        </div>
      )}

      {showThemeCreator && (
        <div className="h-[500px] border-t border-border/50 shrink-0" data-testid="theme-creator-panel">
          <ThemeCreator onClose={() => setShowThemeCreator(false)} />
        </div>
      )}

      {showCircuitBreaker && (
        <div className="h-96 border-t border-border/50 shrink-0" data-testid="circuit-breaker-panel">
          <CircuitBreakerDashboard onClose={() => setShowCircuitBreaker(false)} />
        </div>
      )}

      {showErrorPages && (
        <div className="h-[450px] border-t border-border/50 shrink-0" data-testid="error-pages-panel">
          <ErrorPageEditor projectId={id} onClose={() => setShowErrorPages(false)} />
        </div>
      )}

      {showMultiRoot && (
        <div className="h-[450px] border-t border-border/50 shrink-0" data-testid="multi-root-panel">
          <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333]">
            <span className="text-xs text-gray-400">Multi-Root Workspace</span>
            <button onClick={() => setShowMultiRoot(false)} className="text-gray-500 hover:text-white text-xs px-1">✕</button>
          </div>
          <div className="h-[calc(100%-28px)]">
            <MultiRootWorkspace />
          </div>
        </div>
      )}

      {showGitGraph && (
        <div className="h-[450px] border-t border-border/50 shrink-0" data-testid="git-graph-panel">
          <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333]">
            <span className="text-xs text-gray-400">Git Graph</span>
            <button onClick={() => setShowGitGraph(false)} className="text-gray-500 hover:text-white text-xs px-1">✕</button>
          </div>
          <div className="h-[calc(100%-28px)]">
            <GitGraph />
          </div>
        </div>
      )}

      {codeActionsMenu && (
        <CodeActionsMenu
          x={codeActionsMenu.x}
          y={codeActionsMenu.y}
          hasSelection={!!editorRef.current?.getSelection()?.toString()}
          onAction={(action) => {
            const editor = editorRef.current;
            if (!editor) return;
            switch (action) {
              case "cut": editor.trigger("contextMenu", "editor.action.clipboardCutAction", null); break;
              case "copy": editor.trigger("contextMenu", "editor.action.clipboardCopyAction", null); break;
              case "paste": editor.trigger("contextMenu", "editor.action.clipboardPasteAction", null); break;
              case "formatSelection": editor.trigger("contextMenu", "editor.action.formatSelection", null); break;
              case "renameSymbol": editor.trigger("contextMenu", "editor.action.rename", null); break;
              case "goToDefinition": editor.trigger("contextMenu", "editor.action.revealDefinition", null); break;
              case "findReferences": editor.trigger("contextMenu", "editor.action.goToReferences", null); break;
              case "peekDefinition": editor.trigger("contextMenu", "editor.action.peekDefinition", null); break;
              default: break;
            }
          }}
          onClose={() => setCodeActionsMenu(null)}
        />
      )}

      {showHeatmap && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="heatmap-panel">
          <MinimapHeatmap
            totalLines={editorRef.current?.getModel?.()?.getLineCount?.() || 100}
            visibleStartLine={Math.max(1, cursorPosition.line - 20)}
            visibleEndLine={cursorPosition.line + 20}
            onNavigate={(line) => {
              const editor = editorRef.current;
              if (editor?.revealLineInCenter) editor.revealLineInCenter(line);
              if (editor?.setPosition) editor.setPosition({ lineNumber: line, column: 1 });
            }}
            editorRef={editorRef}
            onClose={() => setShowHeatmap(false)}
          />
        </div>
      )}

      {showFileWatcher && (
        <div className="h-64 border-t border-border/50 shrink-0" data-testid="file-watcher-panel">
          <FileWatcherPanel
            watcherState={fileWatcherHook.watcherState}
            recentChanges={fileWatcherHook.recentChanges}
            conflicts={fileWatcherHook.conflicts}
            unresolvedConflicts={fileWatcherHook.unresolvedConflicts}
            connected={fileWatcherHook.connected}
            onStartWatcher={fileWatcherHook.startWatcher}
            onStopWatcher={fileWatcherHook.stopWatcher}
            onResolveConflict={fileWatcherHook.resolveConflict}
          />
        </div>
      )}

      <footer className="h-6 border-t border-border/50 flex items-center justify-between px-3 shrink-0 bg-card/30 text-[11px] text-muted-foreground" data-testid="status-bar">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            <span>main</span>
          </div>
          {containerRunning ? (
            <div className="flex items-center gap-1 text-green-400">
              <Wifi className="w-3 h-3" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>Stopped</span>
            </div>
          )}
          {modifiedFiles.size > 0 && (
            <div className="flex items-center gap-1">
              <Save className="w-3 h-3" />
              <span>{modifiedFiles.size} unsaved</span>
            </div>
          )}
          <TypingIndicator />
          <button
            onClick={() => setShowFileWatcher((v) => !v)}
            className={`flex items-center gap-1 cursor-pointer hover:text-foreground ${
              fileWatcherHook.connected ? "text-green-400" : "text-muted-foreground"
            }`}
            data-testid="file-watcher-toggle"
          >
            <Eye className="w-3 h-3" />
            <span>Watcher{fileWatcherHook.unresolvedConflicts.length > 0 ? ` (${fileWatcherHook.unresolvedConflicts.length})` : ""}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {selectedFileId && (files || []).find((f) => f.id === selectedFileId) && (
            <>
              <span data-testid="status-language">{getLanguageFromFilename((files || []).find((f) => f.id === selectedFileId)!.name)}</span>
              <span data-testid="status-cursor">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
              <span>UTF-8</span>
              <span>Spaces: 2</span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
