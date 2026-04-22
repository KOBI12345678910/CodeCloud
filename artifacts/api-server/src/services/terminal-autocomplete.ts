export interface Completion {
  text: string;
  type: "command" | "flag" | "path" | "argument";
  description: string;
}

class TerminalAutocompleteService {
  private commands: Map<string, { desc: string; flags: { name: string; desc: string }[] }> = new Map();

  constructor() {
    const defaults: [string, string, { name: string; desc: string }[]][] = [
      ["npm", "Node.js package manager", [{ name: "install", desc: "Install packages" }, { name: "run", desc: "Run script" }, { name: "test", desc: "Run tests" }, { name: "build", desc: "Build project" }]],
      ["git", "Version control", [{ name: "status", desc: "Show status" }, { name: "add", desc: "Stage files" }, { name: "commit", desc: "Commit changes" }, { name: "push", desc: "Push to remote" }, { name: "pull", desc: "Pull from remote" }, { name: "branch", desc: "Manage branches" }]],
      ["ls", "List directory", [{ name: "-la", desc: "Long format, all files" }, { name: "-R", desc: "Recursive" }]],
      ["cd", "Change directory", []],
      ["cat", "Display file content", []],
      ["grep", "Search in files", [{ name: "-r", desc: "Recursive" }, { name: "-i", desc: "Case insensitive" }, { name: "-n", desc: "Line numbers" }]],
      ["docker", "Container management", [{ name: "build", desc: "Build image" }, { name: "run", desc: "Run container" }, { name: "ps", desc: "List containers" }, { name: "logs", desc: "View logs" }]],
    ];
    for (const [cmd, desc, flags] of defaults) this.commands.set(cmd, { desc, flags });
  }

  complete(input: string): Completion[] {
    const parts = input.trim().split(/\s+/);
    if (parts.length <= 1) {
      const prefix = parts[0] || "";
      return Array.from(this.commands.entries()).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => ({ text: k, type: "command" as const, description: v.desc }));
    }
    const cmd = this.commands.get(parts[0]);
    if (!cmd) return [];
    const last = parts[parts.length - 1];
    return cmd.flags.filter(f => f.name.startsWith(last)).map(f => ({ text: f.name, type: "flag" as const, description: f.desc }));
  }

  registerCommand(name: string, desc: string, flags: { name: string; desc: string }[]): void {
    this.commands.set(name, { desc, flags });
  }
}

export const terminalAutocompleteService = new TerminalAutocompleteService();
