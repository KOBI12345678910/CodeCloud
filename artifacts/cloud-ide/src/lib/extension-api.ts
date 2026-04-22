export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  main: string;
  activationEvents: ActivationEvent[];
  contributes?: ExtensionContributions;
  settings?: ExtensionSettingDef[];
  permissions?: string[];
}

export type ActivationEvent =
  | "onFileOpen"
  | "onFileSave"
  | "onRun"
  | "onDeploy"
  | "onStartup"
  | "onCommand"
  | "onLanguage"
  | "onTerminalOpen"
  | "onDebugStart"
  | "onGitCommit";

export interface ExtensionContributions {
  commands?: ExtensionCommand[];
  menus?: { location: "toolbar" | "context" | "statusbar"; commandId: string }[];
  keybindings?: { key: string; commandId: string; when?: string }[];
  languages?: { id: string; extensions: string[]; aliases?: string[] }[];
  themes?: { id: string; label: string; path: string }[];
  panels?: { id: string; title: string; icon?: string; location: "sidebar" | "bottom" }[];
}

export interface ExtensionCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface ExtensionSettingDef {
  key: string;
  type: "string" | "number" | "boolean" | "select";
  default: any;
  label: string;
  description?: string;
  options?: { label: string; value: any }[];
}

export type HookCallback = (...args: any[]) => void | Promise<void>;

export interface ExtensionContext {
  extensionId: string;
  extensionPath: string;
  settings: Record<string, any>;
  subscriptions: { dispose: () => void }[];
  storage: ExtensionStorage;
}

export interface ExtensionStorage {
  get(key: string): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  keys(): string[];
}

export interface IDEApi {
  editor: EditorApi;
  terminal: TerminalApi;
  files: FilesApi;
  notifications: NotificationApi;
  statusBar: StatusBarApi;
  commands: CommandsApi;
  hooks: HooksApi;
}

export interface EditorApi {
  getActiveFile(): string | null;
  getSelection(): { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  insertText(text: string, position?: { line: number; column: number }): void;
  replaceSelection(text: string): void;
  getContent(filePath?: string): string | null;
  setContent(filePath: string, content: string): void;
  openFile(filePath: string, options?: { preview?: boolean; line?: number }): void;
  revealLine(line: number): void;
  addDecoration(range: { startLine: number; endLine: number }, options: { className?: string; glyphMarginClassName?: string; hoverMessage?: string }): string;
  removeDecoration(id: string): void;
}

export interface TerminalApi {
  execute(command: string): void;
  createTerminal(name?: string): string;
  sendText(terminalId: string, text: string): void;
  onOutput(callback: (data: string) => void): { dispose: () => void };
}

export interface FilesApi {
  list(directory?: string): Promise<string[]>;
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  watch(pattern: string, callback: (event: "create" | "change" | "delete", path: string) => void): { dispose: () => void };
}

export interface NotificationApi {
  info(message: string, options?: { actions?: string[] }): Promise<string | undefined>;
  warn(message: string, options?: { actions?: string[] }): Promise<string | undefined>;
  error(message: string, options?: { actions?: string[] }): Promise<string | undefined>;
  progress(title: string, task: (progress: { report: (value: number, message?: string) => void }) => Promise<void>): Promise<void>;
}

export interface StatusBarApi {
  createItem(options: { text: string; tooltip?: string; command?: string; alignment?: "left" | "right"; priority?: number }): StatusBarItem;
}

export interface StatusBarItem {
  text: string;
  tooltip?: string;
  command?: string;
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface CommandsApi {
  register(id: string, handler: (...args: any[]) => any): { dispose: () => void };
  execute(id: string, ...args: any[]): Promise<any>;
  getAll(): string[];
}

export interface HooksApi {
  onFileOpen(callback: (filePath: string) => void): { dispose: () => void };
  onFileSave(callback: (filePath: string, content: string) => void): { dispose: () => void };
  onRun(callback: (command: string) => void): { dispose: () => void };
  onDeploy(callback: (deploymentId: string) => void): { dispose: () => void };
  onTerminalOpen(callback: (terminalId: string) => void): { dispose: () => void };
  onDebugStart(callback: () => void): { dispose: () => void };
  onGitCommit(callback: (message: string) => void): { dispose: () => void };
}

type ExtensionActivate = (context: ExtensionContext, api: IDEApi) => void | Promise<void>;
type ExtensionDeactivate = () => void | Promise<void>;

interface LoadedExtension {
  manifest: ExtensionManifest;
  context: ExtensionContext;
  activate: ExtensionActivate;
  deactivate?: ExtensionDeactivate;
  active: boolean;
}

class ExtensionHost {
  private extensions = new Map<string, LoadedExtension>();
  private hooks = new Map<string, Set<HookCallback>>();
  private commands = new Map<string, (...args: any[]) => any>();
  private statusBarItems: StatusBarItem[] = [];

  private createStorage(extensionId: string): ExtensionStorage {
    const prefix = `ext_${extensionId}_`;
    return {
      get(key: string) { const v = localStorage.getItem(prefix + key); return v ? JSON.parse(v) : undefined; },
      set(key: string, value: any) { localStorage.setItem(prefix + key, JSON.stringify(value)); },
      delete(key: string) { localStorage.removeItem(prefix + key); },
      keys() { const ks: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(prefix)) ks.push(k.slice(prefix.length)); } return ks; },
    };
  }

  private createApi(): IDEApi {
    const self = this;
    return {
      editor: {
        getActiveFile() { return null; },
        getSelection() { return null; },
        insertText() {},
        replaceSelection() {},
        getContent() { return null; },
        setContent() {},
        openFile() {},
        revealLine() {},
        addDecoration() { return crypto.randomUUID(); },
        removeDecoration() {},
      },
      terminal: {
        execute() {},
        createTerminal() { return crypto.randomUUID(); },
        sendText() {},
        onOutput(cb) { return { dispose() {} }; },
      },
      files: {
        async list() { return []; },
        async read() { return ""; },
        async write() {},
        async delete() {},
        async exists() { return false; },
        watch(_, cb) { return { dispose() {} }; },
      },
      notifications: {
        async info() { return undefined; },
        async warn() { return undefined; },
        async error() { return undefined; },
        async progress(_, task) { await task({ report() {} }); },
      },
      statusBar: {
        createItem(opts) {
          const item: StatusBarItem = { text: opts.text, tooltip: opts.tooltip, command: opts.command, show() {}, hide() {}, dispose() {} };
          self.statusBarItems.push(item);
          return item;
        },
      },
      commands: {
        register(id, handler) { self.commands.set(id, handler); return { dispose() { self.commands.delete(id); } }; },
        async execute(id, ...args) { const h = self.commands.get(id); if (h) return h(...args); },
        getAll() { return Array.from(self.commands.keys()); },
      },
      hooks: {
        onFileOpen(cb) { return self.addHook("onFileOpen", cb); },
        onFileSave(cb) { return self.addHook("onFileSave", cb); },
        onRun(cb) { return self.addHook("onRun", cb); },
        onDeploy(cb) { return self.addHook("onDeploy", cb); },
        onTerminalOpen(cb) { return self.addHook("onTerminalOpen", cb); },
        onDebugStart(cb) { return self.addHook("onDebugStart", cb); },
        onGitCommit(cb) { return self.addHook("onGitCommit", cb); },
      },
    };
  }

  private addHook(event: string, callback: HookCallback): { dispose: () => void } {
    if (!this.hooks.has(event)) this.hooks.set(event, new Set());
    this.hooks.get(event)!.add(callback);
    return { dispose: () => { this.hooks.get(event)?.delete(callback); } };
  }

  async fireHook(event: string, ...args: any[]) {
    const callbacks = this.hooks.get(event);
    if (callbacks) for (const cb of callbacks) { try { await cb(...args); } catch (e) { console.error(`Extension hook error (${event}):`, e); } }
  }

  async loadExtension(manifest: ExtensionManifest, activate: ExtensionActivate, deactivate?: ExtensionDeactivate) {
    const context: ExtensionContext = {
      extensionId: manifest.id,
      extensionPath: `/extensions/${manifest.id}`,
      settings: {},
      subscriptions: [],
      storage: this.createStorage(manifest.id),
    };

    if (manifest.settings) for (const s of manifest.settings) context.settings[s.key] = s.default;

    const ext: LoadedExtension = { manifest, context, activate, deactivate, active: false };
    this.extensions.set(manifest.id, ext);

    try {
      await activate(context, this.createApi());
      ext.active = true;
    } catch (e) { console.error(`Failed to activate extension ${manifest.id}:`, e); }
  }

  async unloadExtension(extensionId: string) {
    const ext = this.extensions.get(extensionId);
    if (!ext) return;
    try { if (ext.deactivate) await ext.deactivate(); } catch (e) { console.error(`Error deactivating ${extensionId}:`, e); }
    for (const sub of ext.context.subscriptions) sub.dispose();
    ext.active = false;
    this.extensions.delete(extensionId);
  }

  getExtension(id: string) { return this.extensions.get(id); }
  getAllExtensions() { return Array.from(this.extensions.values()); }
  getActiveExtensions() { return this.getAllExtensions().filter(e => e.active); }
}

export const extensionHost = new ExtensionHost();

export const SAMPLE_EXTENSIONS: ExtensionManifest[] = [
  {
    id: "auto-save",
    name: "Auto Save",
    version: "1.0.0",
    description: "Automatically save files after a configurable delay",
    author: "CodeCloud",
    main: "index.js",
    activationEvents: ["onStartup"],
    settings: [
      { key: "delay", type: "number", default: 1000, label: "Auto-save delay (ms)", description: "Delay in milliseconds before auto-saving" },
      { key: "enabled", type: "boolean", default: true, label: "Enable auto-save" },
    ],
    contributes: { commands: [{ id: "autoSave.toggle", title: "Toggle Auto Save" }] },
  },
  {
    id: "code-formatter",
    name: "Code Formatter",
    version: "2.1.0",
    description: "Format code on save using Prettier",
    author: "CodeCloud",
    main: "index.js",
    activationEvents: ["onFileSave"],
    settings: [
      { key: "formatOnSave", type: "boolean", default: true, label: "Format on save" },
      { key: "tabWidth", type: "select", default: 2, label: "Tab width", options: [{ label: "2 spaces", value: 2 }, { label: "4 spaces", value: 4 }] },
    ],
    contributes: { commands: [{ id: "formatter.format", title: "Format Document", category: "Formatting" }] },
  },
  {
    id: "git-lens",
    name: "Git Lens",
    version: "1.3.0",
    description: "Show git blame annotations inline",
    author: "CodeCloud",
    main: "index.js",
    activationEvents: ["onFileOpen"],
    contributes: {
      commands: [{ id: "gitLens.toggleBlame", title: "Toggle Git Blame", category: "Git" }],
      panels: [{ id: "gitLens.history", title: "File History", icon: "git-branch", location: "sidebar" }],
    },
  },
  {
    id: "bracket-colorizer",
    name: "Bracket Colorizer",
    version: "1.0.0",
    description: "Colorize matching brackets for better readability",
    author: "Community",
    main: "index.js",
    activationEvents: ["onStartup"],
    settings: [{ key: "colors", type: "string", default: "#ffd700,#da70d6,#87ceeb", label: "Bracket colors (comma-separated hex)" }],
  },
  {
    id: "ai-assistant",
    name: "AI Code Assistant",
    version: "3.0.0",
    description: "AI-powered code completion and suggestions",
    author: "CodeCloud",
    main: "index.js",
    activationEvents: ["onStartup", "onFileOpen"],
    permissions: ["ai.completions", "editor.inline"],
    settings: [
      { key: "provider", type: "select", default: "openai", label: "AI Provider", options: [{ label: "OpenAI", value: "openai" }, { label: "Anthropic", value: "anthropic" }] },
      { key: "autoComplete", type: "boolean", default: true, label: "Enable auto-complete" },
    ],
    contributes: {
      commands: [{ id: "ai.explain", title: "Explain Code", category: "AI" }, { id: "ai.refactor", title: "Refactor Selection", category: "AI" }],
      keybindings: [{ key: "Ctrl+Shift+E", commandId: "ai.explain" }],
    },
  },
];
