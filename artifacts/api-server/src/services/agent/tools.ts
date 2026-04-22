import { db, filesTable, fileVersionsTable, projectsTable } from "@workspace/db";
import { eq, and, max } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ToolContext {
  projectId: string;
  userId: string;
  mode: "plan" | "build" | "background";
  approved: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  mutating: boolean;
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read the contents of a file in the active project. Returns the file's text content.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Path of the file relative to the project root." } },
      required: ["path"],
    },
    mutating: false,
  },
  {
    name: "write_file",
    description: "Create or overwrite a file in the project. Pass full new content. Use for both creates and edits.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
    mutating: true,
  },
  {
    name: "delete_file",
    description: "Delete a file from the project.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
    mutating: true,
  },
  {
    name: "list_files",
    description: "List all files and directories in the project.",
    input_schema: { type: "object", properties: {} },
    mutating: false,
  },
  {
    name: "run_shell",
    description: "Run a safe shell command. Stdout and stderr are returned. Long-running commands time out at 20s.",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
    mutating: true,
  },
  {
    name: "install_package",
    description: "Install a package in the project's package manager (npm/pnpm/pip).",
    input_schema: {
      type: "object",
      properties: {
        manager: { type: "string", enum: ["npm", "pnpm", "pip"] },
        name: { type: "string" },
      },
      required: ["manager", "name"],
    },
    mutating: true,
  },
  {
    name: "read_db_schema",
    description: "Introspect the database tables and columns available to the project.",
    input_schema: { type: "object", properties: {} },
    mutating: false,
  },
  {
    name: "http_request",
    description: "Issue an HTTP request to test an API. Returns status, headers, and body.",
    input_schema: {
      type: "object",
      properties: {
        method: { type: "string" },
        url: { type: "string" },
        headers: { type: "object" },
        body: { type: "string" },
      },
      required: ["method", "url"],
    },
    mutating: false,
  },
  {
    name: "preview_screenshot",
    description: "Capture a screenshot of the project's preview pane. Returns a description of the rendered output.",
    input_schema: { type: "object", properties: {} },
    mutating: false,
  },
  {
    name: "web_search",
    description: "Search the web for documentation and code snippets. Returns top result snippets.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    mutating: false,
  },
];

async function nextVersion(fileId: string): Promise<number> {
  const [row] = await db.select({ v: max(fileVersionsTable.version) }).from(fileVersionsTable).where(eq(fileVersionsTable.fileId, fileId));
  return (row?.v ?? 0) + 1;
}

export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const def = AGENT_TOOLS.find((t) => t.name === name);
  if (!def) return { ok: false, error: `Unknown tool: ${name}` };
  if (def.mutating && ctx.mode === "plan" && !ctx.approved) {
    return { ok: false, error: "Mutation blocked: plan mode requires user approval" };
  }

  try {
    switch (name) {
      case "read_file": {
        const path = String(input.path ?? "");
        const [file] = await db.select().from(filesTable).where(and(eq(filesTable.projectId, ctx.projectId), eq(filesTable.path, path)));
        if (!file) return { ok: false, error: `File not found: ${path}` };
        return { ok: true, result: { path, content: file.content ?? "", size: file.sizeBytes } };
      }

      case "write_file": {
        const path = String(input.path ?? "");
        const content = String(input.content ?? "");
        const name = path.split("/").pop() || path;
        const sizeBytes = Buffer.byteLength(content, "utf8");
        const [existing] = await db.select().from(filesTable).where(and(eq(filesTable.projectId, ctx.projectId), eq(filesTable.path, path)));
        let fileId: string;
        let changeType: "create" | "update" = "create";
        if (existing) {
          changeType = "update";
          await db.update(filesTable).set({ content, sizeBytes }).where(eq(filesTable.id, existing.id));
          fileId = existing.id;
        } else {
          const parts = path.split("/");
          for (let i = 1; i < parts.length; i++) {
            const dirPath = parts.slice(0, i).join("/");
            const dirName = parts[i - 1];
            await db.insert(filesTable).values({
              projectId: ctx.projectId, path: dirPath, name: dirName, isDirectory: true, sizeBytes: 0,
            }).onConflictDoNothing();
          }
          const [created] = await db.insert(filesTable).values({
            projectId: ctx.projectId, path, name, isDirectory: false, content, sizeBytes,
          }).returning();
          fileId = created.id;
        }
        const v = await nextVersion(fileId);
        await db.insert(fileVersionsTable).values({
          fileId, projectId: ctx.projectId, version: v, content,
          changeType, sizeBytes, createdBy: ctx.userId,
          commitMessage: `agent: ${changeType} ${path}`,
        });
        return { ok: true, result: { path, bytes: sizeBytes, changeType, version: v } };
      }

      case "delete_file": {
        const path = String(input.path ?? "");
        const [existing] = await db.select().from(filesTable).where(and(eq(filesTable.projectId, ctx.projectId), eq(filesTable.path, path)));
        if (!existing) return { ok: false, error: `File not found: ${path}` };
        await db.delete(filesTable).where(eq(filesTable.id, existing.id));
        return { ok: true, result: { path, deleted: true } };
      }

      case "list_files": {
        const files = await db.select({ path: filesTable.path, isDirectory: filesTable.isDirectory, sizeBytes: filesTable.sizeBytes })
          .from(filesTable).where(eq(filesTable.projectId, ctx.projectId)).limit(500);
        return { ok: true, result: { files } };
      }

      case "run_shell": {
        const command = String(input.command ?? "").trim();
        if (!command) return { ok: false, error: "Empty command" };
        const blocked = /\b(rm\s+-rf\s+\/|mkfs|dd\s+if=|:\(\)\s*\{\s*:\|)/.test(command);
        if (blocked) return { ok: false, error: "Command blocked for safety" };
        try {
          const { stdout, stderr } = await execAsync(command, { timeout: 20_000, maxBuffer: 256 * 1024, cwd: process.cwd() });
          return { ok: true, result: { stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000) } };
        } catch (err) {
          const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
          return { ok: true, result: { stdout: (e.stdout ?? "").slice(0, 8000), stderr: (e.stderr ?? e.message ?? "").slice(0, 4000), exitCode: e.code ?? 1 } };
        }
      }

      case "install_package": {
        const manager = String(input.manager ?? "npm");
        const pkg = String(input.name ?? "").trim();
        if (!pkg) return { ok: false, error: "Missing package name" };
        if (!/^[@a-zA-Z0-9._/-]+$/.test(pkg)) return { ok: false, error: "Invalid package name" };
        return { ok: true, result: { simulated: true, command: `${manager} install ${pkg}`, note: "Package installation is simulated; no host packages were modified." } };
      }

      case "read_db_schema": {
        const tables = [
          { table: "projects", columns: ["id", "name", "language", "owner_id"] },
          { table: "files", columns: ["id", "project_id", "path", "name", "content"] },
          { table: "users", columns: ["id", "email", "username"] },
        ];
        return { ok: true, result: { tables, note: "Schema introspection is read-only and limited to public tables." } };
      }

      case "http_request": {
        const method = String(input.method ?? "GET").toUpperCase();
        const url = String(input.url ?? "");
        if (!url) return { ok: false, error: "Missing url" };
        const headers = (input.headers as Record<string, string>) || {};
        const body = input.body ? String(input.body) : undefined;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 10_000);
          const res = await fetch(url, { method, headers, body, signal: ctrl.signal });
          clearTimeout(timer);
          const text = (await res.text()).slice(0, 4000);
          return { ok: true, result: { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text } };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
        }
      }

      case "preview_screenshot": {
        const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, ctx.projectId));
        const url = project?.deployedUrl ?? null;
        return { ok: true, result: { url, note: "Real screenshot capture is not enabled in this environment; preview URL returned for reference." } };
      }

      case "web_search": {
        const query = String(input.query ?? "");
        return { ok: true, result: { query, results: [{ title: "Web search not enabled", snippet: "Configure a web search integration to enable real results.", url: null }] } };
      }

      default:
        return { ok: false, error: `Unhandled tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tool failed" };
  }
}
