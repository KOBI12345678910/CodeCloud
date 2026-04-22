import { useState } from "react";
import { X, GitCommit, Loader2, Sparkles, Copy, Check, RefreshCw, Pencil } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const SAMPLE_CHANGES = [
  { file: "src/components/Dashboard.tsx", status: "modified" as const, additions: 45, deletions: 12 },
  { file: "src/hooks/useAuth.ts", status: "modified" as const, additions: 8, deletions: 3 },
  { file: "src/components/UserProfile.tsx", status: "added" as const, additions: 120, deletions: 0 },
  { file: "src/styles/profile.css", status: "added" as const, additions: 35, deletions: 0 },
  { file: "src/utils/deprecated.ts", status: "deleted" as const, additions: 0, deletions: 89 },
];

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  modified: "text-yellow-400",
  deleted: "text-red-400",
  renamed: "text-blue-400",
};

const STATUS_LABELS: Record<string, string> = { added: "A", modified: "M", deleted: "D", renamed: "R" };

export function AiCommitMessage({ projectId, onClose }: Props) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/commit-message`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: SAMPLE_CHANGES }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setEditedMessage(data.message);
        setEditing(false);
      }
    } catch {} finally { setLoading(false); }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(editing ? editedMessage : result?.message || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="ai-commit-message">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><GitCommit className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">AI Commit Message</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-card/50 rounded-lg border border-border/30 p-2.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Staged Changes ({SAMPLE_CHANGES.length} files)</div>
          <div className="space-y-0.5">
            {SAMPLE_CHANGES.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={`w-3 font-bold ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                <span className="flex-1 truncate">{c.file}</span>
                {c.additions > 0 && <span className="text-green-400">+{c.additions}</span>}
                {c.deletions > 0 && <span className="text-red-400">-{c.deletions}</span>}
              </div>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Generating..." : result ? "Regenerate" : "Generate Commit Message"}
        </button>

        {result && (
          <>
            <div className="bg-card/50 rounded-lg border border-border/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded uppercase font-bold">{result.type}</span>
                  {result.scope && <span className="text-[10px] text-muted-foreground">({result.scope})</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(!editing)} className="p-1 hover:bg-muted rounded" title="Edit"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                  <button onClick={copyMessage} className="p-1 hover:bg-muted rounded" title="Copy">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              {editing ? (
                <textarea value={editedMessage} onChange={e => setEditedMessage(e.target.value)} className="w-full bg-muted/50 rounded p-2 text-xs font-mono outline-none resize-none h-16 border border-border/30 focus:border-primary/50" />
              ) : (
                <div className="text-xs font-mono bg-muted/30 rounded p-2 break-all">{result.message}</div>
              )}
              {result.body && <div className="text-[10px] text-muted-foreground">{result.body}</div>}
            </div>

            {result.alternatives.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Alternatives</div>
                {result.alternatives.map((alt: string, i: number) => (
                  <button key={i} onClick={() => { setResult({ ...result, message: alt }); setEditedMessage(alt); }} className="w-full text-left text-[10px] font-mono bg-card/50 hover:bg-muted/50 rounded p-2 border border-border/30 transition-colors">
                    {alt}
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => { /* commit action */ }} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500">
              <GitCommit className="w-3.5 h-3.5" />
              Commit with Message
            </button>
          </>
        )}
      </div>
    </div>
  );
}
