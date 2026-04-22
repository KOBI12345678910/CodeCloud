export interface StyleRule {
  id: string;
  category: string;
  rule: string;
  example: { before: string; after: string };
  severity: "error" | "warning" | "info";
  autoFixable: boolean;
}

export interface StyleAnalysis {
  score: number;
  violations: StyleViolation[];
  suggestions: string[];
  consistencyMetrics: { metric: string; score: number }[];
}

export interface StyleViolation {
  id: string;
  line: number;
  rule: string;
  message: string;
  severity: "error" | "warning" | "info";
  fix?: string;
}

export interface StyleGuide {
  projectName: string;
  generatedAt: string;
  sections: { title: string; rules: string[] }[];
}

export function analyzeCodeStyle(code: string, language: string = "typescript"): StyleAnalysis {
  const violations: StyleViolation[] = [];
  const lines = code.split("\n");
  let id = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes("var ")) violations.push({ id: `v${id++}`, line: lineNum, rule: "no-var", message: "Use 'const' or 'let' instead of 'var'", severity: "error", fix: line.replace("var ", "const ") });
    if (line.match(/\t/) && lines.some(l => l.match(/^  /))) violations.push({ id: `v${id++}`, line: lineNum, rule: "consistent-indent", message: "Mixed tabs and spaces detected", severity: "warning" });
    if (line.length > 120) violations.push({ id: `v${id++}`, line: lineNum, rule: "max-line-length", message: `Line exceeds 120 characters (${line.length})`, severity: "info" });
    if (line.match(/console\.log/)) violations.push({ id: `v${id++}`, line: lineNum, rule: "no-console", message: "Remove console.log statements", severity: "warning", fix: "" });
    if (line.match(/==(?!=)/)) violations.push({ id: `v${id++}`, line: lineNum, rule: "strict-equality", message: "Use === instead of ==", severity: "error", fix: line.replace(/==(?!=)/, "===") });
  });

  const score = Math.max(0, 100 - violations.length * 5);

  return {
    score, violations,
    suggestions: [
      "Consider using destructuring for object properties",
      "Arrow functions are preferred for callbacks",
      "Add explicit return types to exported functions",
    ],
    consistencyMetrics: [
      { metric: "Naming Convention", score: 92 },
      { metric: "Import Order", score: 85 },
      { metric: "Bracket Style", score: 98 },
      { metric: "Quote Style", score: 95 },
      { metric: "Semicolons", score: 100 },
    ],
  };
}

export function generateStyleGuide(projectName: string): StyleGuide {
  return {
    projectName, generatedAt: new Date().toISOString(),
    sections: [
      { title: "Naming Conventions", rules: ["Use camelCase for variables and functions", "Use PascalCase for classes and types", "Use UPPER_SNAKE_CASE for constants", "Prefix interfaces with descriptive names, not 'I'"] },
      { title: "Code Structure", rules: ["Maximum line length: 120 characters", "Use 2-space indentation", "One class/component per file", "Group imports: external, internal, relative"] },
      { title: "TypeScript", rules: ["Prefer 'const' over 'let', never use 'var'", "Use strict equality (===)", "Add explicit return types to public functions", "Avoid 'any' type, use 'unknown' when needed"] },
      { title: "Error Handling", rules: ["Always handle promise rejections", "Use custom error classes", "Log errors with context", "Never swallow errors silently"] },
    ],
  };
}

export function autoFormatCode(code: string): { formatted: string; changes: number } {
  let formatted = code;
  let changes = 0;
  formatted = formatted.replace(/var /g, () => { changes++; return "const "; });
  formatted = formatted.replace(/==(?!=)/g, () => { changes++; return "==="; });
  formatted = formatted.replace(/console\.log\(.*?\);?\n?/g, () => { changes++; return ""; });
  return { formatted, changes };
}
