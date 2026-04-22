export interface DefinitionResult {
  file: string;
  line: number;
  column: number;
  preview: string;
}

export interface ReferenceResult {
  file: string;
  line: number;
  column: number;
  preview: string;
  kind: "read" | "write" | "definition";
}

export interface HoverInfo {
  type: string;
  documentation?: string;
  signature?: string;
}

export interface RenameResult {
  changes: { file: string; line: number; column: number; oldText: string; newText: string }[];
  filesAffected: number;
}

export function goToDefinition(projectId: string, file: string, line: number, column: number): DefinitionResult | null {
  return { file: file.replace(/\.tsx?$/, ".types.ts"), line: Math.floor(Math.random() * 50) + 1, column: 1, preview: `export interface ${file.split("/").pop()?.replace(/\.\w+$/, "") || "Type"} {` };
}

export function findReferences(projectId: string, symbol: string): ReferenceResult[] {
  const files = ["src/index.ts", "src/app.ts", "src/utils.ts", "src/components/Main.tsx", "src/hooks/useData.ts"];
  return files.slice(0, 2 + Math.floor(Math.random() * 3)).map(f => ({
    file: f, line: Math.floor(Math.random() * 100) + 1, column: Math.floor(Math.random() * 40) + 1,
    preview: `  const result = ${symbol}(data);`,
    kind: Math.random() > 0.7 ? "write" as const : "read" as const,
  }));
}

export function getHoverInfo(projectId: string, file: string, line: number, column: number): HoverInfo {
  return { type: "(method) Array<T>.map<U>(callbackfn: (value: T, index: number) => U): U[]", documentation: "Creates an array from calling a function on every element.", signature: "map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]" };
}

export function renameSymbol(projectId: string, symbol: string, newName: string): RenameResult {
  const refs = findReferences(projectId, symbol);
  return { changes: refs.map(r => ({ file: r.file, line: r.line, column: r.column, oldText: symbol, newText: newName })), filesAffected: new Set(refs.map(r => r.file)).size };
}
