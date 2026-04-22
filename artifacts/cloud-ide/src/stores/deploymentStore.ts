import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "";

export type DeploymentStatus = "queued" | "building" | "deploying" | "live" | "failed" | "stopped";

export interface Deployment {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  url?: string | null;
  commitHash?: string | null;
  branch?: string | null;
  environment: "production" | "staging" | "preview";
  buildDuration?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeploymentState {
  deployments: Deployment[];
  currentDeployment: Deployment | null;
  isDeploying: boolean;
  buildLogs: string;

  deploy: (projectId: string) => Promise<Deployment>;
  stopDeployment: (id: string) => Promise<void>;
  redeployment: (id: string) => Promise<Deployment>;
  fetchDeployments: (projectId: string) => Promise<void>;
  fetchLogs: (deploymentId: string) => Promise<void>;
  setStatus: (id: string, status: DeploymentStatus) => void;
  clearLogs: () => void;
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

export const useDeploymentStore = create<DeploymentState>((set, get) => ({
  deployments: [],
  currentDeployment: null,
  isDeploying: false,
  buildLogs: "",

  deploy: async (projectId) => {
    set({ isDeploying: true, buildLogs: "" });
    try {
      const result = await apiRequest<{ deployment: Deployment }>(`/api/projects/${projectId}/deployments`, {
        method: "POST",
      });
      set((state) => ({
        deployments: [result.deployment, ...state.deployments],
        currentDeployment: result.deployment,
        isDeploying: result.deployment.status !== "live" && result.deployment.status !== "failed",
      }));
      return result.deployment;
    } catch (err: any) {
      set({ isDeploying: false, buildLogs: get().buildLogs + `\nError: ${err.message}` });
      throw err;
    }
  },

  stopDeployment: async (id) => {
    try {
      await apiRequest(`/api/deployments/${id}/stop`, { method: "POST" });
      set((state) => ({
        deployments: state.deployments.map((d) =>
          d.id === id ? { ...d, status: "stopped" as DeploymentStatus } : d
        ),
        currentDeployment:
          state.currentDeployment?.id === id
            ? { ...state.currentDeployment, status: "stopped" as DeploymentStatus }
            : state.currentDeployment,
        isDeploying: false,
      }));
    } catch {
      // silently handle
    }
  },

  redeployment: async (id) => {
    set({ isDeploying: true, buildLogs: "" });
    try {
      const result = await apiRequest<{ deployment: Deployment }>(`/api/deployments/${id}/redeploy`, {
        method: "POST",
      });
      set((state) => ({
        deployments: [result.deployment, ...state.deployments],
        currentDeployment: result.deployment,
        isDeploying: result.deployment.status !== "live" && result.deployment.status !== "failed",
      }));
      return result.deployment;
    } catch (err: any) {
      set({ isDeploying: false, buildLogs: get().buildLogs + `\nError: ${err.message}` });
      throw err;
    }
  },

  fetchDeployments: async (projectId) => {
    try {
      const data = await apiRequest<{ deployments: Deployment[] }>(`/api/projects/${projectId}/deployments`);
      const sorted = data.deployments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      set({
        deployments: sorted,
        currentDeployment: sorted.length > 0 ? sorted[0] : null,
      });
    } catch {
      // silently handle
    }
  },

  fetchLogs: async (deploymentId) => {
    try {
      const data = await apiRequest<{ logs: string }>(`/api/deployments/${deploymentId}/logs`);
      set({ buildLogs: data.logs });
    } catch {
      set({ buildLogs: "Failed to fetch build logs." });
    }
  },

  setStatus: (id, status) => {
    set((state) => ({
      deployments: state.deployments.map((d) =>
        d.id === id ? { ...d, status } : d
      ),
      currentDeployment:
        state.currentDeployment?.id === id
          ? { ...state.currentDeployment, status }
          : state.currentDeployment,
      isDeploying: status === "building" || status === "deploying" || status === "queued",
    }));
  },

  clearLogs: () => set({ buildLogs: "" }),
}));
