export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ("ctrl" | "shift" | "alt" | "meta")[];
  action: string;
  description: string;
  category: string;
  enabled: boolean;
  customizable: boolean;
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();

  constructor() {
    const defaults: Omit<KeyboardShortcut, "id">[] = [
      { key: "s", modifiers: ["ctrl"], action: "save", description: "Save current file", category: "File", enabled: true, customizable: true },
      { key: "p", modifiers: ["ctrl"], action: "quickOpen", description: "Quick open file", category: "Navigation", enabled: true, customizable: true },
      { key: "f", modifiers: ["ctrl"], action: "find", description: "Find in file", category: "Search", enabled: true, customizable: true },
      { key: "h", modifiers: ["ctrl"], action: "replace", description: "Find and replace", category: "Search", enabled: true, customizable: true },
      { key: "`", modifiers: ["ctrl"], action: "toggleTerminal", description: "Toggle terminal", category: "View", enabled: true, customizable: true },
      { key: "b", modifiers: ["ctrl"], action: "toggleSidebar", description: "Toggle sidebar", category: "View", enabled: true, customizable: true },
      { key: "\\", modifiers: ["ctrl"], action: "splitEditor", description: "Split editor", category: "Editor", enabled: true, customizable: true },
      { key: "/", modifiers: ["ctrl"], action: "toggleComment", description: "Toggle comment", category: "Editor", enabled: true, customizable: true },
      { key: "z", modifiers: ["ctrl"], action: "undo", description: "Undo", category: "Editor", enabled: true, customizable: false },
      { key: "z", modifiers: ["ctrl", "shift"], action: "redo", description: "Redo", category: "Editor", enabled: true, customizable: false },
    ];
    for (const s of defaults) { const id = `sc-${Math.random().toString(36).slice(2, 8)}`; this.shortcuts.set(id, { ...s, id }); }
  }

  list(category?: string): KeyboardShortcut[] {
    const all = Array.from(this.shortcuts.values());
    return category ? all.filter(s => s.category === category) : all;
  }
  get(id: string): KeyboardShortcut | null { return this.shortcuts.get(id) || null; }

  update(id: string, updates: Partial<Pick<KeyboardShortcut, "key" | "modifiers" | "enabled">>): KeyboardShortcut | null {
    const s = this.shortcuts.get(id); if (!s || !s.customizable) return null;
    Object.assign(s, updates); return s;
  }

  getCategories(): string[] {
    return [...new Set(Array.from(this.shortcuts.values()).map(s => s.category))];
  }

  resetAll(): void {
    for (const s of this.shortcuts.values()) { if (s.customizable) s.enabled = true; }
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
