export interface StagedChange {
  file: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  diff?: string;
}

export interface CommitMessageResult {
  message: string;
  type: string;
  scope?: string;
  body?: string;
  breaking: boolean;
  alternatives: string[];
}

const TYPES = ["feat", "fix", "refactor", "docs", "style", "test", "chore", "perf", "ci", "build"];

function inferType(changes: StagedChange[]): string {
  const files = changes.map(c => c.file.toLowerCase());
  if (files.some(f => f.includes("test") || f.includes("spec"))) return "test";
  if (files.some(f => f.includes("readme") || f.includes(".md"))) return "docs";
  if (files.some(f => f.includes("ci") || f.includes(".github") || f.includes("workflow"))) return "ci";
  if (files.some(f => f.includes("package.json") || f.includes("tsconfig") || f.includes("webpack") || f.includes("vite.config"))) return "build";
  if (files.every(f => f.endsWith(".css") || f.endsWith(".scss"))) return "style";
  if (changes.every(c => c.status === "modified") && changes.length <= 2) return "fix";
  if (changes.some(c => c.status === "added")) return "feat";
  return "refactor";
}

function inferScope(changes: StagedChange[]): string | undefined {
  const dirs = changes.map(c => {
    const parts = c.file.split("/");
    return parts.length > 1 ? parts[parts.length - 2] : undefined;
  }).filter(Boolean);
  const uniqueDirs = [...new Set(dirs)];
  if (uniqueDirs.length === 1) return uniqueDirs[0];
  if (uniqueDirs.length <= 3) return uniqueDirs.join(",");
  return undefined;
}

function generateDescription(changes: StagedChange[], type: string): string {
  const addedFiles = changes.filter(c => c.status === "added");
  const modifiedFiles = changes.filter(c => c.status === "modified");
  const deletedFiles = changes.filter(c => c.status === "deleted");

  if (type === "feat" && addedFiles.length > 0) {
    const mainFile = addedFiles[0].file.split("/").pop()?.replace(/\.\w+$/, "") || "feature";
    return `add ${mainFile} ${addedFiles.length > 1 ? `and ${addedFiles.length - 1} other files` : ""}`.trim();
  }
  if (type === "fix" && modifiedFiles.length === 1) {
    return `fix issue in ${modifiedFiles[0].file.split("/").pop()}`;
  }
  if (type === "refactor") {
    return `refactor ${changes.length} file${changes.length > 1 ? "s" : ""} for improved structure`;
  }
  if (deletedFiles.length > 0 && addedFiles.length === 0) {
    return `remove ${deletedFiles.length} unused file${deletedFiles.length > 1 ? "s" : ""}`;
  }

  const totalAdditions = changes.reduce((s, c) => s + c.additions, 0);
  const totalDeletions = changes.reduce((s, c) => s + c.deletions, 0);
  if (totalDeletions > totalAdditions * 2) return "clean up and simplify codebase";
  return `update ${changes.length} file${changes.length > 1 ? "s" : ""}`;
}

export function generateCommitMessage(changes: StagedChange[]): CommitMessageResult {
  if (changes.length === 0) {
    return { message: "chore: empty commit", type: "chore", breaking: false, alternatives: [] };
  }

  const type = inferType(changes);
  const scope = inferScope(changes);
  const description = generateDescription(changes, type);
  const scopePart = scope ? `(${scope})` : "";
  const message = `${type}${scopePart}: ${description}`;

  const totalAdditions = changes.reduce((s, c) => s + c.additions, 0);
  const totalDeletions = changes.reduce((s, c) => s + c.deletions, 0);
  const body = `${changes.length} file${changes.length > 1 ? "s" : ""} changed, ${totalAdditions} insertion${totalAdditions !== 1 ? "s" : ""}(+), ${totalDeletions} deletion${totalDeletions !== 1 ? "s" : ""}(-)`;

  const alternatives = [
    `${type}${scopePart}: ${changes.map(c => c.file.split("/").pop()).slice(0, 3).join(", ")}`,
    `${type}: ${description} [${changes.length} files]`,
    changes.length === 1 ? `${type}: update ${changes[0].file}` : `${type}: batch update across ${new Set(changes.map(c => c.file.split("/")[0])).size} directories`,
  ].filter(a => a !== message);

  return { message, type, scope, body, breaking: false, alternatives };
}
