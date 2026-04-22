export interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: "language" | "theme" | "tool" | "formatter" | "linter";
  enabled: boolean;
  config: Record<string, any>;
  installedAt: Date;
}

export interface ExtensionAPI {
  name: string;
  version: string;
  endpoints: { method: string; path: string; description: string }[];
}

class ExtensionsApiService {
  private extensions: Map<string, Extension> = new Map();

  install(data: Omit<Extension, "id" | "enabled" | "config" | "installedAt">): Extension {
    const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext: Extension = { ...data, id, enabled: true, config: {}, installedAt: new Date() };
    this.extensions.set(id, ext);
    return ext;
  }

  uninstall(id: string): boolean { return this.extensions.delete(id); }
  get(id: string): Extension | null { return this.extensions.get(id) || null; }
  list(category?: Extension["category"]): Extension[] {
    const all = Array.from(this.extensions.values());
    return category ? all.filter(e => e.category === category) : all;
  }

  enable(id: string): boolean { const e = this.extensions.get(id); if (!e) return false; e.enabled = true; return true; }
  disable(id: string): boolean { const e = this.extensions.get(id); if (!e) return false; e.enabled = false; return true; }

  configure(id: string, config: Record<string, any>): Extension | null {
    const e = this.extensions.get(id); if (!e) return null; Object.assign(e.config, config); return e;
  }

  getAPI(): ExtensionAPI {
    return {
      name: "CodeCloud Extensions API", version: "1.0.0",
      endpoints: [
        { method: "GET", path: "/extensions", description: "List all extensions" },
        { method: "POST", path: "/extensions", description: "Install extension" },
        { method: "DELETE", path: "/extensions/:id", description: "Uninstall extension" },
        { method: "PUT", path: "/extensions/:id/config", description: "Configure extension" },
      ],
    };
  }
}

export const extensionsApiService = new ExtensionsApiService();
