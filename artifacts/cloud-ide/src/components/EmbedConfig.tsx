import { useState } from "react";
import { X, Code, Copy, Check, Eye } from "lucide-react";

interface Props { projectId: string; projectName: string; onClose: () => void; }

export function EmbedConfig({ projectId, projectName, onClose }: Props) {
  const [mode, setMode] = useState<"readonly" | "interactive">("readonly");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showRun, setShowRun] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/${projectId}?mode=${mode}&theme=${theme}${filePath ? `&file=${encodeURIComponent(filePath)}` : ""}${showRun ? "&run=true" : ""}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;

  const copy = () => { navigator.clipboard.writeText(iframeCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="embed-config">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Code className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Embed Widget</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode</div>
          <div className="flex gap-2">{(["readonly", "interactive"] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs rounded border ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>{m === "readonly" ? "Read Only" : "Interactive"}</button>)}</div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme</div>
          <div className="flex gap-2">{(["dark", "light"] as const).map(t => <button key={t} onClick={() => setTheme(t)} className={`flex-1 py-1.5 text-xs rounded border ${theme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>{t}</button>)}</div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">File Path (optional)</div>
          <input value={filePath} onChange={e => setFilePath(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs font-mono" placeholder="src/index.ts" />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={showRun} onChange={e => setShowRun(e.target.checked)} className="rounded" />Show run button
        </label>
        <div className="space-y-1">
          <div className="flex items-center justify-between"><div className="text-[10px] text-muted-foreground uppercase tracking-wider">Embed Code</div><button onClick={copy} className="flex items-center gap-1 text-[10px] text-primary">{copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}{copied ? "Copied" : "Copy"}</button></div>
          <pre className="bg-muted/50 border border-border/50 rounded p-2 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">{iframeCode}</pre>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider"><Eye className="w-3 h-3" /> Preview</div>
          <div className="border border-border/50 rounded overflow-hidden bg-muted/20 h-40 flex items-center justify-center text-xs text-muted-foreground">
            <div className="text-center"><Code className="w-6 h-6 mx-auto mb-1 opacity-30" /><p>Embed preview for {projectName}</p><p className="text-[10px]">{mode} · {theme}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
