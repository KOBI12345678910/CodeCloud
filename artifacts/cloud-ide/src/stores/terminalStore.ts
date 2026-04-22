import { create } from "zustand";

export interface TerminalSession {
  id: string;
  name: string;
  projectId: string;
  isConnected: boolean;
  scrollback: string[];
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;

  createSession: (projectId: string, name?: string) => string;
  closeSession: (id: string) => void;
  switchSession: (id: string) => void;
  write: (id: string, data: string) => void;
  resize: (id: string, cols: number, rows: number) => void;
  clearTerminal: (id: string) => void;
  setConnected: (id: string, connected: boolean) => void;
  renameSession: (id: string, name: string) => void;
}

let sessionCounter = 0;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (projectId, name?) => {
    sessionCounter++;
    const id = `session-${sessionCounter}`;
    const session: TerminalSession = {
      id,
      name: name || `bash${sessionCounter > 1 ? ` (${sessionCounter})` : ""}`,
      projectId,
      isConnected: false,
      scrollback: [],
    };
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: id,
    }));
    return id;
  },

  closeSession: (id) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === id) {
        const closedIndex = state.sessions.findIndex((s) => s.id === id);
        if (filtered.length > 0) {
          const nextIndex = Math.min(closedIndex, filtered.length - 1);
          newActiveId = filtered[nextIndex].id;
        } else {
          newActiveId = null;
        }
      }
      return { sessions: filtered, activeSessionId: newActiveId };
    });
  },

  switchSession: (id) => {
    const { sessions } = get();
    if (sessions.some((s) => s.id === id)) {
      set({ activeSessionId: id });
    }
  },

  write: (id, data) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id
          ? { ...s, scrollback: [...s.scrollback, data].slice(-5000) }
          : s
      ),
    }));
  },

  resize: (_id, _cols, _rows) => {},

  clearTerminal: (id) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, scrollback: [] } : s
      ),
    }));
  },

  setConnected: (id, connected) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, isConnected: connected } : s
      ),
    }));
  },

  renameSession: (id, name) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, name } : s
      ),
    }));
  },
}));
