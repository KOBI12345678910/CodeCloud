import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  plan: string;
  avatarUrl?: string | null;
  authProvider?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  loginWithGoogle: (code: string) => Promise<void>;
  loginWithGithub: (code: string, state: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem("refreshToken");
  } catch {
    return null;
  }
}

function storeTokens(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  } catch {
    // storage unavailable
  }
}

function clearStoredTokens() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch {
    // storage unavailable
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

async function authenticatedFetch(path: string, token: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: data.error || "Login failed" });
        return;
      }
      storeTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: "Unable to connect to the server" });
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: data.error || "Registration failed" });
        return;
      }
      storeTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: "Unable to connect to the server" });
    }
  },

  logout: async () => {
    const { token, refreshToken } = get();
    set({ isLoading: true });
    try {
      if (token) {
        await authenticatedFetch("/auth/logout", token, {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // logout should always succeed locally
    } finally {
      clearStoredTokens();
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshAuth: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;

    try {
      const res = await apiFetch("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        clearStoredTokens();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        return false;
      }
      storeTokens(data.accessToken, data.refreshToken);
      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return true;
    } catch {
      return false;
    }
  },

  loginWithGoogle: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch("/auth/google/callback", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: data.error || "Google login failed" });
        return;
      }
      storeTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: "Google authentication failed" });
    }
  },

  loginWithGithub: async (code: string, state: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch("/auth/github/callback", {
        method: "POST",
        body: JSON.stringify({ code, state }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: data.error || "GitHub login failed" });
        return;
      }
      storeTokens(data.accessToken, data.refreshToken);
      set({
        user: data.user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: "GitHub authentication failed" });
    }
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await authenticatedFetch("/auth/me", token);
      if (res.ok) {
        const user = await res.json();
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      if (res.status === 401) {
        const refreshed = await get().refreshAuth();
        if (refreshed) {
          const newToken = get().token;
          if (newToken) {
            const retryRes = await authenticatedFetch("/auth/me", newToken);
            if (retryRes.ok) {
              const user = await retryRes.json();
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }
        }
      }

      clearStoredTokens();
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: AuthUser) => set({ user }),
}));
