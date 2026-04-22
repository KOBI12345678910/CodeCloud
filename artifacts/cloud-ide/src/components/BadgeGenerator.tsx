import { useState } from "react";
import { X, Copy, Check, Award } from "lucide-react";

interface Props { projectId: string; projectName: string; onClose: () => void; }

interface Badge { label: string; message: string; color: string; style: string; preview: string; markdown: string; }

export function BadgeGenerator({ projectId, projectName, onClose }: Props) {
  const [copied, setCopied] = useState("");

  const badges: Badge[] = [
    { label: "build", message: "passing", color: "brightgreen", style: "flat", preview: `https://img.shields.io/badge/build-passing-brightgreen`, markdown: `![Build](https://img.shields.io/badge/build-passing-brightgreen)` },
    { label: "coverage", message: "87%", color: "green", style: "flat", preview: `https://img.shields.io/badge/coverage-87%25-green`, markdown: `![Coverage](https://img.shields.io/badge/coverage-87%25-green)` },
    { label: "version", message: "1.0.0", color: "blue", style: "flat", preview: `https://img.shields.io/badge/version-1.0.0-blue`, markdown: `![Version](https://img.shields.io/badge/version-1.0.0-blue)` },
    { label: "license", message: "MIT", color: "yellow", style: "flat", preview: `https://img.shields.io/badge/license-MIT-yellow`, markdown: `![License](https://img.shields.io/badge/license-MIT-yellow)` },
    { label: "dependencies", message: "up%20to%20date", color: "brightgreen", style: "flat", preview: `https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen`, markdown: `![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen)` },
    { label: "platform", message: "CodeCloud", color: "purple", style: "flat", preview: `https://img.shields.io/badge/platform-CodeCloud-purple`, markdown: `![Platform](https://img.shields.io/badge/platform-CodeCloud-purple)` },
    { label: "downloads", message: "1.2k", color: "blue", style: "flat", preview: `https://img.shields.io/badge/downloads-1.2k-blue`, markdown: `![Downloads](https://img.shields.io/badge/downloads-1.2k-blue)` },
    { label: "stars", message: "42", color: "yellow", style: "flat", preview: `https://img.shields.io/badge/stars-42-yellow`, markdown: `![Stars](https://img.shields.io/badge/stars-42-yellow)` },
  ];

  const copy = (md: string, label: string) => { navigator.clipboard.writeText(md); setCopied(label); setTimeout(() => setCopied(""), 2000); };
  const copyAll = () => { const all = badges.map(b => b.markdown).join("\n"); navigator.clipboard.writeText(all); setCopied("all"); setTimeout(() => setCopied(""), 2000); };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="badge-generator">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Badge Generator</span></div>
        <div className="flex items-center gap-1">
          <button onClick={copyAll} className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border rounded hover:bg-muted">{copied === "all" ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />} Copy All</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border/20">
        {badges.map(b => (
          <div key={b.label} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30">
            <img src={b.preview} alt={b.label} className="h-5" />
            <code className="flex-1 text-[10px] font-mono text-muted-foreground truncate bg-muted/30 px-1.5 py-0.5 rounded">{b.markdown}</code>
            <button onClick={() => copy(b.markdown, b.label)} className="p-1 hover:bg-muted rounded">
              {copied === b.label ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
