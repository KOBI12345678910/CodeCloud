import { useState } from "react";
import { X, Package, ChevronRight, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface DepNode {
  name: string;
  version: string;
  depth: number;
  children: DepNode[];
  isCircular?: boolean;
  isDirect: boolean;
}

const SAMPLE_TREE: DepNode[] = [
  { name: "react", version: "18.2.0", depth: 0, isDirect: true, children: [
    { name: "loose-envify", version: "1.4.0", depth: 1, isDirect: false, children: [{ name: "js-tokens", version: "4.0.0", depth: 2, isDirect: false, children: [] }] },
  ]},
  { name: "express", version: "5.0.0", depth: 0, isDirect: true, children: [
    { name: "body-parser", version: "2.0.0", depth: 1, isDirect: false, children: [
      { name: "bytes", version: "3.1.2", depth: 2, isDirect: false, children: [] },
      { name: "content-type", version: "1.0.5", depth: 2, isDirect: false, children: [] },
    ]},
    { name: "cookie", version: "0.6.0", depth: 1, isDirect: false, children: [] },
    { name: "path-to-regexp", version: "8.0.0", depth: 1, isDirect: false, children: [] },
  ]},
  { name: "typescript", version: "5.3.3", depth: 0, isDirect: true, children: [] },
  { name: "drizzle-orm", version: "0.29.0", depth: 0, isDirect: true, children: [
    { name: "drizzle-kit", version: "0.20.0", depth: 1, isDirect: false, isCircular: true, children: [] },
  ]},
  { name: "tailwindcss", version: "3.4.0", depth: 0, isDirect: true, children: [
    { name: "postcss", version: "8.4.0", depth: 1, isDirect: false, children: [] },
    { name: "autoprefixer", version: "10.4.0", depth: 1, isDirect: false, children: [] },
  ]},
];

function TreeNode({ node, level = 0 }: { node: DepNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 hover:bg-muted/30 rounded px-1 py-0.5" style={{ paddingLeft: `${level * 16 + 4}px` }}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" /> : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />}
          </button>
        ) : <div className="w-3.5" />}
        <Package className={`w-3 h-3 ${node.isDirect ? "text-primary" : "text-muted-foreground"} shrink-0`} />
        <span className={`text-[10px] font-mono ${node.isCircular ? "text-orange-400" : ""}`}>{node.name}</span>
        <span className="text-[10px] text-muted-foreground">@{node.version}</span>
        {node.isCircular && <span title="Circular dependency"><AlertTriangle className="w-2.5 h-2.5 text-orange-400" /></span>}
        {node.isDirect && <span className="text-[9px] px-1 bg-primary/10 text-primary rounded">direct</span>}
      </div>
      {expanded && hasChildren && node.children.map((c, i) => <TreeNode key={i} node={c} level={level + 1} />)}
    </div>
  );
}

export function DependencyTree({ projectId, onClose }: Props) {
  const totalDeps = SAMPLE_TREE.length;
  const transitive = SAMPLE_TREE.reduce((s, n) => s + countChildren(n), 0);
  const circular = SAMPLE_TREE.reduce((s, n) => s + countCircular(n), 0);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="dependency-tree">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Dependency Tree</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/30 text-[10px] text-muted-foreground shrink-0">
        <span>{totalDeps} direct</span><span>{transitive} transitive</span>
        {circular > 0 && <span className="text-orange-400">{circular} circular</span>}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {SAMPLE_TREE.map((node, i) => <TreeNode key={i} node={node} />)}
      </div>
    </div>
  );
}

function countChildren(n: DepNode): number { return n.children.length + n.children.reduce((s, c) => s + countChildren(c), 0); }
function countCircular(n: DepNode): number { return (n.isCircular ? 1 : 0) + n.children.reduce((s, c) => s + countCircular(c), 0); }
