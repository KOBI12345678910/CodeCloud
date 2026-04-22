export interface EmbedConfig {
  projectId: string;
  theme: "light" | "dark" | "auto";
  showHeader: boolean;
  showFooter: boolean;
  showLineNumbers: boolean;
  height: string;
  width: string;
  file: string | null;
  readOnly: boolean;
  autoRun: boolean;
}

class EmbedWidgetService {
  private configs: Map<string, EmbedConfig> = new Map();

  createEmbed(config: EmbedConfig): { id: string; config: EmbedConfig; embedCode: string; iframeUrl: string } {
    const id = `embed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.configs.set(id, config);
    const iframeUrl = `/embed/${id}?theme=${config.theme}`;
    const embedCode = `<iframe src="${iframeUrl}" width="${config.width}" height="${config.height}" frameborder="0" sandbox="allow-scripts allow-same-origin"></iframe>`;
    return { id, config, embedCode, iframeUrl };
  }

  getEmbed(id: string): EmbedConfig | null { return this.configs.get(id) || null; }
  updateEmbed(id: string, updates: Partial<EmbedConfig>): EmbedConfig | null {
    const c = this.configs.get(id); if (!c) return null; Object.assign(c, updates); return c;
  }
  deleteEmbed(id: string): boolean { return this.configs.delete(id); }
  list(): { id: string; config: EmbedConfig }[] { return Array.from(this.configs.entries()).map(([id, config]) => ({ id, config })); }
}

export const embedWidgetService = new EmbedWidgetService();
