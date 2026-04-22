import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Code, FileText, FunctionSquare, GitBranch, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle, BarChart3, Clock,
  ChevronDown, ChevronRight, Minus, Activity, Shield
} from "lucide-react";

interface FileMetrics {
  path: string;
  loc: number;
  sloc: number;
  functions: number;
  classes: number;
  complexity: number;
  maintainability: number;
  duplicateLines: number;
}

interface MetricSnapshot {
  date: string;
  totalLoc: number;
  totalSloc: number;
  fileCount: number;
  functionCount: number;
  avgComplexity: number;
  testCoverage: number;
  debtScore: number;
  duplicatePercent: number;
}

const SAMPLE_FILES: FileMetrics[] = [
  { path: "src/pages/project.tsx", loc: 2180, sloc: 1950, functions: 45, classes: 0, complexity: 32, maintainability: 52, duplicateLines: 85 },
  { path: "src/App.tsx", loc: 230, sloc: 195, functions: 3, classes: 0, complexity: 8, maintainability: 78, duplicateLines: 0 },
  { path: "src/components/ide/TerminalPanel.tsx", loc: 420, sloc: 380, functions: 12, classes: 0, complexity: 18, maintainability: 65, duplicateLines: 22 },
  { path: "src/components/ide/ResourceMonitor.tsx", loc: 350, sloc: 310, functions: 8, classes: 0, complexity: 14, maintainability: 71, duplicateLines: 0 },
  { path: "src/components/ide/MultiRootWorkspace.tsx", loc: 290, sloc: 260, functions: 10, classes: 0, complexity: 12, maintainability: 74, duplicateLines: 15 },
  { path: "src/components/ErrorPageEditor.tsx", loc: 380, sloc: 340, functions: 9, classes: 0, complexity: 16, maintainability: 68, duplicateLines: 30 },
  { path: "src/lib/monaco-extensions.ts", loc: 520, sloc: 470, functions: 22, classes: 1, complexity: 24, maintainability: 58, duplicateLines: 45 },
  { path: "src/hooks/useFileWatcher.ts", loc: 140, sloc: 120, functions: 5, classes: 0, complexity: 6, maintainability: 82, duplicateLines: 0 },
  { path: "src/components/ide/Breadcrumbs.tsx", loc: 95, sloc: 80, functions: 3, classes: 0, complexity: 4, maintainability: 88, duplicateLines: 0 },
  { path: "src/components/ide/SplitEditor.tsx", loc: 310, sloc: 275, functions: 11, classes: 0, complexity: 15, maintainability: 66, duplicateLines: 18 },
  { path: "src/pages/RevenueAnalytics.tsx", loc: 450, sloc: 400, functions: 7, classes: 0, complexity: 10, maintainability: 73, duplicateLines: 12 },
  { path: "src/pages/ImageRegistry.tsx", loc: 340, sloc: 300, functions: 6, classes: 0, complexity: 9, maintainability: 76, duplicateLines: 8 },
  { path: "src/components/ide/ContextMenu.tsx", loc: 260, sloc: 230, functions: 4, classes: 0, complexity: 7, maintainability: 80, duplicateLines: 0 },
  { path: "src/components/ThemeCreator.tsx", loc: 390, sloc: 350, functions: 8, classes: 0, complexity: 13, maintainability: 69, duplicateLines: 20 },
  { path: "src/components/LogShipping.tsx", loc: 280, sloc: 250, functions: 6, classes: 0, complexity: 11, maintainability: 72, duplicateLines: 0 },
];

const TREND_DATA: MetricSnapshot[] = [
  { date: "2026-01-01", totalLoc: 18500, totalSloc: 15200, fileCount: 85, functionCount: 320, avgComplexity: 8.2, testCoverage: 72.1, debtScore: 34, duplicatePercent: 4.2 },
  { date: "2026-01-15", totalLoc: 20100, totalSloc: 16500, fileCount: 92, functionCount: 348, avgComplexity: 8.5, testCoverage: 71.5, debtScore: 36, duplicatePercent: 4.5 },
  { date: "2026-02-01", totalLoc: 22400, totalSloc: 18300, fileCount: 98, functionCount: 380, avgComplexity: 9.1, testCoverage: 70.8, debtScore: 38, duplicatePercent: 4.8 },
  { date: "2026-02-15", totalLoc: 24800, totalSloc: 20200, fileCount: 105, functionCount: 412, avgComplexity: 9.4, testCoverage: 73.2, debtScore: 40, duplicatePercent: 5.1 },
  { date: "2026-03-01", totalLoc: 27200, totalSloc: 22100, fileCount: 112, functionCount: 445, avgComplexity: 10.2, testCoverage: 74.5, debtScore: 42, duplicatePercent: 5.0 },
  { date: "2026-03-15", totalLoc: 29800, totalSloc: 24300, fileCount: 120, functionCount: 480, avgComplexity: 10.8, testCoverage: 75.8, debtScore: 44, duplicatePercent: 4.9 },
  { date: "2026-04-01", totalLoc: 32500, totalSloc: 26500, fileCount: 128, functionCount: 520, avgComplexity: 11.3, testCoverage: 76.2, debtScore: 46, duplicatePercent: 4.7 },
  { date: "2026-04-16", totalLoc: 35200, totalSloc: 28800, fileCount: 135, functionCount: 558, avgComplexity: 11.8, testCoverage: 78.4, debtScore: 48, duplicatePercent: 4.5 },
];

function complexityColor(c: number): string {
  if (c <= 10) return "text-green-400";
  if (c <= 20) return "text-yellow-400";
  if (c <= 30) return "text-orange-400";
  return "text-red-400";
}

function maintainabilityColor(m: number): string {
  if (m >= 80) return "text-green-400";
  if (m >= 65) return "text-yellow-400";
  if (m >= 50) return "text-orange-400";
  return "text-red-400";
}

function debtGrade(score: number): { grade: string; color: string } {
  if (score <= 20) return { grade: "A", color: "text-green-400" };
  if (score <= 35) return { grade: "B", color: "text-blue-400" };
  if (score <= 50) return { grade: "C", color: "text-yellow-400" };
  if (score <= 70) return { grade: "D", color: "text-orange-400" };
  return { grade: "F", color: "text-red-400" };
}

export default function CodeMetrics(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "trends" | "debt">("overview");
  const [sortBy, setSortBy] = useState<"complexity" | "loc" | "maintainability" | "functions">("complexity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [complexityFilter, setComplexityFilter] = useState<"all" | "low" | "medium" | "high">("all");

  const current = TREND_DATA[TREND_DATA.length - 1];
  const previous = TREND_DATA[TREND_DATA.length - 2];

  const delta = (curr: number, prev: number) => {
    const d = curr - prev;
    const pct = prev > 0 ? ((d / prev) * 100).toFixed(1) : "0";
    return { value: d, percent: pct, positive: d > 0 };
  };

  const sortedFiles = useMemo(() => {
    let files = [...SAMPLE_FILES];
    if (complexityFilter !== "all") {
      files = files.filter(f => {
        if (complexityFilter === "low") return f.complexity <= 10;
        if (complexityFilter === "medium") return f.complexity > 10 && f.complexity <= 20;
        return f.complexity > 20;
      });
    }
    return files.sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      return mul * (a[sortBy] - b[sortBy]);
    });
  }, [sortBy, sortDir, complexityFilter]);

  const totalLoc = SAMPLE_FILES.reduce((s, f) => s + f.loc, 0);
  const totalSloc = SAMPLE_FILES.reduce((s, f) => s + f.sloc, 0);
  const totalFunctions = SAMPLE_FILES.reduce((s, f) => s + f.functions, 0);
  const avgComplexity = (SAMPLE_FILES.reduce((s, f) => s + f.complexity, 0) / SAMPLE_FILES.length).toFixed(1);
  const avgMaintainability = (SAMPLE_FILES.reduce((s, f) => s + f.maintainability, 0) / SAMPLE_FILES.length).toFixed(1);
  const totalDuplicates = SAMPLE_FILES.reduce((s, f) => s + f.duplicateLines, 0);
  const dupPercent = ((totalDuplicates / totalLoc) * 100).toFixed(1);
  const debt = debtGrade(current.debtScore);

  const TrendIcon = ({ curr, prev, inverse }: { curr: number; prev: number; inverse?: boolean }) => {
    const d = curr - prev;
    if (Math.abs(d) < 0.01) return <Minus size={12} className="text-gray-500" />;
    const up = d > 0;
    const good = inverse ? !up : up;
    return up
      ? <TrendingUp size={12} className={good ? "text-green-400" : "text-red-400"} />
      : <TrendingDown size={12} className={good ? "text-green-400" : "text-red-400"} />;
  };

  const maxTrendLoc = Math.max(...TREND_DATA.map(t => t.totalLoc));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-200">
      <div className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2"><BarChart3 size={22} className="text-cyan-400" /> Code Metrics</h1>
                <p className="text-xs text-gray-500 mt-0.5">Cyclomatic complexity, coverage, and technical debt analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
              {(["overview", "files", "trends", "debt"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? "bg-cyan-600/30 text-cyan-300" : "text-gray-400 hover:text-gray-200"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Lines of Code", value: totalLoc.toLocaleString(), sub: `${totalSloc.toLocaleString()} SLOC`, icon: Code, color: "text-cyan-400", trend: <TrendIcon curr={current.totalLoc} prev={previous.totalLoc} /> },
                { label: "Files", value: SAMPLE_FILES.length, sub: `${SAMPLE_FILES.filter(f => f.loc > 300).length} large files`, icon: FileText, color: "text-blue-400", trend: <TrendIcon curr={current.fileCount} prev={previous.fileCount} /> },
                { label: "Functions", value: totalFunctions, sub: `avg ${(totalFunctions / SAMPLE_FILES.length).toFixed(1)}/file`, icon: FunctionSquare, color: "text-purple-400", trend: <TrendIcon curr={current.functionCount} prev={previous.functionCount} /> },
                { label: "Avg Complexity", value: avgComplexity, sub: `${SAMPLE_FILES.filter(f => f.complexity > 20).length} high-complexity files`, icon: Activity, color: "text-amber-400", trend: <TrendIcon curr={current.avgComplexity} prev={previous.avgComplexity} inverse /> },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <stat.icon size={14} className={stat.color} />
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    {stat.trend}
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-green-400" />
                  <span className="text-sm font-medium text-gray-300">Test Coverage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#333" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" strokeWidth="3"
                        strokeDasharray={`${current.testCoverage}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{current.testCoverage}%</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2"><TrendIcon curr={current.testCoverage} prev={previous.testCoverage} /> <span className="text-gray-400">{delta(current.testCoverage, previous.testCoverage).percent}% from last</span></div>
                    <div className="text-gray-500">Target: 80%</div>
                    <div className="text-gray-500">{(80 - current.testCoverage).toFixed(1)}% to go</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-sm font-medium text-gray-300">Technical Debt</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${debt.color}`}>{debt.grade}</div>
                  <div className="space-y-1 text-xs">
                    <div className="text-gray-400">Score: {current.debtScore}/100</div>
                    <div className="flex items-center gap-2"><TrendIcon curr={current.debtScore} prev={previous.debtScore} inverse /> <span className="text-gray-400">{delta(current.debtScore, previous.debtScore).percent}% change</span></div>
                    <div className="text-gray-500">Duplication: {dupPercent}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={14} className="text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Maintainability</span>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-white">{avgMaintainability}<span className="text-sm text-gray-500 ml-1">/100</span></div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={{ width: `${avgMaintainability}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>Low</span><span>Medium</span><span>High</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-300 mb-3">Complexity Distribution</div>
              <div className="flex items-end gap-1 h-32">
                {SAMPLE_FILES.sort((a, b) => b.complexity - a.complexity).map(f => {
                  const h = (f.complexity / 35) * 100;
                  return (
                    <div key={f.path} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className={`w-full rounded-t transition-all ${f.complexity > 20 ? "bg-red-500/60" : f.complexity > 10 ? "bg-yellow-500/60" : "bg-green-500/60"} group-hover:opacity-80`}
                        style={{ height: `${h}%` }} />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                        {f.path.split("/").pop()} ({f.complexity})
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500/60" /> Low (≤10)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500/60" /> Medium (11-20)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/60" /> High (&gt;20)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {(["all", "low", "medium", "high"] as const).map(f => (
                  <button key={f} onClick={() => setComplexityFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs ${complexityFilter === f ? "bg-cyan-600/30 text-cyan-300" : "text-gray-400 hover:text-gray-200"}`}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} Complexity
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none">
                <option value="complexity">Sort by Complexity</option>
                <option value="loc">Sort by Lines</option>
                <option value="maintainability">Sort by Maintainability</option>
                <option value="functions">Sort by Functions</option>
              </select>
              <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white">
                {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
              </button>
              <span className="text-xs text-gray-500 ml-auto">{sortedFiles.length} files</span>
            </div>

            <div className="space-y-2">
              {sortedFiles.map(file => (
                <div key={file.path} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedFile === file.path ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                        <Code size={14} className="text-cyan-400" />
                        <span className="text-sm font-mono text-gray-300">{file.path}</span>
                      </div>
                      <div className="flex items-center gap-6 text-xs">
                        <span className="text-gray-500">{file.loc.toLocaleString()} LOC</span>
                        <span className="text-gray-500">{file.functions} fn</span>
                        <span className={complexityColor(file.complexity)}>complexity: {file.complexity}</span>
                        <span className={maintainabilityColor(file.maintainability)}>MI: {file.maintainability}</span>
                      </div>
                    </div>
                  </div>
                  {expandedFile === file.path && (
                    <div className="border-t border-white/5 p-4 bg-white/[0.01]">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">Lines of Code</div>
                          <div className="text-lg font-bold text-white">{file.loc.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-600">{file.sloc.toLocaleString()} source lines</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">Functions / Classes</div>
                          <div className="text-lg font-bold text-white">{file.functions} <span className="text-sm text-gray-500">/ {file.classes}</span></div>
                          <div className="text-[10px] text-gray-600">{(file.sloc / Math.max(file.functions, 1)).toFixed(0)} avg lines/fn</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">Cyclomatic Complexity</div>
                          <div className={`text-lg font-bold ${complexityColor(file.complexity)}`}>{file.complexity}</div>
                          <div className="text-[10px] text-gray-600">{file.complexity <= 10 ? "Low risk" : file.complexity <= 20 ? "Moderate risk" : "High risk"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">Maintainability Index</div>
                          <div className={`text-lg font-bold ${maintainabilityColor(file.maintainability)}`}>{file.maintainability}</div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full mt-1">
                            <div className={`h-full rounded-full ${file.maintainability >= 80 ? "bg-green-500" : file.maintainability >= 65 ? "bg-yellow-500" : file.maintainability >= 50 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${file.maintainability}%` }} />
                          </div>
                        </div>
                      </div>
                      {file.duplicateLines > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                          <AlertTriangle size={12} /> {file.duplicateLines} duplicate lines detected ({((file.duplicateLines / file.loc) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-300 mb-3">Lines of Code Over Time</div>
                <div className="flex items-end gap-2 h-40">
                  {TREND_DATA.map(t => {
                    const h = (t.totalLoc / maxTrendLoc) * 100;
                    return (
                      <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full bg-cyan-500/40 rounded-t hover:bg-cyan-500/60 transition-colors" style={{ height: `${h}%` }} />
                        <span className="text-[8px] text-gray-600">{t.date.slice(5)}</span>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          {t.totalLoc.toLocaleString()} LOC
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-300 mb-3">Test Coverage Trend</div>
                <div className="flex items-end gap-2 h-40">
                  {TREND_DATA.map(t => (
                    <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className={`w-full rounded-t transition-colors ${t.testCoverage >= 75 ? "bg-green-500/40 hover:bg-green-500/60" : t.testCoverage >= 70 ? "bg-yellow-500/40 hover:bg-yellow-500/60" : "bg-red-500/40 hover:bg-red-500/60"}`}
                        style={{ height: `${t.testCoverage}%` }} />
                      <span className="text-[8px] text-gray-600">{t.date.slice(5)}</span>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                        {t.testCoverage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-300 mb-3">Avg Complexity Trend</div>
                <div className="flex items-end gap-2 h-40">
                  {TREND_DATA.map(t => {
                    const h = (t.avgComplexity / 15) * 100;
                    return (
                      <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className={`w-full rounded-t transition-colors ${t.avgComplexity <= 10 ? "bg-green-500/40 hover:bg-green-500/60" : "bg-amber-500/40 hover:bg-amber-500/60"}`}
                          style={{ height: `${Math.min(h, 100)}%` }} />
                        <span className="text-[8px] text-gray-600">{t.date.slice(5)}</span>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          {t.avgComplexity}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-300 mb-3">Technical Debt Score</div>
                <div className="flex items-end gap-2 h-40">
                  {TREND_DATA.map(t => {
                    const h = t.debtScore;
                    const dg = debtGrade(t.debtScore);
                    return (
                      <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className={`w-full rounded-t transition-colors ${dg.grade === "A" ? "bg-green-500/40" : dg.grade === "B" ? "bg-blue-500/40" : dg.grade === "C" ? "bg-yellow-500/40" : "bg-orange-500/40"} hover:opacity-80`}
                          style={{ height: `${h}%` }} />
                        <span className="text-[8px] text-gray-600">{t.date.slice(5)}</span>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          Grade {dg.grade} ({t.debtScore})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-300 mb-3">Snapshot History</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-right py-2 px-3">LOC</th>
                      <th className="text-right py-2 px-3">SLOC</th>
                      <th className="text-right py-2 px-3">Files</th>
                      <th className="text-right py-2 px-3">Functions</th>
                      <th className="text-right py-2 px-3">Avg Complexity</th>
                      <th className="text-right py-2 px-3">Coverage</th>
                      <th className="text-right py-2 px-3">Debt</th>
                      <th className="text-right py-2 px-3">Duplication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TREND_DATA.slice().reverse().map(t => {
                      const dg = debtGrade(t.debtScore);
                      return (
                        <tr key={t.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-gray-300">{t.date}</td>
                          <td className="py-2 px-3 text-right text-gray-400">{t.totalLoc.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-gray-400">{t.totalSloc.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-gray-400">{t.fileCount}</td>
                          <td className="py-2 px-3 text-right text-gray-400">{t.functionCount}</td>
                          <td className={`py-2 px-3 text-right ${complexityColor(t.avgComplexity)}`}>{t.avgComplexity}</td>
                          <td className="py-2 px-3 text-right text-green-400">{t.testCoverage}%</td>
                          <td className={`py-2 px-3 text-right ${dg.color}`}>{dg.grade} ({t.debtScore})</td>
                          <td className="py-2 px-3 text-right text-gray-400">{t.duplicatePercent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "debt" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <div className="text-xs text-gray-500 mb-2">Overall Debt Grade</div>
                <div className={`text-6xl font-bold ${debt.color}`}>{debt.grade}</div>
                <div className="text-sm text-gray-400 mt-2">Score: {current.debtScore}/100</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-3">Debt Breakdown</div>
                <div className="space-y-3">
                  {[
                    { label: "Code Duplication", value: 35, max: 100 },
                    { label: "High Complexity Files", value: 45, max: 100 },
                    { label: "Missing Tests", value: 22, max: 100 },
                    { label: "Large Files", value: 55, max: 100 },
                    { label: "Outdated Dependencies", value: 18, max: 100 },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="text-gray-500">{item.value}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full">
                        <div className={`h-full rounded-full ${item.value > 50 ? "bg-red-500" : item.value > 30 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-3">Recommended Actions</div>
                <div className="space-y-2">
                  {[
                    { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", text: "Refactor project.tsx — complexity 32", priority: "High" },
                    { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", text: "Split monaco-extensions.ts — 520 LOC", priority: "Medium" },
                    { icon: GitBranch, color: "text-yellow-400", bg: "bg-yellow-500/10", text: "Add tests for 6 untested components", priority: "Medium" },
                    { icon: Code, color: "text-blue-400", bg: "bg-blue-500/10", text: "Remove 255 duplicate lines", priority: "Low" },
                    { icon: Clock, color: "text-gray-400", bg: "bg-gray-500/10", text: "Update 3 outdated dependencies", priority: "Low" },
                  ].map((action, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${action.bg}`}>
                      <action.icon size={12} className={action.color} />
                      <span className="text-xs text-gray-300 flex-1">{action.text}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${action.priority === "High" ? "bg-red-600/20 text-red-400" : action.priority === "Medium" ? "bg-yellow-600/20 text-yellow-400" : "bg-gray-600/20 text-gray-400"}`}>{action.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-300 mb-3">Files with Highest Debt</div>
              <div className="space-y-2">
                {SAMPLE_FILES.sort((a, b) => a.maintainability - b.maintainability).slice(0, 8).map(file => {
                  const debtPct = 100 - file.maintainability;
                  return (
                    <div key={file.path} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <Code size={14} className="text-gray-500 shrink-0" />
                      <span className="text-xs font-mono text-gray-300 flex-1 min-w-0 truncate">{file.path}</span>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className={complexityColor(file.complexity)}>C:{file.complexity}</span>
                        <span className={maintainabilityColor(file.maintainability)}>MI:{file.maintainability}</span>
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full">
                          <div className={`h-full rounded-full ${debtPct > 50 ? "bg-red-500" : debtPct > 30 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${debtPct}%` }} />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{debtPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
