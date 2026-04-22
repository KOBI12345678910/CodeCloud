import React, { useState, useCallback } from "react";
import {
  Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight,
  RotateCcw, Filter, Eye, Square, Loader2, AlertTriangle, X
} from "lucide-react";

interface TestSuite {
  name: string;
  file: string;
  status: "idle" | "running" | "passed" | "failed";
  tests: TestCase[];
  duration: number;
}

interface TestCase {
  id: string;
  name: string;
  status: "idle" | "running" | "passed" | "failed" | "skipped";
  duration: number;
  error: string | null;
  line: number;
  coverage: number | null;
}

const SAMPLE_SUITES: TestSuite[] = [
  {
    name: "Auth Service", file: "src/services/auth.test.ts", status: "passed", duration: 1245,
    tests: [
      { id: "t1", name: "should authenticate valid credentials", status: "passed", duration: 45, error: null, line: 12, coverage: 92 },
      { id: "t2", name: "should reject invalid password", status: "passed", duration: 32, error: null, line: 28, coverage: 88 },
      { id: "t3", name: "should handle token refresh", status: "passed", duration: 78, error: null, line: 45, coverage: 85 },
      { id: "t4", name: "should rate limit login attempts", status: "passed", duration: 120, error: null, line: 68, coverage: 76 },
      { id: "t5", name: "should validate JWT signature", status: "passed", duration: 22, error: null, line: 92, coverage: 94 },
    ],
  },
  {
    name: "Project API", file: "src/routes/projects.test.ts", status: "failed", duration: 2340,
    tests: [
      { id: "t6", name: "GET /projects should return list", status: "passed", duration: 95, error: null, line: 8, coverage: 90 },
      { id: "t7", name: "POST /projects should create project", status: "passed", duration: 145, error: null, line: 25, coverage: 85 },
      { id: "t8", name: "PUT /projects/:id should update", status: "failed", duration: 210, error: "Expected status 200 but received 403\n  at Object.<anonymous> (projects.test.ts:48:5)\n  AssertionError: expected 403 to equal 200", line: 42, coverage: 72 },
      { id: "t9", name: "DELETE /projects/:id should remove", status: "passed", duration: 88, error: null, line: 62, coverage: 88 },
      { id: "t10", name: "GET /projects/:id/files should list files", status: "skipped", duration: 0, error: null, line: 80, coverage: null },
    ],
  },
  {
    name: "Container Service", file: "src/services/container.test.ts", status: "passed", duration: 890,
    tests: [
      { id: "t11", name: "should create container", status: "passed", duration: 180, error: null, line: 10, coverage: 82 },
      { id: "t12", name: "should handle OOM gracefully", status: "passed", duration: 95, error: null, line: 35, coverage: 78 },
      { id: "t13", name: "should cleanup on shutdown", status: "passed", duration: 65, error: null, line: 55, coverage: 90 },
    ],
  },
  {
    name: "Deployment Pipeline", file: "src/services/deploy.test.ts", status: "idle", duration: 0,
    tests: [
      { id: "t14", name: "should validate deployment config", status: "idle", duration: 0, error: null, line: 12, coverage: null },
      { id: "t15", name: "should run health checks", status: "idle", duration: 0, error: null, line: 30, coverage: null },
      { id: "t16", name: "should rollback on failure", status: "idle", duration: 0, error: null, line: 52, coverage: null },
      { id: "t17", name: "should notify on completion", status: "idle", duration: 0, error: null, line: 70, coverage: null },
    ],
  },
];

interface InlineTestRunnerProps {
  onClose?: () => void;
}

export default function InlineTestRunner({ onClose }: InlineTestRunnerProps): React.ReactElement {
  const [suites, setSuites] = useState<TestSuite[]>(SAMPLE_SUITES);
  const [expandedSuite, setExpandedSuite] = useState<string | null>("Project API");
  const [filterStatus, setFilterStatus] = useState<"all" | "passed" | "failed" | "skipped">("all");
  const [running, setRunning] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);

  const totalTests = suites.reduce((s, su) => s + su.tests.length, 0);
  const passed = suites.reduce((s, su) => s + su.tests.filter(t => t.status === "passed").length, 0);
  const failed = suites.reduce((s, su) => s + su.tests.filter(t => t.status === "failed").length, 0);
  const skipped = suites.reduce((s, su) => s + su.tests.filter(t => t.status === "skipped").length, 0);

  const runAllTests = useCallback(() => {
    setRunning(true);
    setSuites(prev => prev.map(su => ({
      ...su, status: "running",
      tests: su.tests.map(t => ({ ...t, status: t.status === "skipped" ? "skipped" as const : "running" as const })),
    })));
    setTimeout(() => {
      setSuites(SAMPLE_SUITES);
      setRunning(false);
    }, 2000);
  }, []);

  const runSuite = useCallback((suiteName: string) => {
    setSuites(prev => prev.map(su => su.name === suiteName ? {
      ...su, status: "running",
      tests: su.tests.map(t => ({ ...t, status: "running" as const })),
    } : su));
    setTimeout(() => {
      setSuites(prev => prev.map(su => su.name === suiteName ? SAMPLE_SUITES.find(s => s.name === suiteName) || su : su));
    }, 1500);
  }, []);

  const runSingleTest = useCallback((suiteIdx: number, testId: string) => {
    setSuites(prev => prev.map((su, i) => i === suiteIdx ? {
      ...su, tests: su.tests.map(t => t.id === testId ? { ...t, status: "running" as const } : t),
    } : su));
    setTimeout(() => {
      setSuites(prev => prev.map((su, i) => i === suiteIdx ? {
        ...su, tests: su.tests.map(t => t.id === testId ? { ...SAMPLE_SUITES[i].tests.find(st => st.id === testId)!, status: "passed" as const, duration: Math.floor(Math.random() * 200) + 20 } : t),
      } : su));
    }, 1000);
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "passed": return <CheckCircle size={12} className="text-green-400" />;
      case "failed": return <XCircle size={12} className="text-red-400" />;
      case "running": return <Loader2 size={12} className="text-blue-400 animate-spin" />;
      case "skipped": return <Square size={12} className="text-gray-600" />;
      default: return <Clock size={12} className="text-gray-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-green-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Test Runner</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runAllTests} disabled={running}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50">
            {running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Run All
          </button>
          <button onClick={() => setShowCoverage(!showCoverage)}
            className={`p-1 rounded text-[10px] ${showCoverage ? "text-blue-400 bg-blue-600/20" : "text-gray-500 hover:text-gray-300"}`} title="Toggle coverage">
            <Eye size={12} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-[#333]" title="Close">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#333] bg-[#252526] text-[10px]">
        <span className="flex items-center gap-1 text-green-400"><CheckCircle size={10} /> {passed}</span>
        <span className="flex items-center gap-1 text-red-400"><XCircle size={10} /> {failed}</span>
        <span className="flex items-center gap-1 text-gray-500"><Square size={10} /> {skipped}</span>
        <span className="text-gray-600">| {totalTests} total</span>
        <div className="flex items-center gap-1 ml-auto">
          <Filter size={9} className="text-gray-600" />
          {(["all", "passed", "failed", "skipped"] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-1.5 py-0.5 rounded ${filterStatus === f ? "bg-blue-600/20 text-blue-300" : "text-gray-600 hover:text-gray-300"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {suites.map((suite, si) => {
          const filteredTests = filterStatus === "all" ? suite.tests : suite.tests.filter(t => t.status === filterStatus);
          if (filterStatus !== "all" && filteredTests.length === 0) return null;

          return (
            <div key={suite.name}>
              <div className="flex items-center justify-between px-2 py-1.5 bg-[#252526] border-b border-[#2a2a2a] cursor-pointer hover:bg-[#2a2d2e] group"
                onClick={() => setExpandedSuite(expandedSuite === suite.name ? null : suite.name)}>
                <div className="flex items-center gap-2">
                  {expandedSuite === suite.name ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                  <StatusIcon status={suite.status} />
                  <span className="text-xs text-gray-300">{suite.name}</span>
                  <span className="text-[10px] text-gray-600 font-mono">{suite.file}</span>
                </div>
                <div className="flex items-center gap-2">
                  {suite.duration > 0 && <span className="text-[10px] text-gray-600">{suite.duration}ms</span>}
                  <button onClick={e => { e.stopPropagation(); runSuite(suite.name); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c] text-gray-500 hover:text-green-400" title="Run suite">
                    <Play size={11} />
                  </button>
                </div>
              </div>

              {expandedSuite === suite.name && filteredTests.map(test => (
                <div key={test.id}
                  className={`flex items-center gap-2 px-2 py-1 pl-8 border-b border-[#2a2a2a] cursor-pointer group ${selectedTest?.id === test.id ? "bg-[#37373d]" : "hover:bg-[#2a2d2e]"}`}
                  onClick={() => setSelectedTest(selectedTest?.id === test.id ? null : test)}>
                  <StatusIcon status={test.status} />
                  <span className={`text-xs flex-1 ${test.status === "failed" ? "text-red-300" : test.status === "skipped" ? "text-gray-600" : "text-gray-300"}`}>
                    {test.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    {showCoverage && test.coverage !== null && (
                      <span className={`px-1 py-0 rounded ${test.coverage >= 80 ? "text-green-400 bg-green-600/10" : test.coverage >= 60 ? "text-yellow-400 bg-yellow-600/10" : "text-red-400 bg-red-600/10"}`}>
                        {test.coverage}%
                      </span>
                    )}
                    <span className="text-gray-600 font-mono">L{test.line}</span>
                    {test.duration > 0 && <span className="text-gray-600">{test.duration}ms</span>}
                    <button onClick={e => { e.stopPropagation(); runSingleTest(si, test.id); }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c] text-gray-500 hover:text-green-400" title="Run test">
                      <Play size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedTest && selectedTest.error && (
        <div className="border-t border-[#333] bg-[#1a1a1a] p-3 max-h-40 overflow-y-auto shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs font-medium text-red-300">{selectedTest.name}</span>
            <button onClick={() => setSelectedTest(null)} className="ml-auto text-gray-600 hover:text-gray-300 text-xs">✕</button>
          </div>
          <pre className="text-[10px] font-mono text-red-400/80 whitespace-pre-wrap">{selectedTest.error}</pre>
          <div className="flex items-center gap-2 mt-2">
            <button className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/10 text-green-400 text-[10px] hover:bg-green-600/20">
              <RotateCcw size={9} /> Re-run
            </button>
            <span className="text-[10px] text-gray-600 font-mono">{selectedTest.line ? `Line ${selectedTest.line}` : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
