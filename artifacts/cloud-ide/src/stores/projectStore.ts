import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  content?: string | null;
  binaryUrl?: string | null;
  sizeBytes: number;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
  language: string;
  templateId?: string | null;
  isPublic: boolean;
  forkedFromId?: string | null;
  runCommand?: string | null;
  entryFile: string;
  containerStatus: "stopped" | "starting" | "running" | "error";
  containerId?: string | null;
  deployedUrl?: string | null;
  lastAccessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  files: ProjectFile[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (data: { name: string; slug: string; language: string; description?: string; isPublic?: boolean; templateId?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "description" | "isPublic" | "runCommand" | "entryFile">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  fetchFiles: (projectId: string) => Promise<void>;
  createFile: (projectId: string, path: string, content: string) => Promise<ProjectFile>;
  updateFile: (projectId: string, fileId: string, content: string) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  moveFile: (projectId: string, fileId: string, newPath: string) => Promise<void>;

  clearError: () => void;
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  files: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{ projects: Project[] }>("/api/projects");
      set({ projects: data.projects, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
      set((state) => ({
        projects: [result.project, ...state.projects],
        isLoading: false,
      }));
      return result.project;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateProject: async (id, data) => {
    set({ error: null });
    try {
      const result = await apiRequest<{ project: Project }>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? result.project : p)),
        currentProject: state.currentProject?.id === id ? result.project : state.currentProject,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteProject: async (id) => {
    set({ error: null });
    try {
      await apiRequest(`/api/projects/${id}`, { method: "DELETE" });
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  fetchFiles: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{ files: ProjectFile[] }>(`/api/projects/${projectId}/files`);
      set({ files: data.files, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createFile: async (projectId, path, content) => {
    set({ error: null });
    try {
      const name = path.split("/").pop() || path;
      const isDirectory = false;
      const result = await apiRequest<{ file: ProjectFile }>(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: JSON.stringify({ path, name, content, isDirectory }),
      });
      set((state) => ({
        files: [...state.files, result.file],
      }));
      return result.file;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateFile: async (projectId, fileId, content) => {
    set({ error: null });
    try {
      const result = await apiRequest<{ file: ProjectFile }>(`/api/projects/${projectId}/files/${fileId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? result.file : f)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteFile: async (projectId, fileId) => {
    set({ error: null });
    try {
      await apiRequest(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  moveFile: async (projectId, fileId, newPath) => {
    set({ error: null });
    try {
      const newName = newPath.split("/").pop() || newPath;
      const result = await apiRequest<{ file: ProjectFile }>(`/api/projects/${projectId}/files/${fileId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ newPath, newName }),
      });
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? result.file : f)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
