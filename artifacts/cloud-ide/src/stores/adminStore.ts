import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  projectCount?: number;
}

export interface AdminProject {
  id: string;
  name: string;
  slug: string;
  language: string;
  ownerId: string;
  ownerUsername?: string;
  isPublic: boolean;
  containerStatus: string;
  createdAt: string;
}

export interface AdminDeployment {
  id: string;
  projectId: string;
  projectName?: string;
  status: string;
  environment: string;
  createdAt: string;
}

export interface AdminStats {
  signupsToday: number;
  activeUsers: number;
  totalRevenue: number;
  cpuUsage: number;
  memoryUsage: number;
  totalProjects: number;
  totalDeployments: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  username?: string;
  action: string;
  target: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AdminState {
  users: AdminUser[];
  totalUsers: number;
  projects: AdminProject[];
  totalProjects: number;
  deployments: AdminDeployment[];
  stats: AdminStats;
  auditLog: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: (page?: number, search?: string) => Promise<void>;
  fetchProjects: (page?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAuditLog: (filters?: { userId?: string; action?: string; from?: string; to?: string }) => Promise<void>;
  banUser: (id: string) => Promise<void>;
  unbanUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
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

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  totalUsers: 0,
  projects: [],
  totalProjects: 0,
  deployments: [],
  stats: {
    signupsToday: 0,
    activeUsers: 0,
    totalRevenue: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    totalProjects: 0,
    totalDeployments: 0,
  },
  auditLog: [],
  isLoading: false,
  error: null,

  fetchUsers: async (page = 1, search = "") => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const data = await apiRequest<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`);
      set({ users: data.users, totalUsers: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProjects: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      const data = await apiRequest<{ projects: AdminProject[]; total: number }>(`/api/admin/projects?${params}`);
      set({ projects: data.projects, totalProjects: data.total, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const data = await apiRequest<AdminStats>("/api/admin/stats");
      set({ stats: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchAuditLog: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.set("userId", filters.userId);
      if (filters?.action) params.set("action", filters.action);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      const data = await apiRequest<{ auditLog: AuditLogEntry[] }>(`/api/admin/audit-log?${params}`);
      set({ auditLog: data.auditLog, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  banUser: async (id) => {
    try {
      await apiRequest(`/api/admin/users/${id}/ban`, { method: "POST" });
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, isBanned: true } : u)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  unbanUser: async (id) => {
    try {
      await apiRequest(`/api/admin/users/${id}/unban`, { method: "POST" });
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, isBanned: false } : u)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteUser: async (id) => {
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        totalUsers: state.totalUsers - 1,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteProject: async (id) => {
    try {
      await apiRequest(`/api/admin/projects/${id}`, { method: "DELETE" });
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        totalProjects: state.totalProjects - 1,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
