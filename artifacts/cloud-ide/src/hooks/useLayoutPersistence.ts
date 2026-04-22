import { useCallback, useEffect, useRef } from "react";

const STORAGE_PREFIX = "codecloud:layout:";
const DEBOUNCE_MS = 1000;

export interface TabState {
  id: string;
  path: string;
  name: string;
}

export interface TerminalState {
  isOpen: boolean;
  height?: number;
}

export interface SplitEditorState {
  enabled: boolean;
  fileId?: string;
  sizes?: number[];
}

export interface WorkspaceLayout {
  openTabs: TabState[];
  activeFileId: string | null;
  selectedFolderId: string | null;
  expandedFolders: string[];
  sidebarWidth?: number;
  editorPanelSizes?: number[];
  terminal: TerminalState;
  splitEditor: SplitEditorState;
  showAiChat: boolean;
  showPreview: boolean;
  previewUrl?: string;
  theme?: "dark" | "light";
  lastAccessed: number;
}

const DEFAULT_LAYOUT: WorkspaceLayout = {
  openTabs: [],
  activeFileId: null,
  selectedFolderId: null,
  expandedFolders: [],
  terminal: { isOpen: false },
  splitEditor: { enabled: false },
  showAiChat: false,
  showPreview: false,
  lastAccessed: Date.now(),
};

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function loadLayout(projectId: string): WorkspaceLayout | null {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return { ...DEFAULT_LAYOUT, ...parsed };
  } catch {
    return null;
  }
}

function saveLayout(projectId: string, layout: WorkspaceLayout): void {
  try {
    layout.lastAccessed = Date.now();
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(layout));
  } catch {
    // storage full or unavailable
  }
}

function clearLayout(projectId: string): void {
  try {
    localStorage.removeItem(getStorageKey(projectId));
  } catch {
    // ignore
  }
}

function cleanupOldLayouts(maxAge = 30 * 24 * 60 * 60 * 1000): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed.lastAccessed && now - parsed.lastAccessed > maxAge) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function useLayoutPersistence(projectId: string | undefined) {
  const layoutRef = useRef<WorkspaceLayout>(DEFAULT_LAYOUT);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const restore = useCallback((): WorkspaceLayout => {
    if (!projectId) return DEFAULT_LAYOUT;
    const saved = loadLayout(projectId);
    if (saved) {
      layoutRef.current = saved;
      return saved;
    }
    return DEFAULT_LAYOUT;
  }, [projectId]);

  const persist = useCallback(() => {
    if (!projectId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveLayout(projectId, layoutRef.current);
    }, DEBOUNCE_MS);
  }, [projectId]);

  const updateLayout = useCallback(
    (updates: Partial<WorkspaceLayout>) => {
      layoutRef.current = { ...layoutRef.current, ...updates };
      persist();
    },
    [persist]
  );

  const setOpenTabs = useCallback(
    (tabs: TabState[]) => updateLayout({ openTabs: tabs }),
    [updateLayout]
  );

  const setActiveFileId = useCallback(
    (fileId: string | null) => updateLayout({ activeFileId: fileId }),
    [updateLayout]
  );

  const setExpandedFolders = useCallback(
    (folders: string[]) => updateLayout({ expandedFolders: folders }),
    [updateLayout]
  );

  const setTerminalState = useCallback(
    (terminal: TerminalState) => updateLayout({ terminal }),
    [updateLayout]
  );

  const setSplitEditorState = useCallback(
    (splitEditor: SplitEditorState) => updateLayout({ splitEditor }),
    [updateLayout]
  );

  const setShowAiChat = useCallback(
    (show: boolean) => updateLayout({ showAiChat: show }),
    [updateLayout]
  );

  const setShowPreview = useCallback(
    (show: boolean) => updateLayout({ showPreview: show }),
    [updateLayout]
  );

  const setEditorPanelSizes = useCallback(
    (sizes: number[]) => updateLayout({ editorPanelSizes: sizes }),
    [updateLayout]
  );

  const setSidebarWidth = useCallback(
    (width: number) => updateLayout({ sidebarWidth: width }),
    [updateLayout]
  );

  const setTheme = useCallback(
    (theme: "dark" | "light") => updateLayout({ theme }),
    [updateLayout]
  );

  const reset = useCallback(() => {
    if (!projectId) return;
    layoutRef.current = { ...DEFAULT_LAYOUT };
    clearLayout(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || initializedRef.current) return;
    initializedRef.current = true;
    cleanupOldLayouts();
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (projectId) {
        saveLayout(projectId, layoutRef.current);
      }
    };
  }, [projectId]);

  return {
    restore,
    updateLayout,
    setOpenTabs,
    setActiveFileId,
    setExpandedFolders,
    setTerminalState,
    setSplitEditorState,
    setShowAiChat,
    setShowPreview,
    setEditorPanelSizes,
    setSidebarWidth,
    setTheme,
    reset,
    layout: layoutRef,
  };
}
