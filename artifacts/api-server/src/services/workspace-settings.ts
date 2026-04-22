export interface WorkspaceSettings { userId: string; theme: "dark" | "light" | "system"; fontSize: number; tabSize: number; wordWrap: boolean; minimap: boolean; lineNumbers: boolean; autoSave: boolean; autoSaveDelay: number; formatOnSave: boolean; bracketPairColorization: boolean; defaultLanguage: string; terminalFontSize: number; sidebarPosition: "left" | "right"; panelLayout: "horizontal" | "vertical"; keybindings: "default" | "vim" | "emacs"; cursorStyle: "line" | "block" | "underline"; }
class WorkspaceSettingsService {
  private settings: Map<string, WorkspaceSettings> = new Map();
  private defaults: WorkspaceSettings = { userId: "", theme: "dark", fontSize: 14, tabSize: 2, wordWrap: true, minimap: true, lineNumbers: true, autoSave: true, autoSaveDelay: 1000, formatOnSave: true, bracketPairColorization: true, defaultLanguage: "typescript", terminalFontSize: 13, sidebarPosition: "left", panelLayout: "horizontal", keybindings: "default", cursorStyle: "line" };
  get(userId: string): WorkspaceSettings { return this.settings.get(userId) || { ...this.defaults, userId }; }
  update(userId: string, updates: Partial<WorkspaceSettings>): WorkspaceSettings {
    const current = this.get(userId); Object.assign(current, updates, { userId }); this.settings.set(userId, current); return current;
  }
  reset(userId: string): WorkspaceSettings { const s = { ...this.defaults, userId }; this.settings.set(userId, s); return s; }
  getDefaults(): Omit<WorkspaceSettings, "userId"> { return { ...this.defaults }; }
}
export const workspaceSettingsService = new WorkspaceSettingsService();
