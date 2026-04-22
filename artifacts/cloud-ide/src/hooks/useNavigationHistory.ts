import { useState, useCallback } from "react";

export interface NavigationEntry {
  file: string;
  line: number;
  column: number;
  timestamp: Date;
}

export interface Bookmark {
  id: string;
  file: string;
  line: number;
  label: string;
  createdAt: Date;
}

export interface UseNavigationHistoryReturn {
  history: NavigationEntry[];
  currentIndex: number;
  bookmarks: Bookmark[];
  recentFiles: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  push: (file: string, line: number, column?: number) => void;
  goBack: () => NavigationEntry | null;
  goForward: () => NavigationEntry | null;
  current: () => NavigationEntry | null;
  addBookmark: (file: string, line: number, label: string) => void;
  removeBookmark: (id: string) => void;
  clearHistory: () => void;
}

export function useNavigationHistory(maxHistory = 100): UseNavigationHistoryReturn {
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const push = useCallback((file: string, line: number, column = 1) => {
    const entry: NavigationEntry = { file, line, column, timestamp: new Date() };
    setHistory(prev => {
      const newHistory = [...prev.slice(0, currentIndex + 1), entry];
      if (newHistory.length > maxHistory) newHistory.shift();
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f !== file);
      return [file, ...filtered].slice(0, 20);
    });
  }, [currentIndex, maxHistory]);

  const goBack = useCallback((): NavigationEntry | null => {
    if (currentIndex <= 0) return null;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex] || null;
  }, [currentIndex, history]);

  const goForward = useCallback((): NavigationEntry | null => {
    if (currentIndex >= history.length - 1) return null;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex] || null;
  }, [currentIndex, history]);

  const current = useCallback((): NavigationEntry | null => {
    return history[currentIndex] || null;
  }, [currentIndex, history]);

  const addBookmark = useCallback((file: string, line: number, label: string) => {
    setBookmarks(prev => [
      ...prev,
      { id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file, line, label, createdAt: new Date() },
    ]);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    history,
    currentIndex,
    bookmarks,
    recentFiles,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < history.length - 1,
    push,
    goBack,
    goForward,
    current,
    addBookmark,
    removeBookmark,
    clearHistory,
  };
}
