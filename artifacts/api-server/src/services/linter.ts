export interface LintDiagnostic {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source: string;
  rule?: string;
}

const JS_TS_PATTERNS: Array<{
  pattern: RegExp;
  severity: LintDiagnostic["severity"];
  message: string;
  rule: string;
}> = [
  { pattern: /\bvar\s+/, severity: "warning", message: "Unexpected var, use let or const instead", rule: "no-var" },
  { pattern: /==(?!=)/, severity: "warning", message: "Expected '===' and instead saw '=='", rule: "eqeqeq" },
  { pattern: /!=(?!=)/, severity: "warning", message: "Expected '!==' and instead saw '!='", rule: "eqeqeq" },
  { pattern: /console\.log\s*\(/, severity: "info", message: "Unexpected console statement", rule: "no-console" },
  { pattern: /\balert\s*\(/, severity: "warning", message: "Unexpected alert statement", rule: "no-alert" },
  { pattern: /\bdebugger\b/, severity: "error", message: "Unexpected debugger statement", rule: "no-debugger" },
  { pattern: /;\s*;/, severity: "warning", message: "Unnecessary semicolon", rule: "no-extra-semi" },
  { pattern: /\beval\s*\(/, severity: "error", message: "eval can be harmful", rule: "no-eval" },
  { pattern: /TODO:?\s/i, severity: "info", message: "TODO comment found", rule: "no-todo" },
  { pattern: /FIXME:?\s/i, severity: "warning", message: "FIXME comment found", rule: "no-fixme" },
  { pattern: /HACK:?\s/i, severity: "warning", message: "HACK comment found", rule: "no-hack" },
  { pattern: /\bany\b/, severity: "hint", message: "Unexpected any type, specify a more precise type", rule: "no-explicit-any" },
];

const PYTHON_PATTERNS: Array<{
  pattern: RegExp;
  severity: LintDiagnostic["severity"];
  message: string;
  rule: string;
}> = [
  { pattern: /\bprint\s*\(/, severity: "info", message: "Print statement found (consider using logging)", rule: "W0611" },
  { pattern: /except\s*:/, severity: "warning", message: "Bare except clause (too broad)", rule: "W0702" },
  { pattern: /\bexec\s*\(/, severity: "error", message: "Use of exec() is discouraged", rule: "W0122" },
  { pattern: /import\s+\*/, severity: "warning", message: "Wildcard import", rule: "W0401" },
  { pattern: /TODO:?\s/i, severity: "info", message: "TODO comment found", rule: "W0511" },
  { pattern: /FIXME:?\s/i, severity: "warning", message: "FIXME comment found", rule: "W0511" },
  { pattern: /^\s*pass\s*$/, severity: "hint", message: "Empty block (pass statement)", rule: "W0107" },
];

const GO_PATTERNS: Array<{
  pattern: RegExp;
  severity: LintDiagnostic["severity"];
  message: string;
  rule: string;
}> = [
  { pattern: /fmt\.Print(ln|f)?\s*\(/, severity: "info", message: "fmt.Print found (consider using log package)", rule: "fmt-print" },
  { pattern: /TODO:?\s/i, severity: "info", message: "TODO comment found", rule: "todo" },
  { pattern: /FIXME:?\s/i, severity: "warning", message: "FIXME comment found", rule: "fixme" },
  { pattern: /panic\s*\(/, severity: "warning", message: "panic() should be used sparingly", rule: "no-panic" },
];

function detectFileLanguage(filename: string): "js" | "ts" | "python" | "go" | "unknown" {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return "unknown";
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "js";
  if (["ts", "tsx", "mts", "cts"].includes(ext)) return "ts";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  return "unknown";
}

function getSourceLabel(lang: "js" | "ts" | "python" | "go" | "unknown"): string {
  switch (lang) {
    case "js":
    case "ts":
      return "eslint";
    case "python":
      return "pylint";
    case "go":
      return "golint";
    default:
      return "linter";
  }
}

function getPatterns(lang: "js" | "ts" | "python" | "go" | "unknown") {
  switch (lang) {
    case "js":
    case "ts":
      return JS_TS_PATTERNS;
    case "python":
      return PYTHON_PATTERNS;
    case "go":
      return GO_PATTERNS;
    default:
      return [];
  }
}

export function lintFile(filename: string, content: string): LintDiagnostic[] {
  const lang = detectFileLanguage(filename);
  const patterns = getPatterns(lang);
  const source = getSourceLabel(lang);
  const diagnostics: LintDiagnostic[] = [];

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of patterns) {
      const match = p.pattern.exec(line);
      if (match) {
        diagnostics.push({
          file: filename,
          line: i + 1,
          column: (match.index ?? 0) + 1,
          endLine: i + 1,
          endColumn: (match.index ?? 0) + 1 + match[0].length,
          severity: p.severity,
          message: p.message,
          source,
          rule: p.rule,
        });
      }
    }

    if (line.length > 120) {
      diagnostics.push({
        file: filename,
        line: i + 1,
        column: 121,
        severity: "hint",
        message: `Line exceeds 120 characters (${line.length})`,
        source,
        rule: "max-line-length",
      });
    }
  }

  return diagnostics;
}

export function lintFiles(files: Array<{ name: string; content: string }>): LintDiagnostic[] {
  const all: LintDiagnostic[] = [];
  for (const f of files) {
    all.push(...lintFile(f.name, f.content));
  }
  return all;
}
