import { create } from "zustand";

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
}

export interface CursorPosition {
  line: number;
  col: number;
}

interface EditorState {
  openTabs: EditorTab[];
  activeTabId: string | null;
  cursorPosition: CursorPosition;

  openFile: (file: { id: string; path: string; name: string; content: string; language?: string }) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  switchTab: (id: string) => void;
  setContent: (id: string, content: string) => void;
  markSaved: (id: string) => void;
  setCursorPosition: (position: CursorPosition) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  getActiveTab: () => EditorTab | undefined;
}

function getLanguageFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    md: "markdown",
    go: "go",
    rs: "rust",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    txt: "plaintext",
    xml: "xml",
    svg: "xml",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    dart: "dart",
    vue: "html",
    dockerfile: "dockerfile",
    graphql: "graphql",
    gql: "graphql",
    env: "plaintext",
    gitignore: "plaintext",
  };
  return map[ext] || "plaintext";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  cursorPosition: { line: 1, col: 1 },

  openFile: (file) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.id === file.id);
    if (existing) {
      set({ activeTabId: file.id });
      return;
    }
    const newTab: EditorTab = {
      id: file.id,
      path: file.path,
      name: file.name,
      content: file.content,
      language: file.language || getLanguageFromFilename(file.name),
      isModified: false,
    };
    set({
      openTabs: [...openTabs, newTab],
      activeTabId: file.id,
    });
  },

  closeTab: (id) => {
    const { openTabs, activeTabId } = get();
    const filtered = openTabs.filter((t) => t.id !== id);
    let newActiveId = activeTabId;
    if (activeTabId === id) {
      const closedIndex = openTabs.findIndex((t) => t.id === id);
      if (filtered.length > 0) {
        const nextIndex = Math.min(closedIndex, filtered.length - 1);
        newActiveId = filtered[nextIndex].id;
      } else {
        newActiveId = null;
      }
    }
    set({ openTabs: filtered, activeTabId: newActiveId });
  },

  closeOtherTabs: (id) => {
    const { openTabs } = get();
    const kept = openTabs.filter((t) => t.id === id);
    set({ openTabs: kept, activeTabId: kept.length > 0 ? id : null });
  },

  closeAllTabs: () => {
    set({ openTabs: [], activeTabId: null });
  },

  switchTab: (id) => {
    const { openTabs } = get();
    if (openTabs.some((t) => t.id === id)) {
      set({ activeTabId: id });
    }
  },

  setContent: (id, content) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === id ? { ...t, content, isModified: true } : t
      ),
    }));
  },

  markSaved: (id) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === id ? { ...t, isModified: false } : t
      ),
    }));
  },

  setCursorPosition: (position) => {
    set({ cursorPosition: position });
  },

  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = [...state.openTabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { openTabs: tabs };
    });
  },

  getActiveTab: () => {
    const { openTabs, activeTabId } = get();
    return openTabs.find((t) => t.id === activeTabId);
  },
}));
