export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  layout: {
    sidebar: { visible: boolean; width: number; position: "left" | "right" };
    terminal: { visible: boolean; height: number };
    editor: { splitCount: number; orientation: "horizontal" | "vertical" };
    preview: { visible: boolean; width: number };
    panels: { name: string; visible: boolean; position: string }[];
  };
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

class LayoutPresetsService {
  private presets: Map<string, LayoutPreset> = new Map();

  constructor() {
    const defaults: Omit<LayoutPreset, "id" | "createdAt">[] = [
      { name: "Default", description: "Standard IDE layout", layout: { sidebar: { visible: true, width: 250, position: "left" }, terminal: { visible: true, height: 200 }, editor: { splitCount: 1, orientation: "horizontal" }, preview: { visible: false, width: 400 }, panels: [] }, isDefault: true, createdBy: "system" },
      { name: "Focus Mode", description: "Editor only, no distractions", layout: { sidebar: { visible: false, width: 250, position: "left" }, terminal: { visible: false, height: 200 }, editor: { splitCount: 1, orientation: "horizontal" }, preview: { visible: false, width: 400 }, panels: [] }, isDefault: true, createdBy: "system" },
      { name: "Full Stack", description: "Editor + terminal + preview", layout: { sidebar: { visible: true, width: 200, position: "left" }, terminal: { visible: true, height: 250 }, editor: { splitCount: 2, orientation: "vertical" }, preview: { visible: true, width: 500 }, panels: [] }, isDefault: true, createdBy: "system" },
    ];
    for (const p of defaults) { const id = `preset-${Math.random().toString(36).slice(2, 8)}`; this.presets.set(id, { ...p, id, createdAt: new Date() }); }
  }

  list(): LayoutPreset[] { return Array.from(this.presets.values()); }
  get(id: string): LayoutPreset | null { return this.presets.get(id) || null; }

  create(data: Omit<LayoutPreset, "id" | "createdAt" | "isDefault">): LayoutPreset {
    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const preset: LayoutPreset = { ...data, id, isDefault: false, createdAt: new Date() };
    this.presets.set(id, preset);
    return preset;
  }

  update(id: string, updates: Partial<Pick<LayoutPreset, "name" | "description" | "layout">>): LayoutPreset | null {
    const p = this.presets.get(id); if (!p) return null; Object.assign(p, updates); return p;
  }

  delete(id: string): boolean { const p = this.presets.get(id); if (!p || p.isDefault) return false; return this.presets.delete(id); }
}

export const layoutPresetsService = new LayoutPresetsService();
