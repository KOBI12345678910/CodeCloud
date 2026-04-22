export interface ErrorExplanation {
  message: string;
  explanation: string;
  quickFixes: { label: string; edit: string }[];
  docLink?: string;
  similarIssues: { title: string; url: string }[];
}

export function getErrorExplanation(errorMessage: string, code: string, line: number): ErrorExplanation {
  const explanations: Record<string, ErrorExplanation> = {
    "Cannot find name": {
      message: errorMessage,
      explanation: "This variable or function hasn't been declared in the current scope. It might need to be imported or defined.",
      quickFixes: [
        { label: "Add import statement", edit: `import { ${errorMessage.split("'")[1] || "unknown"} } from "./module";` },
        { label: "Declare variable", edit: `const ${errorMessage.split("'")[1] || "unknown"} = undefined;` },
      ],
      docLink: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
      similarIssues: [
        { title: "TypeScript cannot find name after import", url: "#" },
        { title: "Module not found in TypeScript", url: "#" },
      ],
    },
    "Property does not exist": {
      message: errorMessage,
      explanation: "The property you're trying to access doesn't exist on the given type. You may need to add it to the type definition or use optional chaining.",
      quickFixes: [
        { label: "Add optional chaining", edit: "?." },
        { label: "Add type assertion", edit: "as any" },
      ],
      similarIssues: [{ title: "Property does not exist on type", url: "#" }],
    },
  };

  for (const [key, value] of Object.entries(explanations)) {
    if (errorMessage.includes(key)) return value;
  }

  return {
    message: errorMessage,
    explanation: "This is a TypeScript compilation error. Check the error message for details on what needs to be fixed.",
    quickFixes: [],
    similarIssues: [],
  };
}

export function registerErrorHoverProvider(monaco: any) {
  return monaco.languages.registerHoverProvider("typescript", {
    provideHover: (model: any, position: any) => {
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const marker = markers.find((m: any) => m.startLineNumber <= position.lineNumber && m.endLineNumber >= position.lineNumber);
      if (!marker) return null;

      const explanation = getErrorExplanation(marker.message, model.getValue(), position.lineNumber);
      const contents = [
        { value: `**Error:** ${explanation.message}` },
        { value: `**Explanation:** ${explanation.explanation}` },
        ...(explanation.quickFixes.length > 0 ? [{ value: `**Quick fixes:** ${explanation.quickFixes.map(f => f.label).join(", ")}` }] : []),
      ];

      return { range: new monaco.Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn), contents };
    },
  });
}
