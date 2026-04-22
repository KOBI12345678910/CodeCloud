import { useState, useCallback } from "react";
import {
  X, FileText, Loader2, Copy, Check, Download,
  ChevronDown, ChevronRight, Settings2, Sparkles,
  Code2, TestTube, Container, GitBranch,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface AnalysisInfo {
  name: string;
  language: string;
  framework: string;
  totalFiles: number;
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
}

interface Props {
  projectId: string;
  onClose: () => void;
  onInsertFile?: (content: string) => void;
}

export function ReadmeGenerator({ projectId, onClose, onInsertFile }: Props) {
  const [readme, setReadme] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisInfo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState({
    includeApi: true,
    includeBadges: true,
    includeContributing: true,
    includeLicense: true,
  });

  const generate = useCallback(async () => {
    setGenerating(true);
    setError("");
    setReadme("");
    try {
      const res = await fetch(`${API}/projects/${projectId}/readme/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate README");
        return;
      }
      const data = await res.json();
      setReadme(data.readme);
      setAnalysis(data.analysis);
    } catch {
      setError("Failed to generate README");
    } finally {
      setGenerating(false);
    }
  }, [projectId, options]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReadme = () => {
    const blob = new Blob([readme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="readme-generator">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">README Generator</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`p-1 rounded hover:bg-muted ${showOptions ? "text-primary" : "text-muted-foreground"}`}
            title="Options"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded" data-testid="close-readme">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showOptions && (
        <div className="px-3 py-2 border-b border-border/30 bg-card/30 grid grid-cols-2 gap-2">
          {[
            { key: "includeBadges" as const, label: "Badges" },
            { key: "includeApi" as const, label: "API Docs" },
            { key: "includeContributing" as const, label: "Contributing" },
            { key: "includeLicense" as const, label: "License" },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={options[opt.key]}
                onChange={e => setOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                className="w-3 h-3 rounded border-border"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2 shrink-0">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 font-medium"
          data-testid="generate-readme"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? "Analyzing project..." : "Generate README"}
        </button>
        {readme && (
          <>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-muted"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={downloadReadme}
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-muted"
            >
              <Download className="w-3 h-3" /> Download
            </button>
            {onInsertFile && (
              <button
                onClick={() => onInsertFile(readme)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-muted"
              >
                <FileText className="w-3 h-3" /> Insert as File
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-400/10 border-b border-red-400/20">
          {error}
        </div>
      )}

      {analysis && (
        <div className="px-3 py-2 border-b border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground shrink-0 bg-card/30">
          <span className="flex items-center gap-1"><Code2 className="w-3 h-3" /> {analysis.language}{analysis.framework ? ` / ${analysis.framework}` : ""}</span>
          <span>{analysis.totalFiles} source files</span>
          {analysis.hasTests && <span className="flex items-center gap-1 text-green-400"><TestTube className="w-3 h-3" /> Tests</span>}
          {analysis.hasDocker && <span className="flex items-center gap-1 text-blue-400"><Container className="w-3 h-3" /> Docker</span>}
          {analysis.hasCI && <span className="flex items-center gap-1 text-purple-400"><GitBranch className="w-3 h-3" /> CI/CD</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!readme && !generating ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <FileText className="w-10 h-10 opacity-20" />
            <div className="text-center">
              <p className="text-xs font-medium">Generate a README for your project</p>
              <p className="text-[10px] mt-1">Analyzes your code, dependencies, and project structure</p>
              <p className="text-[10px]">to create a comprehensive README.md</p>
            </div>
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">Analyzing project structure...</p>
          </div>
        ) : (
          <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/90">
            {readme}
          </pre>
        )}
      </div>
    </div>
  );
}
