export interface FormatCIConfig {
  id: string;
  projectId: string;
  enabled: boolean;
  formatOnCommit: boolean;
  formatCheckInCI: boolean;
  autoFixPR: boolean;
  formatters: FormatterConfig[];
  styleRules: StyleRule[];
  lastRun: FormatRun | null;
  history: FormatRun[];
}

export interface FormatterConfig {
  name: string;
  language: string;
  command: string;
  extensions: string[];
  enabled: boolean;
  configFile: string;
}

export interface StyleRule {
  id: string;
  name: string;
  category: string;
  severity: "error" | "warning" | "info";
  enabled: boolean;
  autoFixable: boolean;
}

export interface FormatRun {
  id: string;
  trigger: "commit" | "ci" | "manual" | "pr";
  status: "running" | "passed" | "failed" | "fixed";
  filesChecked: number;
  filesFormatted: number;
  violations: FormatViolation[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  commitSha: string;
}

export interface FormatViolation {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: "error" | "warning" | "info";
  autoFixed: boolean;
}

const configs: Map<string, FormatCIConfig> = new Map();

function defaultConfig(projectId: string): FormatCIConfig {
  return {
    id: `fc_${projectId}`, projectId, enabled: true, formatOnCommit: true, formatCheckInCI: true, autoFixPR: true,
    formatters: [
      { name: "Prettier", language: "TypeScript/JavaScript", command: "prettier --write", extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".css"], enabled: true, configFile: ".prettierrc" },
      { name: "ESLint", language: "TypeScript/JavaScript", command: "eslint --fix", extensions: [".ts", ".tsx", ".js", ".jsx"], enabled: true, configFile: ".eslintrc.js" },
      { name: "Black", language: "Python", command: "black", extensions: [".py"], enabled: false, configFile: "pyproject.toml" },
      { name: "gofmt", language: "Go", command: "gofmt -w", extensions: [".go"], enabled: false, configFile: "" },
    ],
    styleRules: [
      { id: "sr1", name: "Consistent quotes", category: "formatting", severity: "error", enabled: true, autoFixable: true },
      { id: "sr2", name: "Trailing commas", category: "formatting", severity: "warning", enabled: true, autoFixable: true },
      { id: "sr3", name: "Max line length", category: "formatting", severity: "warning", enabled: true, autoFixable: true },
      { id: "sr4", name: "Import ordering", category: "imports", severity: "error", enabled: true, autoFixable: true },
      { id: "sr5", name: "No unused imports", category: "imports", severity: "error", enabled: true, autoFixable: true },
      { id: "sr6", name: "Consistent spacing", category: "formatting", severity: "info", enabled: true, autoFixable: true },
      { id: "sr7", name: "Semicolons", category: "formatting", severity: "error", enabled: true, autoFixable: true },
      { id: "sr8", name: "No console.log", category: "code-quality", severity: "warning", enabled: false, autoFixable: false },
    ],
    lastRun: {
      id: "fr1", trigger: "commit", status: "fixed", filesChecked: 42, filesFormatted: 8,
      violations: [
        { file: "src/pages/project.tsx", line: 45, column: 12, rule: "trailing-comma", message: "Missing trailing comma", severity: "warning", autoFixed: true },
        { file: "src/App.tsx", line: 12, column: 1, rule: "import-order", message: "Import order violation", severity: "error", autoFixed: true },
        { file: "src/lib/utils.ts", line: 88, column: 80, rule: "max-line-length", message: "Line exceeds 80 characters", severity: "warning", autoFixed: true },
      ],
      startedAt: new Date(Date.now() - 300000).toISOString(), completedAt: new Date(Date.now() - 295000).toISOString(),
      durationMs: 5200, commitSha: "a1b2c3d",
    },
    history: [
      { id: "fr1", trigger: "commit", status: "fixed", filesChecked: 42, filesFormatted: 8, violations: [], startedAt: new Date(Date.now() - 300000).toISOString(), completedAt: new Date(Date.now() - 295000).toISOString(), durationMs: 5200, commitSha: "a1b2c3d" },
      { id: "fr2", trigger: "ci", status: "passed", filesChecked: 135, filesFormatted: 0, violations: [], startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3585000).toISOString(), durationMs: 15000, commitSha: "b2c3d4e" },
      { id: "fr3", trigger: "pr", status: "fixed", filesChecked: 18, filesFormatted: 3, violations: [], startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7195000).toISOString(), durationMs: 4800, commitSha: "c3d4e5f" },
    ],
  };
}

export class FormatCIService {
  getConfig(projectId: string): FormatCIConfig {
    if (!configs.has(projectId)) configs.set(projectId, defaultConfig(projectId));
    return configs.get(projectId)!;
  }

  updateConfig(projectId: string, updates: Partial<FormatCIConfig>): FormatCIConfig {
    const cfg = this.getConfig(projectId);
    if (updates.enabled !== undefined) cfg.enabled = updates.enabled;
    if (updates.formatOnCommit !== undefined) cfg.formatOnCommit = updates.formatOnCommit;
    if (updates.formatCheckInCI !== undefined) cfg.formatCheckInCI = updates.formatCheckInCI;
    if (updates.autoFixPR !== undefined) cfg.autoFixPR = updates.autoFixPR;
    if (updates.formatters) cfg.formatters = updates.formatters;
    if (updates.styleRules) cfg.styleRules = updates.styleRules;
    return cfg;
  }

  async runFormat(projectId: string, trigger: FormatRun["trigger"]): Promise<FormatRun> {
    const cfg = this.getConfig(projectId);
    const run: FormatRun = {
      id: `fr_${Date.now()}`, trigger, status: "passed",
      filesChecked: Math.floor(Math.random() * 100) + 30,
      filesFormatted: Math.floor(Math.random() * 10),
      violations: [], startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.floor(Math.random() * 10000) + 3000,
      commitSha: Math.random().toString(36).slice(2, 9),
    };
    if (run.filesFormatted > 0) run.status = "fixed";
    cfg.lastRun = run;
    cfg.history.unshift(run);
    return run;
  }
}

export const formatCIService = new FormatCIService();
