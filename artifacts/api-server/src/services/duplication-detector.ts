export interface DuplicateBlock {
  id: string;
  hash: string;
  lines: number;
  occurrences: DuplicateOccurrence[];
  suggestion: string;
  severity: "high" | "medium" | "low";
  code: string;
}

export interface DuplicateOccurrence {
  file: string;
  startLine: number;
  endLine: number;
}

export interface DuplicationSummary {
  totalFiles: number;
  totalLines: number;
  duplicatedLines: number;
  duplicationPercentage: number;
  blocks: DuplicateBlock[];
  byFile: FileDuplication[];
}

export interface FileDuplication {
  file: string;
  totalLines: number;
  duplicatedLines: number;
  percentage: number;
  blockCount: number;
}

const BLOCKS: DuplicateBlock[] = [
  {
    id: "dup-1", hash: "a1b2c3", lines: 12, severity: "high",
    code: `async function fetchData(url: string) {\n  const res = await fetch(url, { credentials: "include" });\n  if (!res.ok) throw new Error(res.statusText);\n  return res.json();\n}`,
    occurrences: [
      { file: "src/services/users.ts", startLine: 15, endLine: 26 },
      { file: "src/services/projects.ts", startLine: 22, endLine: 33 },
      { file: "src/services/deployments.ts", startLine: 8, endLine: 19 },
    ],
    suggestion: "Extract to a shared utility function in src/utils/api.ts",
  },
  {
    id: "dup-2", hash: "d4e5f6", lines: 8, severity: "high",
    code: `const handleError = (err: unknown) => {\n  const message = err instanceof Error ? err.message : "Unknown error";\n  console.error(message);\n  return { error: message };\n};`,
    occurrences: [
      { file: "src/routes/auth.ts", startLine: 45, endLine: 52 },
      { file: "src/routes/projects.ts", startLine: 89, endLine: 96 },
      { file: "src/routes/billing.ts", startLine: 34, endLine: 41 },
      { file: "src/routes/deploy.ts", startLine: 67, endLine: 74 },
    ],
    suggestion: "Create a shared error handler middleware",
  },
  {
    id: "dup-3", hash: "g7h8i9", lines: 15, severity: "medium",
    code: `function validateEmail(email: string): boolean {\n  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return re.test(email);\n}`,
    occurrences: [
      { file: "src/services/auth.ts", startLine: 5, endLine: 19 },
      { file: "src/components/SignupForm.tsx", startLine: 12, endLine: 26 },
    ],
    suggestion: "Move to shared validation utilities in src/utils/validators.ts",
  },
  {
    id: "dup-4", hash: "j1k2l3", lines: 10, severity: "medium",
    code: `function formatDate(date: Date): string {\n  return date.toLocaleDateString("en-US", {\n    month: "short", day: "numeric", year: "numeric"\n  });\n}`,
    occurrences: [
      { file: "src/components/Dashboard.tsx", startLine: 30, endLine: 39 },
      { file: "src/components/ActivityLog.tsx", startLine: 18, endLine: 27 },
      { file: "src/components/BillingHistory.tsx", startLine: 44, endLine: 53 },
    ],
    suggestion: "Extract to src/utils/formatters.ts for reuse",
  },
  {
    id: "dup-5", hash: "m4n5o6", lines: 6, severity: "low",
    code: `const config = {\n  headers: { "Content-Type": "application/json" },\n  credentials: "include" as const,\n};`,
    occurrences: [
      { file: "src/api/client.ts", startLine: 10, endLine: 15 },
      { file: "src/hooks/useApi.ts", startLine: 8, endLine: 13 },
    ],
    suggestion: "Consolidate API config into a single module",
  },
  {
    id: "dup-6", hash: "p7q8r9", lines: 18, severity: "low",
    code: `function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}`,
    occurrences: [
      { file: "src/hooks/useSearch.ts", startLine: 3, endLine: 20 },
      { file: "src/components/ide/Editor.tsx", startLine: 55, endLine: 72 },
    ],
    suggestion: "Use a shared debounce utility or lodash.debounce",
  },
];

export function detectDuplicates(): DuplicationSummary {
  const totalFiles = 190;
  const totalLines = 27500;
  const duplicatedLines = BLOCKS.reduce((s, b) => s + b.lines * b.occurrences.length, 0);

  const fileMap = new Map<string, { duplicatedLines: number; blockCount: number }>();
  BLOCKS.forEach(b => {
    b.occurrences.forEach(o => {
      const existing = fileMap.get(o.file) || { duplicatedLines: 0, blockCount: 0 };
      existing.duplicatedLines += b.lines;
      existing.blockCount += 1;
      fileMap.set(o.file, existing);
    });
  });

  const byFile: FileDuplication[] = Array.from(fileMap.entries()).map(([file, data]) => {
    const totalLines = 150 + Math.floor(Math.random() * 200);
    return { file, totalLines, duplicatedLines: data.duplicatedLines, percentage: Math.round((data.duplicatedLines / totalLines) * 100), blockCount: data.blockCount };
  }).sort((a, b) => b.percentage - a.percentage);

  return {
    totalFiles, totalLines, duplicatedLines,
    duplicationPercentage: Math.round((duplicatedLines / totalLines) * 100 * 10) / 10,
    blocks: BLOCKS,
    byFile,
  };
}
