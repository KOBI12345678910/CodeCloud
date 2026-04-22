export interface CliCommand { name: string; description: string; usage: string; flags: { name: string; short: string; description: string }[]; }
class CliToolsService {
  private commands: CliCommand[] = [
    { name: "deploy", description: "Deploy project to production", usage: "codecloud deploy [flags]", flags: [{ name: "--env", short: "-e", description: "Target environment" }, { name: "--force", short: "-f", description: "Skip confirmation" }] },
    { name: "init", description: "Initialize a new project", usage: "codecloud init <name> [template]", flags: [{ name: "--template", short: "-t", description: "Project template" }, { name: "--private", short: "-p", description: "Create private project" }] },
    { name: "login", description: "Authenticate with CodeCloud", usage: "codecloud login", flags: [{ name: "--token", short: "-k", description: "API token" }] },
    { name: "logs", description: "Stream project logs", usage: "codecloud logs [flags]", flags: [{ name: "--follow", short: "-f", description: "Follow log output" }, { name: "--lines", short: "-n", description: "Number of lines" }] },
    { name: "env", description: "Manage environment variables", usage: "codecloud env <action> [key] [value]", flags: [{ name: "--project", short: "-p", description: "Target project" }] },
  ];
  list(): CliCommand[] { return this.commands; }
  get(name: string): CliCommand | null { return this.commands.find(c => c.name === name) || null; }
  getVersion(): { version: string; node: string; platform: string } { return { version: "2.5.0", node: "18.17.0", platform: "linux-x64" }; }
}
export const cliToolsService = new CliToolsService();
