import { create } from "zustand";
import { callEdgeFunction } from "@/lib/supabase";
import type { AuthResponse, Tenant, TenantUser } from "@shared/types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthResponse["user"] | null;
  tenant: AuthResponse["tenant"] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; company_name?: string; plan?: string }) => Promise<void>;
  logout: () => void;
  setError: (error: string | null) => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await callEdgeFunction<AuthResponse>("login", { email, password });
      set({
        token: res.token,
        refreshToken: res.refresh_token,
        user: res.user,
        tenant: res.tenant,
        isAuthenticated: true,
        isLoading: false,
      });
      if (res.token) localStorage.setItem("kbos_token", res.token);
      if (res.refresh_token) localStorage.setItem("kbos_refresh", res.refresh_token);
      localStorage.setItem("kbos_user", JSON.stringify(res.user));
      if (res.tenant) localStorage.setItem("kbos_tenant", JSON.stringify(res.tenant));
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Login failed" });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await callEdgeFunction<AuthResponse>("register", data);
      set({
        token: res.token,
        refreshToken: res.refresh_token,
        user: res.user,
        tenant: res.tenant,
        isAuthenticated: true,
        isLoading: false,
      });
      if (res.token) localStorage.setItem("kbos_token", res.token);
      if (res.refresh_token) localStorage.setItem("kbos_refresh", res.refresh_token);
      localStorage.setItem("kbos_user", JSON.stringify(res.user));
      if (res.tenant) localStorage.setItem("kbos_tenant", JSON.stringify(res.tenant));
    } catch (err: any) {
      set({ isLoading: false, error: err.message || "Registration failed" });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("kbos_token");
    localStorage.removeItem("kbos_refresh");
    localStorage.removeItem("kbos_user");
    localStorage.removeItem("kbos_tenant");
    set({ token: null, refreshToken: null, user: null, tenant: null, isAuthenticated: false });
  },

  setError: (error) => set({ error }),

  restoreSession: () => {
    const token = localStorage.getItem("kbos_token");
    const userStr = localStorage.getItem("kbos_user");
    const tenantStr = localStorage.getItem("kbos_tenant");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const tenant = tenantStr ? JSON.parse(tenantStr) : null;
        set({ token, user, tenant, isAuthenticated: true });
      } catch { /* ignore */ }
    }
  },
}));
