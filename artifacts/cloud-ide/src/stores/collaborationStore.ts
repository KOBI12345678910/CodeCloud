import { create } from "zustand";

export interface Collaborator {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  permission: "owner" | "editor" | "viewer";
  joinedAt: string;
}

export interface CursorInfo {
  line: number;
  col: number;
  color: string;
  name: string;
  fileId?: string;
  lastActive: number;
}

interface CollaborationState {
  collaborators: Collaborator[];
  onlineUsers: string[];
  cursors: Map<string, CursorInfo>;
  isConnected: boolean;
  projectId: string | null;

  connect: (projectId: string) => void;
  disconnect: () => void;
  addCollaborator: (userId: string, permission: "owner" | "editor" | "viewer") => void;
  removeCollaborator: (userId: string) => void;
  updateCursor: (userId: string, position: { line: number; col: number; fileId?: string }) => void;
  removeCursor: (userId: string) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
}

const CURSOR_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ec4899", "#eab308", "#14b8a6", "#ef4444",
  "#6366f1", "#06b6d4", "#84cc16", "#f43f5e",
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  collaborators: [],
  onlineUsers: [],
  cursors: new Map(),
  isConnected: false,
  projectId: null,

  connect: (projectId) => {
    set({ isConnected: true, projectId });
  },

  disconnect: () => {
    set({
      isConnected: false,
      projectId: null,
      onlineUsers: [],
      cursors: new Map(),
    });
  },

  addCollaborator: (userId, permission) => {
    set((state) => {
      if (state.collaborators.some((c) => c.userId === userId)) return state;
      return {
        collaborators: [
          ...state.collaborators,
          {
            userId,
            username: userId,
            permission,
            joinedAt: new Date().toISOString(),
          },
        ],
      };
    });
  },

  removeCollaborator: (userId) => {
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.userId !== userId),
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      cursors: (() => {
        const next = new Map(state.cursors);
        next.delete(userId);
        return next;
      })(),
    }));
  },

  updateCursor: (userId, position) => {
    set((state) => {
      const next = new Map(state.cursors);
      const existing = next.get(userId);
      next.set(userId, {
        line: position.line,
        col: position.col,
        color: existing?.color || getColorForUser(userId),
        name: existing?.name || userId,
        fileId: position.fileId,
        lastActive: Date.now(),
      });
      return { cursors: next };
    });
  },

  removeCursor: (userId) => {
    set((state) => {
      const next = new Map(state.cursors);
      next.delete(userId);
      return { cursors: next };
    });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUsers: userIds });
  },

  setCollaborators: (collaborators) => {
    set({ collaborators });
  },
}));
