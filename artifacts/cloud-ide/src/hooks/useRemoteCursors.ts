import { useEffect, useRef, type RefObject } from "react";
import type { editor as MonacoEditor } from "monaco-editor";

interface CursorUpdate {
  userId: string;
  userName: string;
  color: string;
  file: string;
  line: number;
  column: number;
}

interface SelectionUpdate {
  userId: string;
  color: string;
  file: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ensureCursorStyle(userId: string, color: string): string {
  const className = `remote-cursor-${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
  const lineClassName = `${className}-line`;
  const selClassName = `${className}-sel`;

  if (!document.getElementById(`style-${className}`)) {
    const style = document.createElement("style");
    style.id = `style-${className}`;
    style.textContent = `
      .${lineClassName} { border-left: 2px solid ${color}; margin-left: -1px; }
      .${selClassName} { background-color: ${hexToRgba(color, 0.2)}; }
    `;
    document.head.appendChild(style);
  }
  return className;
}

export function useRemoteCursors(
  editorRef: RefObject<MonacoEditor.IStandaloneCodeEditor | null>,
  monacoRef: RefObject<typeof import("monaco-editor") | null>,
  remoteCursors: Map<string, CursorUpdate>,
  remoteSelections: Map<string, SelectionUpdate>,
  currentFile: string | null
) {
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !currentFile) return;

    const newDecorations: MonacoEditor.IModelDeltaDecoration[] = [];

    remoteCursors.forEach((cursor) => {
      if (cursor.file !== currentFile) return;

      const className = ensureCursorStyle(cursor.userId, cursor.color);

      newDecorations.push({
        range: new monaco.Range(cursor.line, cursor.column, cursor.line, cursor.column + 1),
        options: {
          className: `${className}-line`,
          stickiness: 1 as MonacoEditor.TrackedRangeStickiness,
          hoverMessage: { value: cursor.userName },
        },
      });
    });

    remoteSelections.forEach((sel) => {
      if (sel.file !== currentFile) return;

      const className = ensureCursorStyle(sel.userId, sel.color);

      newDecorations.push({
        range: new monaco.Range(sel.startLine, sel.startCol, sel.endLine, sel.endCol),
        options: {
          className: `${className}-sel`,
          stickiness: 1 as MonacoEditor.TrackedRangeStickiness,
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );

    return () => {
      if (editor) {
        try {
          editor.deltaDecorations(decorationsRef.current, []);
        } catch {}
      }
    };
  }, [remoteCursors, remoteSelections, currentFile, editorRef, monacoRef]);
}
