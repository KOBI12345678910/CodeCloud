import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface SearchResult {
  id: string;
  type: "project" | "file";
  name: string;
  path?: string;
  description?: string | null;
  language?: string;
  matchLine?: number;
  matchPreview?: string;
  projectId?: string;
}

export interface SearchFilters {
  language: string;
  isPublic: boolean | null;
  sortBy: "relevance" | "recent" | "stars" | "name";
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  filters: SearchFilters;

  searchProjects: (query: string) => Promise<void>;
  searchFiles: (projectId: string, query: string) => Promise<void>;
  setQuery: (query: string) => void;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearSearch: () => void;
}

async function apiRequest<T>(url: string): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: [],
  isSearching: false,
  filters: {
    language: "",
    isPublic: null,
    sortBy: "relevance",
  },

  searchProjects: async (query) => {
    set({ query, isSearching: true, results: [] });
    try {
      const { filters } = get();
      const params = new URLSearchParams({ q: query });
      if (filters.language) params.set("language", filters.language);
      if (filters.isPublic !== null) params.set("isPublic", String(filters.isPublic));
      if (filters.sortBy) params.set("sortBy", filters.sortBy);

      const data = await apiRequest<{ projects: Array<{ id: string; name: string; description?: string | null; language: string }> }>(
        `/api/explore?${params}`
      );
      const results: SearchResult[] = data.projects.map((p) => ({
        id: p.id,
        type: "project" as const,
        name: p.name,
        description: p.description,
        language: p.language,
      }));
      set({ results, isSearching: false });
    } catch {
      set({ results: [], isSearching: false });
    }
  },

  searchFiles: async (projectId, query) => {
    set({ query, isSearching: true, results: [] });
    try {
      const data = await apiRequest<{ files: Array<{ id: string; name: string; path: string; content?: string | null }> }>(
        `/api/projects/${projectId}/files`
      );
      const lowerQuery = query.toLowerCase();
      const results: SearchResult[] = data.files
        .filter((f) => {
          if (f.name.toLowerCase().includes(lowerQuery)) return true;
          if (f.content && f.content.toLowerCase().includes(lowerQuery)) return true;
          return false;
        })
        .map((f) => {
          let matchLine: number | undefined;
          let matchPreview: string | undefined;
          if (f.content) {
            const lines = f.content.split("\n");
            const idx = lines.findIndex((l) => l.toLowerCase().includes(lowerQuery));
            if (idx >= 0) {
              matchLine = idx + 1;
              matchPreview = lines[idx].trim().substring(0, 200);
            }
          }
          return {
            id: f.id,
            type: "file" as const,
            name: f.name,
            path: f.path,
            projectId,
            matchLine,
            matchPreview,
          };
        });
      set({ results, isSearching: false });
    } catch {
      set({ results: [], isSearching: false });
    }
  },

  setQuery: (query) => set({ query }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearSearch: () =>
    set({
      query: "",
      results: [],
      isSearching: false,
      filters: { language: "", isPublic: null, sortBy: "relevance" },
    }),
}));
