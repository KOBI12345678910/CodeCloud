import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Scan, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Clock, Zap, Bug, Lock, Gauge, FileCode, GitPullRequest, Bot, ArrowRight, ChevronDown, ChevronRight, Info, TrendingUp } from "lucide-react";

interface ReviewIssue { id: string; severity: "critical" | "warning" | "info" | "suggestion"; category: string; title: string; description: string; file: string; line: number; suggestion: string; autoFixable: boolean; }

const ISSUES: ReviewIssue[] = [
  { id: "r1", severity: "critical", category: "Security", title: "SQL Injection Vulnerability", description: "User input is directly interpolated into SQL query without parameterization", file: "src/api/users.ts", line: 45, suggestion: "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [userId])", autoFixable: true },
  { id: "r2", severity: "critical", category: "Security", title: "Exposed API Key in Source Code", description: "Hard-coded API key found in source code", file: "src/services/payment.ts", line: 12, suggestion: "Move to environment variables: process.env.STRIPE_KEY", autoFixable: true },
  { id: "r3", severity: "warning", category: "Performance", title: "N+1 Query Pattern Detected", description: "Database queries inside a loop will cause performance issues at scale", file: "src/api/projects.ts", line: 78, suggestion: "Use a JOIN or batch query to fetch all related data in one query", autoFixable: false },
  { id: "r4", severity: "warning", category: "Performance", title: "Missing Memoization", description: "Expensive computation in render without useMemo", file: "src/components/Dashboard.tsx", line: 34, suggestion: "Wrap with useMemo(() => expensiveCalculation(data), [data])", autoFixable: true },
  { id: "r5", severity: "warning", category: "Security", title: "Missing Rate Limiting", description: "Authentication endpoint lacks rate limiting protection", file: "src/api/auth.ts", line: 15, suggestion: "Add rate limiter middleware: app.use('/auth', rateLimiter({ max: 5, window: 60 }))", autoFixable: true },
  { id: "r6", severity: "info", category: "Best Practice", title: "Unused Import", description: "The import 'useState' is declared but never used", file: "src/pages/settings.tsx", line: 1, suggestion: "Remove unused import", autoFixable: true },
  { id: "r7", severity: "info", category: "Accessibility", title: "Missing ARIA Label", description: "Interactive element lacks accessible label", file: "src/components/Sidebar.tsx", line: 67, suggestion: "Add aria-label='Toggle sidebar' to the button element", autoFixable: true },
  { id: "r8", severity: "suggestion", category: "Code Quality", title: "Complex Function", description: "Function has cyclomatic complexity of 15, consider breaking it down", file: "src/utils/parser.ts", line: 23, suggestion: "Extract sub-functions for each branch of logic", autoFixable: false },
  { id: "r9", severity: "suggestion", category: "TypeScript", title: "Use Discriminated Union", description: "Multiple type guards could be replaced with a discriminated union", file: "src/types/events.ts", line: 8, suggestion: "Add a 'kind' discriminator field to the union type", autoFixable: false },
  { id: "r10", severity: "info", category: "Testing", title: "Low Test Coverage", description: "File has only 23% test coverage, critical paths untested", file: "src/services/billing.ts", line: 0, suggestion: "Add tests for payment processing and refund flows", autoFixable: false },
];

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  suggestion: { icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

export default function AiCodeReviewPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["r1", "r2"]));
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info" | "suggestion">("all");
  const [fixed, setFixed] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const s = new Set(expanded);
    if (s.has(id)) s.delete(id); else s.add(id);
    setExpanded(s);
  };

  const filtered = ISSUES.filter(i => {
    if (fixed.has(i.id)) return false;
    if (filter !== "all" && i.severity !== filter) return false;
    return true;
  });

  const criticalCount = ISSUES.filter(i => i.severity === "critical" && !fixed.has(i.id)).length;
  const warningCount = ISSUES.filter(i => i.severity === "warning" && !fixed.has(i.id)).length;
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5 - (ISSUES.length - fixed.size) * 2);

  return (
    <FeaturePageLayout title="AI Code Review" description="Automated code analysis with AI-powered suggestions and auto-fix" icon={<Scan className="w-7 h-7 text-white" />} badge={`Score: ${score}/100`} badgeVariant={score >= 80 ? "success" : score >= 50 ? "warning" : "destructive"}>
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
          <div className={`text-3xl font-bold ${score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{score}</div>
          <p className="text-xs text-gray-400 mt-1">Health Score</p>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-red-400">{criticalCount}</p><p className="text-xs text-gray-400 mt-1">Critical</p></div>
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-yellow-400">{warningCount}</p><p className="text-xs text-gray-400 mt-1">Warnings</p></div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-blue-400">{ISSUES.filter(i => i.severity === "info" && !fixed.has(i.id)).length}</p><p className="text-xs text-gray-400 mt-1">Info</p></div>
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center"><p className="text-2xl font-bold text-green-400">{fixed.size}</p><p className="text-xs text-gray-400 mt-1">Fixed</p></div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["all", "critical", "warning", "info", "suggestion"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{f}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFixed(new Set(ISSUES.filter(i => i.autoFixable).map(i => i.id)))} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition-colors">
            <Zap className="w-3 h-3" /> Auto-fix All ({ISSUES.filter(i => i.autoFixable && !fixed.has(i.id)).length})
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">
            <Bot className="w-3 h-3" /> Re-scan
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(issue => {
          const config = SEVERITY_CONFIG[issue.severity];
          const Icon = config.icon;
          const isExpanded = expanded.has(issue.id);
          return (
            <div key={issue.id} className={`border rounded-xl overflow-hidden ${config.border} ${config.bg}`}>
              <div onClick={() => toggleExpand(issue.id)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{issue.title}</span>
                    <span className="px-1.5 py-0.5 bg-white/10 text-gray-400 text-[10px] rounded-full">{issue.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{issue.file}:{issue.line}</p>
                </div>
                {issue.autoFixable && (
                  <button onClick={e => { e.stopPropagation(); setFixed(new Set([...fixed, issue.id])); }} className="flex items-center gap-1 px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-400 text-xs rounded-lg transition-colors">
                    <Zap className="w-3 h-3" /> Fix
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t border-white/5 ml-10">
                  <p className="text-xs text-gray-400 mb-2">{issue.description}</p>
                  <div className="bg-black/30 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 mb-1">Suggested fix:</p>
                    <code className="text-xs text-green-400 font-mono">{issue.suggestion}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">All clear!</h3>
          <p className="text-sm text-gray-400">No issues found matching your filter. Your code is looking great!</p>
        </div>
      )}
    </FeaturePageLayout>
  );
}
