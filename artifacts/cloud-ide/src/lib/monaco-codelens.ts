export interface CodeLensAction {
  id: string;
  label: string;
  line: number;
  type: "test" | "debug" | "references" | "author" | "ai";
  tooltip: string;
  command?: string;
}

export function getCodeLensActions(fileContent: string, filePath: string): CodeLensAction[] {
  const lines = fileContent.split("\n");
  const actions: CodeLensAction[] = [];
  let id = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
      const funcName = trimmed.match(/function\s+(\w+)/)?.[1] || "func";
      actions.push(
        { id: `cl-${id++}`, label: "Run Test", line: lineNum, type: "test", tooltip: `Run tests for ${funcName}` },
        { id: `cl-${id++}`, label: `${Math.floor(Math.random() * 10) + 1} references`, line: lineNum, type: "references", tooltip: `Find all references to ${funcName}` },
        { id: `cl-${id++}`, label: "AI: Suggest improvement", line: lineNum, type: "ai", tooltip: `Get AI suggestions for ${funcName}` },
      );
    }

    if (trimmed.match(/^(export\s+)?(const|class)\s+\w+/)) {
      const name = trimmed.match(/(const|class)\s+(\w+)/)?.[2] || "symbol";
      actions.push(
        { id: `cl-${id++}`, label: `${Math.floor(Math.random() * 8) + 2} references`, line: lineNum, type: "references", tooltip: `Find all references to ${name}` },
      );
    }
  });

  return actions;
}

export function registerCodeLensProvider(monaco: any, getActions: () => CodeLensAction[]) {
  return monaco.languages.registerCodeLensProvider("typescript", {
    provideCodeLenses: () => {
      const actions = getActions();
      return {
        lenses: actions.map(a => ({
          range: { startLineNumber: a.line, startColumn: 1, endLineNumber: a.line, endColumn: 1 },
          id: a.id,
          command: { id: a.command || "", title: a.label, tooltip: a.tooltip },
        })),
        dispose: () => {},
      };
    },
  });
}
