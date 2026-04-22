export interface TechStackItem { category: string; choice: string; reason: string; }
export interface FileNode { path: string; type: "file" | "dir"; description?: string; content?: string; children?: FileNode[]; }
export interface SchemaField { name: string; type: string; primary?: boolean; nullable?: boolean; unique?: boolean; foreignKey?: { table: string; field: string }; }
export interface SchemaTable { name: string; fields: SchemaField[]; description?: string; }
export interface SchemaRelationship { from: string; to: string; type: "one-to-one" | "one-to-many" | "many-to-many"; description?: string; }
export interface ApiEndpoint { method: string; path: string; description: string; auth?: boolean; }
export interface ComponentNode { name: string; type: "page" | "layout" | "component" | "hook" | "context"; description: string; children?: ComponentNode[]; }

export interface ArchitecturePlan {
  title: string;
  description: string;
  techStack: TechStackItem[];
  fileTree: FileNode[];
  schema: { tables: SchemaTable[]; relationships: SchemaRelationship[] };
  endpoints: ApiEndpoint[];
  components: ComponentNode[];
}

const KEYWORDS = {
  ecommerce: ["shop", "store", "ecommerce", "product", "cart", "checkout", "order"],
  blog: ["blog", "post", "article", "comment", "author"],
  social: ["social", "follow", "feed", "like", "friend", "chat", "message"],
  saas: ["saas", "subscription", "billing", "tenant", "workspace", "team"],
  task: ["todo", "task", "project management", "kanban", "issue", "ticket"],
};

function detectDomain(desc: string): keyof typeof KEYWORDS | "generic" {
  const lower = desc.toLowerCase();
  for (const [k, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return k as keyof typeof KEYWORDS;
  }
  return "generic";
}

function deriveTitle(desc: string): string {
  const trimmed = desc.trim().slice(0, 60);
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : "Untitled Plan";
}

const DOMAIN_TABLES: Record<string, SchemaTable[]> = {
  ecommerce: [
    { name: "users", description: "Customer accounts", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "email", type: "varchar", unique: true },
      { name: "name", type: "varchar" },
      { name: "created_at", type: "timestamp" },
    ]},
    { name: "products", description: "Items for sale", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "name", type: "varchar" },
      { name: "price_cents", type: "integer" },
      { name: "inventory", type: "integer" },
      { name: "description", type: "text", nullable: true },
    ]},
    { name: "orders", description: "Customer orders", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "user_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "total_cents", type: "integer" },
      { name: "status", type: "varchar" },
      { name: "created_at", type: "timestamp" },
    ]},
    { name: "order_items", description: "Line items in an order", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "order_id", type: "uuid", foreignKey: { table: "orders", field: "id" } },
      { name: "product_id", type: "uuid", foreignKey: { table: "products", field: "id" } },
      { name: "quantity", type: "integer" },
      { name: "price_cents", type: "integer" },
    ]},
  ],
  blog: [
    { name: "users", description: "Authors and readers", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "email", type: "varchar", unique: true },
      { name: "name", type: "varchar" },
    ]},
    { name: "posts", description: "Blog posts", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "author_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "title", type: "varchar" },
      { name: "body", type: "text" },
      { name: "published_at", type: "timestamp", nullable: true },
    ]},
    { name: "comments", description: "Comments on posts", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "post_id", type: "uuid", foreignKey: { table: "posts", field: "id" } },
      { name: "author_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "body", type: "text" },
    ]},
  ],
  social: [
    { name: "users", description: "User accounts", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "username", type: "varchar", unique: true },
      { name: "email", type: "varchar", unique: true },
    ]},
    { name: "follows", description: "User follow graph", fields: [
      { name: "follower_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "followee_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
    ]},
    { name: "posts", description: "User-generated posts", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "user_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "content", type: "text" },
    ]},
  ],
  saas: [
    { name: "users", description: "Account members", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "email", type: "varchar", unique: true },
    ]},
    { name: "workspaces", description: "Tenant workspaces", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "name", type: "varchar" },
      { name: "owner_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
    ]},
    { name: "subscriptions", description: "Billing subscriptions", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "workspace_id", type: "uuid", foreignKey: { table: "workspaces", field: "id" } },
      { name: "plan", type: "varchar" },
      { name: "status", type: "varchar" },
    ]},
  ],
  task: [
    { name: "users", description: "Account members", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "email", type: "varchar", unique: true },
    ]},
    { name: "projects", description: "Project containers", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "name", type: "varchar" },
      { name: "owner_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
    ]},
    { name: "tasks", description: "Tasks/todos", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "project_id", type: "uuid", foreignKey: { table: "projects", field: "id" } },
      { name: "title", type: "varchar" },
      { name: "done", type: "boolean" },
      { name: "due_at", type: "timestamp", nullable: true },
    ]},
  ],
  generic: [
    { name: "users", description: "Application users", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "email", type: "varchar", unique: true },
      { name: "name", type: "varchar" },
    ]},
    { name: "items", description: "Primary domain entity", fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "user_id", type: "uuid", foreignKey: { table: "users", field: "id" } },
      { name: "title", type: "varchar" },
      { name: "data", type: "jsonb" },
    ]},
  ],
};

function relationshipsFromTables(tables: SchemaTable[]): SchemaRelationship[] {
  const rels: SchemaRelationship[] = [];
  for (const t of tables) {
    for (const f of t.fields) {
      if (f.foreignKey) {
        rels.push({ from: f.foreignKey.table, to: t.name, type: "one-to-many", description: `${t.name}.${f.name} -> ${f.foreignKey.table}.${f.foreignKey.field}` });
      }
    }
  }
  return rels;
}

function endpointsFromTables(tables: SchemaTable[]): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [
    { method: "POST", path: "/auth/login", description: "Authenticate a user", auth: false },
    { method: "POST", path: "/auth/logout", description: "End the current session", auth: true },
    { method: "GET", path: "/me", description: "Return the current user", auth: true },
  ];
  for (const t of tables) {
    if (t.name === "users") continue;
    endpoints.push({ method: "GET", path: `/${t.name}`, description: `List ${t.name}`, auth: true });
    endpoints.push({ method: "POST", path: `/${t.name}`, description: `Create a ${t.name.replace(/s$/, "")}`, auth: true });
    endpoints.push({ method: "GET", path: `/${t.name}/:id`, description: `Get one ${t.name.replace(/s$/, "")}`, auth: true });
    endpoints.push({ method: "PATCH", path: `/${t.name}/:id`, description: `Update a ${t.name.replace(/s$/, "")}`, auth: true });
    endpoints.push({ method: "DELETE", path: `/${t.name}/:id`, description: `Delete a ${t.name.replace(/s$/, "")}`, auth: true });
  }
  return endpoints;
}

function componentsFromDomain(domain: string, tables: SchemaTable[]): ComponentNode[] {
  const pages: ComponentNode[] = [
    { name: "RootLayout", type: "layout", description: "App-wide layout with nav and footer", children: [
      { name: "Header", type: "component", description: "Top navigation bar" },
      { name: "Footer", type: "component", description: "Site footer" },
    ]},
    { name: "HomePage", type: "page", description: "Landing/home page" },
    { name: "LoginPage", type: "page", description: "Sign-in form" },
    { name: "DashboardPage", type: "page", description: "Authenticated dashboard" },
  ];
  for (const t of tables) {
    if (t.name === "users") continue;
    pages.push({
      name: `${cap(t.name)}Page`, type: "page", description: `Manage ${t.name}`,
      children: [
        { name: `${capSingular(t.name)}List`, type: "component", description: `Renders a list of ${t.name}` },
        { name: `${capSingular(t.name)}Form`, type: "component", description: `Form for creating/editing a ${t.name.replace(/s$/, "")}` },
        { name: `use${capSingular(t.name)}s`, type: "hook", description: `Data hook for ${t.name}` },
      ],
    });
  }
  pages.push({ name: "AuthContext", type: "context", description: "Provides current user and auth helpers" });
  return pages;
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function capSingular(s: string): string { return cap(s.replace(/s$/, "")); }

function fileTreeFromTables(tables: SchemaTable[]): FileNode[] {
  const routes: FileNode[] = tables.filter(t => t.name !== "users").map(t => ({
    path: `src/routes/${t.name}.ts`, type: "file",
    description: `Express router for ${t.name}`,
    content: `import { Router } from "express";\nconst router = Router();\n\nrouter.get("/${t.name}", async (_req, res) => { res.json([]); });\nrouter.post("/${t.name}", async (_req, res) => { res.status(201).json({}); });\nrouter.get("/${t.name}/:id", async (_req, res) => { res.json({}); });\nrouter.patch("/${t.name}/:id", async (_req, res) => { res.json({}); });\nrouter.delete("/${t.name}/:id", async (_req, res) => { res.sendStatus(204); });\n\nexport default router;\n`,
  }));
  const schemas: FileNode[] = tables.map(t => ({
    path: `src/db/schema/${t.name}.ts`, type: "file",
    description: `Drizzle schema for ${t.name}`,
    content: `// Auto-generated stub for table ${t.name}\nexport const ${t.name}Table = {} as const;\n`,
  }));
  const pages: FileNode[] = tables.filter(t => t.name !== "users").map(t => ({
    path: `src/pages/${t.name}.tsx`, type: "file",
    description: `${cap(t.name)} page`,
    content: `export default function ${cap(t.name)}Page() {\n  return <div>${cap(t.name)} page</div>;\n}\n`,
  }));

  return [
    { path: "README.md", type: "file", description: "Project overview", content: "# Generated Project\n\nScaffolded by AI Architecture Planner.\n" },
    { path: "package.json", type: "file", description: "Project manifest", content: JSON.stringify({ name: "scaffolded-app", version: "0.1.0", private: true, type: "module" }, null, 2) + "\n" },
    { path: "tsconfig.json", type: "file", description: "TypeScript config", content: JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", strict: true, jsx: "react-jsx" } }, null, 2) + "\n" },
    { path: "src", type: "dir", children: [
      { path: "src/index.ts", type: "file", description: "Server entry point", content: `import express from "express";\n\nconst app = express();\napp.use(express.json());\napp.get("/health", (_req, res) => res.json({ ok: true }));\nconst port = Number(process.env.PORT) || 3000;\napp.listen(port, () => console.log("listening on", port));\n` },
      { path: "src/routes", type: "dir", children: routes },
      { path: "src/db", type: "dir", children: [
        { path: "src/db/index.ts", type: "file", description: "DB client", content: `// Configure your database client here.\nexport const db = {};\n` },
        { path: "src/db/schema", type: "dir", children: schemas },
      ]},
      { path: "src/pages", type: "dir", children: pages },
      { path: "src/components", type: "dir", children: [
        { path: "src/components/Header.tsx", type: "file", description: "Top navigation", content: `export function Header() { return <header>App</header>; }\n` },
        { path: "src/components/Footer.tsx", type: "file", description: "Footer", content: `export function Footer() { return <footer>(c) App</footer>; }\n` },
      ]},
    ]},
  ];
}

const DOMAIN_STACK: Record<string, TechStackItem[]> = {
  ecommerce: [
    { category: "Frontend", choice: "Next.js + TypeScript", reason: "SSR for SEO and product pages" },
    { category: "Backend", choice: "Node.js + Express", reason: "Mature ecosystem for APIs and payments" },
    { category: "Database", choice: "PostgreSQL", reason: "Transactional integrity for orders" },
    { category: "Payments", choice: "Stripe", reason: "Standard for online checkout" },
    { category: "Cache", choice: "Redis", reason: "Cart and session storage" },
  ],
  blog: [
    { category: "Frontend", choice: "Next.js + MDX", reason: "Static rendering for posts and SEO" },
    { category: "Backend", choice: "Node.js + Express", reason: "Lightweight API for CMS endpoints" },
    { category: "Database", choice: "PostgreSQL", reason: "Reliable storage for posts and comments" },
  ],
  social: [
    { category: "Frontend", choice: "React + Vite + TypeScript", reason: "Highly interactive SPA" },
    { category: "Backend", choice: "Node.js + Express + Socket.IO", reason: "Realtime for chats/feeds" },
    { category: "Database", choice: "PostgreSQL + Redis", reason: "Persistent data plus realtime fan-out" },
  ],
  saas: [
    { category: "Frontend", choice: "React + Vite + TypeScript", reason: "Multi-tenant dashboards" },
    { category: "Backend", choice: "Node.js + Express", reason: "Tenant-aware API" },
    { category: "Database", choice: "PostgreSQL", reason: "Row-level security and JSONB" },
    { category: "Billing", choice: "Stripe Billing", reason: "Subscriptions and invoicing" },
    { category: "Auth", choice: "Clerk", reason: "Hosted multi-tenant auth" },
  ],
  task: [
    { category: "Frontend", choice: "React + Vite + TypeScript", reason: "Drag-and-drop boards, realtime updates" },
    { category: "Backend", choice: "Node.js + Express", reason: "Simple REST + websockets for collab" },
    { category: "Database", choice: "PostgreSQL", reason: "Structured task/project data" },
  ],
  generic: [
    { category: "Frontend", choice: "React + Vite + TypeScript", reason: "Type safety, fast builds" },
    { category: "Backend", choice: "Node.js + Express", reason: "JavaScript ecosystem, async I/O" },
    { category: "Database", choice: "PostgreSQL", reason: "ACID compliance, rich features" },
    { category: "ORM", choice: "Drizzle", reason: "Type-safe SQL builder" },
  ],
};

class AiArchitectService {
  plan(description: string): ArchitecturePlan {
    const desc = description.trim() || "A simple web application";
    const domain = detectDomain(desc);
    const tables = DOMAIN_TABLES[domain];
    return {
      title: deriveTitle(desc),
      description: desc,
      techStack: DOMAIN_STACK[domain],
      fileTree: fileTreeFromTables(tables),
      schema: { tables, relationships: relationshipsFromTables(tables) },
      endpoints: endpointsFromTables(tables),
      components: componentsFromDomain(domain, tables),
    };
  }

  flattenFiles(tree: FileNode[]): { path: string; isDirectory: boolean; content: string }[] {
    const out: { path: string; isDirectory: boolean; content: string }[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === "dir") {
          out.push({ path: n.path, isDirectory: true, content: "" });
          if (n.children) walk(n.children);
        } else {
          out.push({ path: n.path, isDirectory: false, content: n.content ?? "" });
        }
      }
    };
    walk(tree);
    return out;
  }
}

export const aiArchitectService = new AiArchitectService();
