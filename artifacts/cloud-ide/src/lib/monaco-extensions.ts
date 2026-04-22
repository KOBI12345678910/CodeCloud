import type * as Monaco from "monaco-editor";

type MonacoInstance = typeof Monaco;

const languageSnippets: Record<string, Monaco.languages.CompletionItem[]> = {};

function buildSnippets(monaco: MonacoInstance): void {
  const kind = monaco.languages.CompletionItemKind.Snippet;
  const insertAsSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

  languageSnippets["javascript"] = [
    {
      label: "comp",
      kind,
      insertText: [
        "function ${1:Component}({ ${2:props} }) {",
        "\treturn (",
        "\t\t<div className=\"${3:container}\">",
        "\t\t\t$0",
        "\t\t</div>",
        "\t);",
        "}",
        "",
        "export default ${1:Component};",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "React function component",
      documentation: "Creates a React function component with props and default export",
      range: undefined!,
    },
    {
      label: "useState",
      kind,
      insertText: "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});",
      insertTextRules: insertAsSnippet,
      detail: "React useState hook",
      documentation: "Creates a useState hook with state and setter",
      range: undefined!,
    },
    {
      label: "useEffect",
      kind,
      insertText: [
        "useEffect(() => {",
        "\t$0",
        "",
        "\treturn () => {",
        "\t\t",
        "\t};",
        "}, [${1:deps}]);",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "React useEffect hook",
      documentation: "Creates a useEffect hook with cleanup",
      range: undefined!,
    },
    {
      label: "clg",
      kind,
      insertText: "console.log('${1:label}:', ${2:value});",
      insertTextRules: insertAsSnippet,
      detail: "Console log with label",
      documentation: "Logs a labeled value to the console",
      range: undefined!,
    },
    {
      label: "afn",
      kind,
      insertText: [
        "const ${1:name} = async (${2:params}) => {",
        "\t$0",
        "};",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Async arrow function",
      documentation: "Creates an async arrow function",
      range: undefined!,
    },
    {
      label: "trycatch",
      kind,
      insertText: [
        "try {",
        "\t$0",
        "} catch (${1:error}) {",
        "\tconsole.error(${1:error});",
        "}",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Try/catch block",
      documentation: "Creates a try/catch error handling block",
      range: undefined!,
    },
    {
      label: "imp",
      kind,
      insertText: "import { $2 } from '${1:module}';",
      insertTextRules: insertAsSnippet,
      detail: "Named import",
      documentation: "Import named exports from a module",
      range: undefined!,
    },
    {
      label: "impd",
      kind,
      insertText: "import ${2:name} from '${1:module}';",
      insertTextRules: insertAsSnippet,
      detail: "Default import",
      documentation: "Import default export from a module",
      range: undefined!,
    },
  ];

  languageSnippets["typescript"] = [
    ...languageSnippets["javascript"],
    {
      label: "intf",
      kind,
      insertText: [
        "interface ${1:Name} {",
        "\t${2:property}: ${3:type};",
        "\t$0",
        "}",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "TypeScript interface",
      documentation: "Creates a TypeScript interface",
      range: undefined!,
    },
    {
      label: "typed",
      kind,
      insertText: "type ${1:Name} = ${2:type};",
      insertTextRules: insertAsSnippet,
      detail: "TypeScript type alias",
      documentation: "Creates a TypeScript type alias",
      range: undefined!,
    },
    {
      label: "comp",
      kind,
      insertText: [
        "interface ${1:Component}Props {",
        "\t${2:children}: React.ReactNode;",
        "}",
        "",
        "function ${1:Component}({ ${2:children} }: ${1:Component}Props) {",
        "\treturn (",
        "\t\t<div className=\"${3:container}\">",
        "\t\t\t{${2:children}}",
        "\t\t\t$0",
        "\t\t</div>",
        "\t);",
        "}",
        "",
        "export default ${1:Component};",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "React TypeScript component",
      documentation: "Creates a typed React function component with props interface",
      range: undefined!,
    },
  ];

  languageSnippets["typescriptreact"] = languageSnippets["typescript"];
  languageSnippets["javascriptreact"] = languageSnippets["javascript"];

  languageSnippets["html"] = [
    {
      label: "html5",
      kind,
      insertText: [
        "<!DOCTYPE html>",
        "<html lang=\"${1:en}\">",
        "<head>",
        "\t<meta charset=\"UTF-8\">",
        "\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
        "\t<title>${2:Document}</title>",
        "</head>",
        "<body>",
        "\t$0",
        "</body>",
        "</html>",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "HTML5 boilerplate",
      documentation: "Creates a full HTML5 document template",
      range: undefined!,
    },
    {
      label: "div",
      kind,
      insertText: "<div class=\"${1:className}\">\n\t$0\n</div>",
      insertTextRules: insertAsSnippet,
      detail: "Div with class",
      documentation: "Creates a div element with a class attribute",
      range: undefined!,
    },
    {
      label: "link",
      kind,
      insertText: "<a href=\"${1:url}\">${2:text}</a>",
      insertTextRules: insertAsSnippet,
      detail: "Anchor tag",
      documentation: "Creates an anchor link element",
      range: undefined!,
    },
  ];

  languageSnippets["css"] = [
    {
      label: "flex",
      kind,
      insertText: [
        "display: flex;",
        "justify-content: ${1:center};",
        "align-items: ${2:center};",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Flexbox layout",
      documentation: "Creates a flexbox container with centering",
      range: undefined!,
    },
    {
      label: "grid",
      kind,
      insertText: [
        "display: grid;",
        "grid-template-columns: ${1:repeat(3, 1fr)};",
        "gap: ${2:1rem};",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "CSS Grid layout",
      documentation: "Creates a CSS grid container",
      range: undefined!,
    },
    {
      label: "media",
      kind,
      insertText: [
        "@media (max-width: ${1:768px}) {",
        "\t$0",
        "}",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Media query",
      documentation: "Creates a responsive media query",
      range: undefined!,
    },
  ];

  languageSnippets["python"] = [
    {
      label: "def",
      kind,
      insertText: [
        "def ${1:function_name}(${2:params}):",
        "\t\"\"\"${3:Docstring}\"\"\"",
        "\t$0",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Python function",
      documentation: "Creates a Python function with docstring",
      range: undefined!,
    },
    {
      label: "cls",
      kind,
      insertText: [
        "class ${1:ClassName}:",
        "\t\"\"\"${2:Class docstring}\"\"\"",
        "",
        "\tdef __init__(self, ${3:params}):",
        "\t\t$0",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Python class",
      documentation: "Creates a Python class with constructor",
      range: undefined!,
    },
    {
      label: "main",
      kind,
      insertText: [
        "def main():",
        "\t$0",
        "",
        "",
        "if __name__ == \"__main__\":",
        "\tmain()",
      ].join("\n"),
      insertTextRules: insertAsSnippet,
      detail: "Python main entry",
      documentation: "Creates a main function with if __name__ guard",
      range: undefined!,
    },
  ];
}

function registerSnippetProviders(monaco: MonacoInstance): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];
  const languages = Object.keys(languageSnippets);

  for (const lang of languages) {
    const d = monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const items = (languageSnippets[lang] || []).map((snippet) => ({
          ...snippet,
          range,
        }));

        return { suggestions: items };
      },
    });
    disposables.push(d);
  }

  return disposables;
}

function registerLinkedEditingForHtml(monaco: MonacoInstance): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  for (const lang of ["html", "typescriptreact", "javascriptreact"]) {
    const d = monaco.languages.registerLinkedEditingRangeProvider(lang, {
      provideLinkedEditingRanges(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const offset = position.column - 1;

        const openTagMatch = /<(\w[\w-]*)/.exec(lineContent);
        const closeTagMatch = /<\/(\w[\w-]*)>/.exec(lineContent);

        if (!openTagMatch && !closeTagMatch) return undefined;

        const tagName = openTagMatch?.[1] || closeTagMatch?.[1];
        if (!tagName) return undefined;

        let inTag = false;
        if (openTagMatch) {
          const start = openTagMatch.index + 1;
          const end = start + openTagMatch[1].length;
          if (offset >= start && offset <= end) inTag = true;
        }
        if (closeTagMatch && !inTag) {
          const start = closeTagMatch.index + 2;
          const end = start + closeTagMatch[1].length;
          if (offset >= start && offset <= end) inTag = true;
        }
        if (!inTag) return undefined;

        const fullText = model.getValue();
        const ranges: Monaco.IRange[] = [];
        const tagRegex = new RegExp(`<\\/?(${tagName})(?=[\\s>/])`, "g");
        let match: RegExpExecArray | null;

        while ((match = tagRegex.exec(fullText)) !== null) {
          const tagStart = match.index + (match[0].startsWith("</") ? 2 : 1);
          const tagEnd = tagStart + tagName.length;

          const startPos = model.getPositionAt(tagStart);
          const endPos = model.getPositionAt(tagEnd);

          ranges.push({
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          });
        }

        if (ranges.length < 2) return undefined;

        return {
          ranges,
          wordPattern: /\w[\w-]*/,
        };
      },
    });
    disposables.push(d);
  }

  return disposables;
}

function registerFoldingRegions(monaco: MonacoInstance): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];

  const regionConfigs: Record<string, { start: RegExp; end: RegExp }> = {
    javascript: { start: /^\s*\/\/\s*#?region\b/, end: /^\s*\/\/\s*#?endregion\b/ },
    typescript: { start: /^\s*\/\/\s*#?region\b/, end: /^\s*\/\/\s*#?endregion\b/ },
    typescriptreact: { start: /^\s*\/\/\s*#?region\b/, end: /^\s*\/\/\s*#?endregion\b/ },
    javascriptreact: { start: /^\s*\/\/\s*#?region\b/, end: /^\s*\/\/\s*#?endregion\b/ },
    python: { start: /^\s*#\s*region\b/, end: /^\s*#\s*endregion\b/ },
    css: { start: /^\s*\/\*\s*#?region\b/, end: /^\s*\/\*\s*#?endregion\b/ },
    html: { start: /^\s*<!--\s*#?region\b/, end: /^\s*<!--\s*#?endregion\b/ },
  };

  for (const [lang, config] of Object.entries(regionConfigs)) {
    const d = monaco.languages.registerFoldingRangeProvider(lang, {
      provideFoldingRanges(model) {
        const ranges: Monaco.languages.FoldingRange[] = [];
        const stack: number[] = [];
        const lineCount = model.getLineCount();

        for (let i = 1; i <= lineCount; i++) {
          const line = model.getLineContent(i);
          if (config.start.test(line)) {
            stack.push(i);
          } else if (config.end.test(line) && stack.length > 0) {
            const start = stack.pop()!;
            ranges.push({
              start,
              end: i,
              kind: monaco.languages.FoldingRangeKind.Region,
            });
          }
        }

        return ranges;
      },
    });
    disposables.push(d);
  }

  return disposables;
}

export function getEditorOptions(): Record<string, unknown> {
  return {
    "bracketPairColorization.enabled": true,
    "bracketPairColorization.independentColorPoolPerBracketType": true,
    guides: {
      bracketPairs: "active",
      bracketPairsHorizontal: "active",
      indentation: true,
      highlightActiveIndentation: true,
    },
    stickyScroll: {
      enabled: true,
      maxLineCount: 5,
      defaultModel: "foldingProviderModel",
    },
    folding: true,
    foldingStrategy: "auto",
    foldingHighlight: true,
    showFoldingControls: "mouseover",
    linkedEditing: true,
    renderIndentGuides: true,
    multiCursorModifier: "alt",
    multiCursorMergeOverlapping: true,
    multiCursorPaste: "spread",
    multiCursorLimit: 10000,
    columnSelection: false,
    occurrencesHighlight: "multiFile",
    selectionHighlight: true,
    find: {
      addExtraSpaceOnTop: true,
      seedSearchStringFromSelection: "always",
    },
    copyWithSyntaxHighlighting: true,
    emptySelectionClipboard: true,
    dragAndDrop: true,
  };
}

export function setupMultiCursorKeybindings(
  monaco: MonacoInstance,
  editor: Monaco.editor.IStandaloneCodeEditor
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];
  const KM = monaco.KeyMod;
  const KC = monaco.KeyCode;

  disposables.push(
    editor.addAction({
      id: "editor.action.addSelectionToNextFindMatch",
      label: "Add Selection To Next Find Match",
      keybindings: [KM.CtrlCmd | KC.KeyD],
      run: (ed) => {
        ed.getAction("editor.action.addSelectionToNextFindMatch")?.run();
      },
    })
  );

  disposables.push(
    editor.addAction({
      id: "editor.action.selectHighlights",
      label: "Select All Occurrences",
      keybindings: [KM.CtrlCmd | KM.Shift | KC.KeyL],
      run: (ed) => {
        ed.getAction("editor.action.selectHighlights")?.run();
      },
    })
  );

  disposables.push(
    editor.addAction({
      id: "editor.action.insertCursorAbove",
      label: "Add Cursor Above",
      keybindings: [KM.CtrlCmd | KM.Alt | KC.UpArrow],
      run: (ed) => {
        ed.getAction("editor.action.insertCursorAbove")?.run();
      },
    })
  );

  disposables.push(
    editor.addAction({
      id: "editor.action.insertCursorBelow",
      label: "Add Cursor Below",
      keybindings: [KM.CtrlCmd | KM.Alt | KC.DownArrow],
      run: (ed) => {
        ed.getAction("editor.action.insertCursorBelow")?.run();
      },
    })
  );

  disposables.push(
    editor.addAction({
      id: "editor.action.toggleColumnSelection",
      label: "Toggle Column Selection Mode",
      keybindings: [KM.Shift | KM.Alt | KC.KeyC],
      run: (ed) => {
        const currentValue = ed.getOption(monaco.editor.EditorOption.columnSelection);
        ed.updateOptions({ columnSelection: !currentValue });
      },
    })
  );

  disposables.push(
    editor.addAction({
      id: "editor.action.addCursorsToLineEnds",
      label: "Add Cursors to Line Ends",
      keybindings: [KM.Shift | KM.Alt | KC.KeyI],
      run: (ed) => {
        ed.getAction("editor.action.addCursorsToLineEnds")?.run();
      },
    })
  );

  return disposables;
}

export function registerMonacoExtensions(monaco: MonacoInstance): () => void {
  buildSnippets(monaco);

  const disposables: Monaco.IDisposable[] = [
    ...registerSnippetProviders(monaco),
    ...registerLinkedEditingForHtml(monaco),
    ...registerFoldingRegions(monaco),
  ];

  return () => {
    for (const d of disposables) {
      d.dispose();
    }
  };
}
