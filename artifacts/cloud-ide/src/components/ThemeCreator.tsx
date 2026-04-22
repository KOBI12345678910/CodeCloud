import React, { useState } from "react";
import { X, Paintbrush, Save, Share2, Download, Upload, RotateCcw, Copy, Check, Eye } from "lucide-react";

interface Props { onClose: () => void; }

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  editorBackground: string;
  editorForeground: string;
  editorLineHighlight: string;
  editorSelection: string;
  syntaxKeyword: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxComment: string;
  syntaxFunction: string;
  syntaxVariable: string;
  syntaxType: string;
  syntaxOperator: string;
  terminalBackground: string;
  terminalForeground: string;
  terminalCursor: string;
  sidebarBackground: string;
  sidebarForeground: string;
  tabActiveBackground: string;
  tabInactiveBackground: string;
}

const PRESETS: Record<string, ThemeColors> = {
  "Dark Modern": {
    background: "#1e1e2e", foreground: "#cdd6f4", card: "#313244", cardForeground: "#cdd6f4",
    primary: "#89b4fa", primaryForeground: "#1e1e2e", secondary: "#45475a", secondaryForeground: "#cdd6f4",
    muted: "#313244", mutedForeground: "#6c7086", accent: "#f5c2e7", border: "#45475a",
    editorBackground: "#1e1e2e", editorForeground: "#cdd6f4", editorLineHighlight: "#313244",
    editorSelection: "#45475a80", syntaxKeyword: "#cba6f7", syntaxString: "#a6e3a1", syntaxNumber: "#fab387",
    syntaxComment: "#6c7086", syntaxFunction: "#89b4fa", syntaxVariable: "#f5c2e7", syntaxType: "#f9e2af",
    syntaxOperator: "#89dceb", terminalBackground: "#11111b", terminalForeground: "#cdd6f4",
    terminalCursor: "#f5e0dc", sidebarBackground: "#181825", sidebarForeground: "#cdd6f4",
    tabActiveBackground: "#1e1e2e", tabInactiveBackground: "#181825",
  },
  "Light Breeze": {
    background: "#ffffff", foreground: "#1e293b", card: "#f8fafc", cardForeground: "#1e293b",
    primary: "#3b82f6", primaryForeground: "#ffffff", secondary: "#e2e8f0", secondaryForeground: "#475569",
    muted: "#f1f5f9", mutedForeground: "#94a3b8", accent: "#8b5cf6", border: "#e2e8f0",
    editorBackground: "#ffffff", editorForeground: "#1e293b", editorLineHighlight: "#f8fafc",
    editorSelection: "#bfdbfe80", syntaxKeyword: "#7c3aed", syntaxString: "#059669", syntaxNumber: "#d97706",
    syntaxComment: "#94a3b8", syntaxFunction: "#2563eb", syntaxVariable: "#db2777", syntaxType: "#0891b2",
    syntaxOperator: "#6366f1", terminalBackground: "#0f172a", terminalForeground: "#e2e8f0",
    terminalCursor: "#f59e0b", sidebarBackground: "#f8fafc", sidebarForeground: "#334155",
    tabActiveBackground: "#ffffff", tabInactiveBackground: "#f1f5f9",
  },
  "Midnight Ocean": {
    background: "#0d1117", foreground: "#c9d1d9", card: "#161b22", cardForeground: "#c9d1d9",
    primary: "#58a6ff", primaryForeground: "#0d1117", secondary: "#21262d", secondaryForeground: "#c9d1d9",
    muted: "#161b22", mutedForeground: "#8b949e", accent: "#f78166", border: "#30363d",
    editorBackground: "#0d1117", editorForeground: "#c9d1d9", editorLineHighlight: "#161b22",
    editorSelection: "#264f7880", syntaxKeyword: "#ff7b72", syntaxString: "#a5d6ff", syntaxNumber: "#79c0ff",
    syntaxComment: "#8b949e", syntaxFunction: "#d2a8ff", syntaxVariable: "#ffa657", syntaxType: "#7ee787",
    syntaxOperator: "#79c0ff", terminalBackground: "#010409", terminalForeground: "#c9d1d9",
    terminalCursor: "#58a6ff", sidebarBackground: "#010409", sidebarForeground: "#c9d1d9",
    tabActiveBackground: "#0d1117", tabInactiveBackground: "#010409",
  },
  "Sunset Warm": {
    background: "#1a1423", foreground: "#e8d5c4", card: "#231b2e", cardForeground: "#e8d5c4",
    primary: "#ff6b6b", primaryForeground: "#1a1423", secondary: "#2d2339", secondaryForeground: "#e8d5c4",
    muted: "#231b2e", mutedForeground: "#8a7a6d", accent: "#ffd93d", border: "#3a2d47",
    editorBackground: "#1a1423", editorForeground: "#e8d5c4", editorLineHighlight: "#231b2e",
    editorSelection: "#ff6b6b30", syntaxKeyword: "#ff6b6b", syntaxString: "#6bcb77", syntaxNumber: "#ffd93d",
    syntaxComment: "#6a5a7d", syntaxFunction: "#4ecdc4", syntaxVariable: "#ff8a5c", syntaxType: "#a78bfa",
    syntaxOperator: "#f472b6", terminalBackground: "#120e19", terminalForeground: "#e8d5c4",
    terminalCursor: "#ff6b6b", sidebarBackground: "#120e19", sidebarForeground: "#e8d5c4",
    tabActiveBackground: "#1a1423", tabInactiveBackground: "#120e19",
  },
};

const COLOR_GROUPS = [
  { label: "UI Base", keys: ["background", "foreground", "card", "cardForeground", "primary", "primaryForeground", "secondary", "secondaryForeground", "muted", "mutedForeground", "accent", "border"] },
  { label: "Editor", keys: ["editorBackground", "editorForeground", "editorLineHighlight", "editorSelection"] },
  { label: "Syntax", keys: ["syntaxKeyword", "syntaxString", "syntaxNumber", "syntaxComment", "syntaxFunction", "syntaxVariable", "syntaxType", "syntaxOperator"] },
  { label: "Terminal", keys: ["terminalBackground", "terminalForeground", "terminalCursor"] },
  { label: "Panels", keys: ["sidebarBackground", "sidebarForeground", "tabActiveBackground", "tabInactiveBackground"] },
];

const SAMPLE_CODE = `function fibonacci(n: number): number {
  // Base cases
  if (n <= 0) return 0;
  if (n === 1) return 1;

  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

const result = fibonacci(10);
console.log("Result:", result);`;

function labelFromKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

const SAVED: { name: string; colors: ThemeColors }[] = [];

export function ThemeCreator({ onClose }: Props) {
  const [colors, setColors] = useState<ThemeColors>({ ...PRESETS["Dark Modern"] });
  const [activeGroup, setActiveGroup] = useState(0);
  const [themeName, setThemeName] = useState("My Theme");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(SAVED);

  const setColor = (key: string, val: string) => setColors(c => ({ ...c, [key]: val }));
  const loadPreset = (name: string) => setColors({ ...PRESETS[name] });
  const reset = () => setColors({ ...PRESETS["Dark Modern"] });

  const save = () => {
    const entry = { name: themeName, colors: { ...colors } };
    const idx = saved.findIndex(s => s.name === themeName);
    if (idx >= 0) { const n = [...saved]; n[idx] = entry; setSaved(n); }
    else setSaved([...saved, entry]);
  };

  const exportTheme = () => {
    const json = JSON.stringify({ name: themeName, colors }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${themeName.replace(/\s+/g, "-").toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyTheme = () => {
    navigator.clipboard.writeText(JSON.stringify({ name: themeName, colors }, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const importTheme = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.colors) { setColors(data.colors); if (data.name) setThemeName(data.name); }
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const group = COLOR_GROUPS[activeGroup];

  return (
    <div className="h-full flex flex-col bg-background" data-testid="theme-creator">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Theme Creator</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={importTheme} className="p-0.5 hover:bg-muted rounded" title="Import"><Upload className="w-3.5 h-3.5" /></button>
          <button onClick={exportTheme} className="p-0.5 hover:bg-muted rounded" title="Export"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={copyTheme} className="p-0.5 hover:bg-muted rounded" title="Copy JSON">{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
          <button onClick={reset} className="p-0.5 hover:bg-muted rounded" title="Reset"><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 border-r border-border/30 overflow-y-auto p-3 space-y-3 shrink-0">
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <input value={themeName} onChange={e => setThemeName(e.target.value)} className="flex-1 px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" />
              <button onClick={save} className="p-1 hover:bg-muted rounded" title="Save"><Save className="w-3.5 h-3.5 text-primary" /></button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {Object.keys(PRESETS).map(name => (
                <button key={name} onClick={() => loadPreset(name)} className="px-2 py-0.5 text-[8px] rounded bg-muted/30 hover:bg-muted/50 border border-border/20">{name}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {COLOR_GROUPS.map((g, i) => (
              <button key={g.label} onClick={() => setActiveGroup(i)} className={`px-2 py-0.5 text-[9px] rounded ${activeGroup === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{g.label}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            {group.keys.map(key => (
              <div key={key} className="flex items-center gap-2">
                <input type="color" value={(colors as any)[key].replace(/[0-9a-f]{2}$/i, "") || (colors as any)[key]} onChange={e => setColor(key, e.target.value)} className="w-5 h-5 rounded border border-border/30 cursor-pointer p-0" />
                <span className="text-[8px] text-muted-foreground flex-1">{labelFromKey(key)}</span>
                <input value={(colors as any)[key]} onChange={e => setColor(key, e.target.value)} className="w-20 px-1 py-0.5 text-[8px] font-mono bg-muted/20 border border-border/20 rounded" />
              </div>
            ))}
          </div>
          {saved.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] font-medium text-muted-foreground">Saved Themes</div>
              {saved.map(s => (
                <button key={s.name} onClick={() => { setColors({ ...s.colors }); setThemeName(s.name); }} className="w-full text-left px-2 py-1 text-[9px] rounded bg-muted/20 hover:bg-muted/40 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.colors.primary }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.colors.accent }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.colors.syntaxKeyword }} />
                  </div>
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3 h-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Preview</span>
          </div>
          <div className="rounded-lg border border-border/30 overflow-hidden text-[10px]" style={{ background: colors.background, color: colors.foreground }}>
            <div className="flex" style={{ background: colors.sidebarBackground }}>
              <div className="w-36 border-r shrink-0" style={{ borderColor: colors.border, color: colors.sidebarForeground }}>
                <div className="px-2 py-1 text-[8px] font-medium" style={{ color: colors.mutedForeground }}>EXPLORER</div>
                <div className="px-2 py-0.5" style={{ color: colors.syntaxFunction }}>src/</div>
                <div className="px-4 py-0.5" style={{ color: colors.foreground }}>index.ts</div>
                <div className="px-4 py-0.5" style={{ color: colors.mutedForeground }}>utils.ts</div>
                <div className="px-4 py-0.5" style={{ color: colors.mutedForeground }}>types.ts</div>
                <div className="px-2 py-0.5" style={{ color: colors.syntaxFunction }}>tests/</div>
                <div className="px-2 py-0.5" style={{ color: colors.mutedForeground }}>package.json</div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex" style={{ background: colors.tabInactiveBackground }}>
                  <div className="px-3 py-1 text-[9px] border-b-2" style={{ background: colors.tabActiveBackground, borderColor: colors.primary, color: colors.foreground }}>index.ts</div>
                  <div className="px-3 py-1 text-[9px]" style={{ color: colors.mutedForeground }}>utils.ts</div>
                </div>
                <div className="p-2 font-mono text-[9px] leading-relaxed" style={{ background: colors.editorBackground, color: colors.editorForeground }}>
                  {SAMPLE_CODE.split("\n").map((line, i) => (
                    <div key={i} className="flex" style={{ background: i === 3 ? colors.editorLineHighlight : undefined }}>
                      <span className="w-6 text-right mr-3 select-none" style={{ color: colors.mutedForeground }}>{i + 1}</span>
                      <span>{colorLine(line, colors)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t" style={{ background: colors.terminalBackground, borderColor: colors.border, color: colors.terminalForeground }}>
                  <div className="text-[8px] mb-1" style={{ color: colors.mutedForeground }}>TERMINAL</div>
                  <div className="font-mono text-[9px]">
                    <span style={{ color: colors.syntaxFunction }}>$ </span>
                    <span>npx ts-node index.ts</span>
                  </div>
                  <div className="font-mono text-[9px]" style={{ color: colors.syntaxString }}>Result: 55</div>
                  <div className="font-mono text-[9px] flex items-center">
                    <span style={{ color: colors.syntaxFunction }}>$ </span>
                    <span className="inline-block w-1.5 h-3 animate-pulse" style={{ background: colors.terminalCursor }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-0.5 text-[8px]" style={{ background: colors.primary, color: colors.primaryForeground }}>
              <div className="flex gap-3"><span>main</span><span>UTF-8</span><span>TypeScript</span></div>
              <div className="flex gap-3"><span>Ln 4, Col 12</span><span>Spaces: 2</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function colorLine(line: string, c: ThemeColors): React.ReactElement {
  const parts: React.ReactElement[] = [];
  const keywords = /\b(function|const|let|var|return|if|for|import|export|from|class|new|this|typeof|instanceof)\b/g;
  const strings = /(["'`])(?:(?!\1).)*\1/g;
  const numbers = /\b\d+\b/g;
  const comments = /(\/\/.*)/g;
  const types = /\b(number|string|boolean|void|any|null|undefined)\b/g;

  if (comments.test(line)) {
    const idx = line.indexOf("//");
    if (idx === 0) { parts.push(<span key="c" style={{ color: c.syntaxComment }}>{line}</span>); return <>{parts}</>; }
    parts.push(<span key="pre">{colorLine(line.slice(0, idx), c)}</span>);
    parts.push(<span key="comment" style={{ color: c.syntaxComment }}>{line.slice(idx)}</span>);
    return <>{parts}</>;
  }

  let result = line;
  const tokens: { start: number; end: number; color: string; text: string }[] = [];

  for (const m of result.matchAll(strings)) { tokens.push({ start: m.index!, end: m.index! + m[0].length, color: c.syntaxString, text: m[0] }); }
  for (const m of result.matchAll(keywords)) { if (!tokens.some(t => m.index! >= t.start && m.index! < t.end)) tokens.push({ start: m.index!, end: m.index! + m[0].length, color: c.syntaxKeyword, text: m[0] }); }
  for (const m of result.matchAll(types)) { if (!tokens.some(t => m.index! >= t.start && m.index! < t.end)) tokens.push({ start: m.index!, end: m.index! + m[0].length, color: c.syntaxType, text: m[0] }); }
  for (const m of result.matchAll(numbers)) { if (!tokens.some(t => m.index! >= t.start && m.index! < t.end)) tokens.push({ start: m.index!, end: m.index! + m[0].length, color: c.syntaxNumber, text: m[0] }); }

  tokens.sort((a, b) => a.start - b.start);

  let pos = 0;
  tokens.forEach((tok, i) => {
    if (tok.start > pos) parts.push(<span key={`p${i}`}>{result.slice(pos, tok.start)}</span>);
    parts.push(<span key={`t${i}`} style={{ color: tok.color }}>{tok.text}</span>);
    pos = tok.end;
  });
  if (pos < result.length) parts.push(<span key="end">{result.slice(pos)}</span>);

  return <>{parts}</>;
}
