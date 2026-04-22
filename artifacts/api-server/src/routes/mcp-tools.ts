import { Router } from "express";
const r = Router();

interface McpServer {
  id: string;
  projectId: string;
  name: string;
  url: string;
  transport: "stdio" | "sse" | "http";
  status: "connected" | "disconnected" | "error";
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  createdAt: string;
  lastPingAt: string | null;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  enabled: boolean;
}

interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

interface McpPrompt {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
}

const servers = new Map<string, McpServer>();

const builtinServers: Omit<McpServer, "id" | "projectId" | "createdAt" | "lastPingAt">[] = [
  {
    name: "Filesystem", url: "builtin://filesystem", transport: "stdio", status: "connected",
    tools: [
      { name: "read_file", description: "Read file contents", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, enabled: true },
      { name: "write_file", description: "Write content to file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] }, enabled: true },
      { name: "list_directory", description: "List directory contents", inputSchema: { type: "object", properties: { path: { type: "string" } } }, enabled: true },
      { name: "search_files", description: "Search for files by pattern", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] }, enabled: true },
    ],
    resources: [{ uri: "file:///workspace", name: "Workspace", mimeType: "inode/directory", description: "Project workspace root" }],
    prompts: [],
  },
  {
    name: "Database", url: "builtin://database", transport: "stdio", status: "connected",
    tools: [
      { name: "query", description: "Execute SQL query", inputSchema: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] }, enabled: true },
      { name: "list_tables", description: "List all tables", inputSchema: { type: "object" }, enabled: true },
      { name: "describe_table", description: "Get table schema", inputSchema: { type: "object", properties: { table: { type: "string" } }, required: ["table"] }, enabled: true },
    ],
    resources: [],
    prompts: [{ name: "sql_expert", description: "Get SQL help", arguments: [{ name: "question", description: "Your SQL question", required: true }] }],
  },
  {
    name: "Git", url: "builtin://git", transport: "stdio", status: "connected",
    tools: [
      { name: "git_status", description: "Get git status", inputSchema: { type: "object" }, enabled: true },
      { name: "git_diff", description: "Get git diff", inputSchema: { type: "object", properties: { ref: { type: "string" } } }, enabled: true },
      { name: "git_log", description: "Get commit history", inputSchema: { type: "object", properties: { limit: { type: "number" } } }, enabled: true },
      { name: "git_commit", description: "Create a commit", inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] }, enabled: true },
    ],
    resources: [],
    prompts: [],
  },
  {
    name: "Browser", url: "builtin://browser", transport: "stdio", status: "connected",
    tools: [
      { name: "screenshot", description: "Take a screenshot of a URL", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, enabled: true },
      { name: "fetch_page", description: "Fetch page content", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, enabled: true },
      { name: "click_element", description: "Click an element on page", inputSchema: { type: "object", properties: { selector: { type: "string" } }, required: ["selector"] }, enabled: true },
    ],
    resources: [],
    prompts: [],
  },
  {
    name: "Terminal", url: "builtin://terminal", transport: "stdio", status: "connected",
    tools: [
      { name: "run_command", description: "Execute a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, timeout: { type: "number" } }, required: ["command"] }, enabled: true },
    ],
    resources: [],
    prompts: [],
  },
];

r.get("/mcp/:projectId/servers", (req, res) => {
  const { projectId } = req.params;
  const custom = [...servers.values()].filter(s => s.projectId === projectId);
  const builtin = builtinServers.map((s, i) => ({ ...s, id: `builtin_${i}`, projectId, createdAt: "2024-01-01T00:00:00Z", lastPingAt: new Date().toISOString() }));
  res.json({ servers: [...builtin, ...custom], builtin: builtin.length, custom: custom.length });
});

r.post("/mcp/:projectId/servers", (req, res) => {
  const { projectId } = req.params;
  const { name, url, transport = "sse" } = req.body;
  if (!name || !url) return res.status(400).json({ error: "name and url required" });
  const id = `mcp_${Date.now()}`;
  const server: McpServer = {
    id, projectId, name, url, transport, status: "connected",
    tools: [], resources: [], prompts: [],
    createdAt: new Date().toISOString(), lastPingAt: new Date().toISOString(),
  };
  servers.set(id, server);
  res.status(201).json(server);
});

r.delete("/mcp/:projectId/servers/:serverId", (req, res) => {
  const s = servers.get(req.params.serverId);
  if (!s || s.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  servers.delete(req.params.serverId);
  res.json({ deleted: true });
});

r.post("/mcp/:projectId/servers/:serverId/tools/:toolName/execute", (req, res) => {
  const { serverId, toolName } = req.params;
  const s = servers.get(serverId);
  if (!s) {
    const bi = builtinServers.find(b => b.tools.some(t => t.name === toolName));
    if (!bi) return res.status(404).json({ error: "tool not found" });
    return res.json({ result: { content: [{ type: "text", text: `Executed ${toolName} successfully` }] }, duration: Math.round(50 + Math.random() * 200) + "ms" });
  }
  res.json({ result: { content: [{ type: "text", text: `Executed ${toolName} on ${s.name}` }] }, duration: Math.round(50 + Math.random() * 500) + "ms" });
});

r.get("/mcp/:projectId/tools", (req, res) => {
  const { projectId } = req.params;
  const custom = [...servers.values()].filter(s => s.projectId === projectId);
  const allTools = [
    ...builtinServers.flatMap(s => s.tools.map(t => ({ ...t, server: s.name, source: "builtin" as const }))),
    ...custom.flatMap(s => s.tools.map(t => ({ ...t, server: s.name, source: "custom" as const }))),
  ];
  res.json({ tools: allTools, total: allTools.length });
});

export default r;
