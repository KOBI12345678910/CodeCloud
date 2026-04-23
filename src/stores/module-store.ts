import { create } from "zustand";
import { callRPC } from "@/lib/supabase";
import type { Module, ModuleCategory, TenantModule } from "@shared/types";

interface ModuleState {
  modules: Module[];
  categories: ModuleCategory[];
  installedModules: TenantModule[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: string | null;

  fetchModules: (search?: string, category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchInstalled: (tenantId: string) => Promise<void>;
  installModule: (tenantId: string, moduleKey: string) => Promise<void>;
  setSearch: (query: string) => void;
  setCategory: (category: string | null) => void;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  categories: [],
  installedModules: [],
  isLoading: false,
  searchQuery: "",
  selectedCategory: null,

  fetchModules: async (search, category) => {
    set({ isLoading: true });
    try {
      const data = await callRPC<Module[]>("get_modules", {
        p_search: search || null,
        p_category: category || null,
        p_limit: 50,
        p_offset: 0,
      });
      set({ modules: Array.isArray(data) ? data : [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const data = await callRPC<ModuleCategory[]>("get_module_categories");
      set({ categories: Array.isArray(data) ? data : [] });
    } catch { /* ignore */ }
  },

  fetchInstalled: async (tenantId) => {
    try {
      const data = await callRPC<TenantModule[]>("get_installed_modules", { p_tenant_id: tenantId });
      set({ installedModules: Array.isArray(data) ? data : [] });
    } catch { /* ignore */ }
  },

  installModule: async (tenantId, moduleKey) => {
    await callRPC("install_module", { p_tenant_id: tenantId, p_module_key: moduleKey });
    await get().fetchInstalled(tenantId);
  },

  setSearch: (query) => set({ searchQuery: query }),
  setCategory: (category) => set({ selectedCategory: category }),
}));
