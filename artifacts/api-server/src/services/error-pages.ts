export interface ErrorPageConfig {
  id: string;
  projectId: string;
  statusCode: number;
  title: string;
  message: string;
  template: "minimal" | "branded" | "playful" | "technical";
  customHtml: string | null;
  customCss: string | null;
  showBackLink: boolean;
  showStatusCode: boolean;
  showContactLink: boolean;
  contactEmail: string | null;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  enabled: boolean;
  updatedAt: string;
}

const DEFAULT_TEMPLATES: Record<string, Omit<ErrorPageConfig, "id" | "projectId" | "updatedAt">> = {
  "404-minimal": {
    statusCode: 404, title: "Page Not Found", message: "The page you're looking for doesn't exist or has been moved.",
    template: "minimal", customHtml: null, customCss: null, showBackLink: true, showStatusCode: true,
    showContactLink: false, contactEmail: null, backgroundColor: "#0a0a0a", textColor: "#ffffff", accentColor: "#3b82f6", enabled: true,
  },
  "500-minimal": {
    statusCode: 500, title: "Internal Server Error", message: "Something went wrong on our end. Please try again later.",
    template: "minimal", customHtml: null, customCss: null, showBackLink: true, showStatusCode: true,
    showContactLink: true, contactEmail: "support@example.com", backgroundColor: "#0a0a0a", textColor: "#ffffff", accentColor: "#ef4444", enabled: true,
  },
  "503-minimal": {
    statusCode: 503, title: "Service Unavailable", message: "We're performing maintenance. We'll be back shortly.",
    template: "minimal", customHtml: null, customCss: null, showBackLink: false, showStatusCode: true,
    showContactLink: false, contactEmail: null, backgroundColor: "#0a0a0a", textColor: "#ffffff", accentColor: "#f59e0b", enabled: true,
  },
};

const pages: ErrorPageConfig[] = [
  { id: "ep1", projectId: "p1", ...DEFAULT_TEMPLATES["404-minimal"], updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "ep2", projectId: "p1", ...DEFAULT_TEMPLATES["500-minimal"], updatedAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "ep3", projectId: "p1", ...DEFAULT_TEMPLATES["503-minimal"], updatedAt: new Date(Date.now() - 259200000).toISOString() },
];

export class ErrorPagesService {
  async list(projectId: string): Promise<ErrorPageConfig[]> {
    return pages.filter(p => p.projectId === projectId || p.projectId === "p1");
  }

  async get(id: string): Promise<ErrorPageConfig | undefined> {
    return pages.find(p => p.id === id);
  }

  async upsert(projectId: string, data: Partial<ErrorPageConfig>): Promise<ErrorPageConfig> {
    const existing = pages.find(p => p.projectId === projectId && p.statusCode === data.statusCode);
    if (existing) {
      Object.assign(existing, data, { updatedAt: new Date().toISOString() });
      return existing;
    }
    const page: ErrorPageConfig = {
      id: `ep${Date.now()}`, projectId, statusCode: data.statusCode || 404,
      title: data.title || "Error", message: data.message || "An error occurred.",
      template: data.template || "minimal", customHtml: data.customHtml || null, customCss: data.customCss || null,
      showBackLink: data.showBackLink ?? true, showStatusCode: data.showStatusCode ?? true,
      showContactLink: data.showContactLink ?? false, contactEmail: data.contactEmail || null,
      backgroundColor: data.backgroundColor || "#0a0a0a", textColor: data.textColor || "#ffffff",
      accentColor: data.accentColor || "#3b82f6", enabled: data.enabled ?? true,
      updatedAt: new Date().toISOString(),
    };
    pages.push(page);
    return page;
  }

  async delete(id: string): Promise<boolean> {
    const idx = pages.findIndex(p => p.id === id);
    if (idx < 0) return false;
    pages.splice(idx, 1);
    return true;
  }

  async getTemplates(): Promise<Record<string, Omit<ErrorPageConfig, "id" | "projectId" | "updatedAt">>> {
    return DEFAULT_TEMPLATES;
  }
}

export const errorPagesService = new ErrorPagesService();
