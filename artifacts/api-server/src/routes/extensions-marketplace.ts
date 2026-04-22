import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

interface Extension {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  author: string;
  authorAvatar: string;
  category: string;
  version: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  icon: string;
  tags: string[];
  price: number;
  isPremium: boolean;
  isVerified: boolean;
  isInstalled: boolean;
  createdAt: string;
  updatedAt: string;
}

const extensions: Extension[] = [
  { id: "ext_1", name: "Prettier", slug: "prettier", description: "Opinionated code formatter for consistent styling", longDescription: "Automatically formats your code to maintain consistent style across your entire project. Supports JavaScript, TypeScript, CSS, HTML, JSON, and more.", author: "Prettier Team", authorAvatar: "P", category: "formatters", version: "3.5.1", downloads: 2847561, rating: 4.9, ratingCount: 15243, icon: "Paintbrush", tags: ["formatter", "style", "prettier"], price: 0, isPremium: false, isVerified: true, isInstalled: true, createdAt: "2023-01-15T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z" },
  { id: "ext_2", name: "ESLint", slug: "eslint", description: "Find and fix problems in your JavaScript/TypeScript code", longDescription: "Statically analyzes your code to quickly find problems. Many problems ESLint finds can be automatically fixed.", author: "ESLint Foundation", authorAvatar: "E", category: "linters", version: "9.15.0", downloads: 3156892, rating: 4.8, ratingCount: 18924, icon: "Shield", tags: ["linter", "quality", "javascript"], price: 0, isPremium: false, isVerified: true, isInstalled: true, createdAt: "2023-01-10T00:00:00Z", updatedAt: "2026-04-08T00:00:00Z" },
  { id: "ext_3", name: "GitHub Copilot", slug: "github-copilot", description: "AI pair programmer that suggests code completions", longDescription: "Get AI-based suggestions in real time as you code. Trained on billions of lines of code, GitHub Copilot turns natural language prompts into coding suggestions.", author: "GitHub", authorAvatar: "G", category: "ai", version: "1.245.0", downloads: 1923456, rating: 4.7, ratingCount: 12567, icon: "Bot", tags: ["ai", "autocomplete", "copilot"], price: 10, isPremium: true, isVerified: true, isInstalled: false, createdAt: "2023-06-01T00:00:00Z", updatedAt: "2026-04-15T00:00:00Z" },
  { id: "ext_4", name: "Tailwind CSS IntelliSense", slug: "tailwindcss-intellisense", description: "Intelligent Tailwind CSS tooling for your IDE", longDescription: "Enhances the Tailwind development experience by providing advanced features such as autocomplete, syntax highlighting, and linting.", author: "Tailwind Labs", authorAvatar: "T", category: "css", version: "0.14.5", downloads: 1456789, rating: 4.9, ratingCount: 8934, icon: "Palette", tags: ["tailwind", "css", "autocomplete"], price: 0, isPremium: false, isVerified: true, isInstalled: true, createdAt: "2023-03-20T00:00:00Z", updatedAt: "2026-04-12T00:00:00Z" },
  { id: "ext_5", name: "Docker Integration", slug: "docker", description: "Build, manage, and deploy containerized applications", longDescription: "Makes it easy to create, manage, and debug containerized applications. Provides one-click actions to manage images and containers.", author: "Microsoft", authorAvatar: "M", category: "devops", version: "1.32.0", downloads: 987654, rating: 4.6, ratingCount: 5678, icon: "Container", tags: ["docker", "containers", "devops"], price: 0, isPremium: false, isVerified: true, isInstalled: false, createdAt: "2023-02-14T00:00:00Z", updatedAt: "2026-03-28T00:00:00Z" },
  { id: "ext_6", name: "Live Preview", slug: "live-preview", description: "Real-time preview of your web application in-editor", longDescription: "Hosts a local server in your workspace for you to preview your web projects. Includes live reloading support.", author: "CodeCloud", authorAvatar: "C", category: "preview", version: "2.1.0", downloads: 2345678, rating: 4.8, ratingCount: 11234, icon: "Eye", tags: ["preview", "live", "reload"], price: 0, isPremium: false, isVerified: true, isInstalled: true, createdAt: "2023-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: "ext_7", name: "GitLens", slug: "gitlens", description: "Supercharge Git within your IDE with blame annotations", longDescription: "Helps you to visualize code authorship via Git blame annotations and CodeLens, seamlessly navigate and explore Git repositories.", author: "GitKraken", authorAvatar: "K", category: "git", version: "16.2.0", downloads: 1567890, rating: 4.7, ratingCount: 9876, icon: "GitBranch", tags: ["git", "blame", "history"], price: 0, isPremium: false, isVerified: true, isInstalled: false, createdAt: "2023-04-10T00:00:00Z", updatedAt: "2026-04-14T00:00:00Z" },
  { id: "ext_8", name: "Database Viewer Pro", slug: "db-viewer-pro", description: "Visual database management with ER diagrams and query builder", longDescription: "Advanced database management tool with support for PostgreSQL, MySQL, SQLite, MongoDB. Includes ER diagram visualization and visual query builder.", author: "CodeCloud", authorAvatar: "C", category: "database", version: "3.0.0", downloads: 876543, rating: 4.9, ratingCount: 4567, icon: "Database", tags: ["database", "sql", "viewer"], price: 5, isPremium: true, isVerified: true, isInstalled: false, createdAt: "2023-07-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: "ext_9", name: "REST Client", slug: "rest-client", description: "Send HTTP requests and view responses directly in editor", longDescription: "Allows you to send HTTP request and view the response in the editor directly. Supports cURL, GraphQL, and environment variables.", author: "Community", authorAvatar: "R", category: "api", version: "0.26.0", downloads: 1234567, rating: 4.6, ratingCount: 7654, icon: "Send", tags: ["rest", "api", "http"], price: 0, isPremium: false, isVerified: false, isInstalled: false, createdAt: "2023-05-15T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: "ext_10", name: "AI Test Generator", slug: "ai-test-gen", description: "Automatically generate unit tests using AI", longDescription: "Uses advanced AI models to analyze your code and automatically generate comprehensive unit tests. Supports Jest, Vitest, Mocha, and more.", author: "CodeCloud", authorAvatar: "C", category: "testing", version: "1.5.0", downloads: 654321, rating: 4.5, ratingCount: 3456, icon: "FlaskConical", tags: ["testing", "ai", "unit-tests"], price: 8, isPremium: true, isVerified: true, isInstalled: false, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2026-04-11T00:00:00Z" },
  { id: "ext_11", name: "Vim Keybindings", slug: "vim", description: "Vim emulation for the code editor", longDescription: "Provides Vim emulation for the code editor, supporting normal, insert, and visual modes with common Vim commands.", author: "Community", authorAvatar: "V", category: "keybindings", version: "1.28.0", downloads: 543210, rating: 4.4, ratingCount: 2345, icon: "Terminal", tags: ["vim", "keybindings", "editor"], price: 0, isPremium: false, isVerified: false, isInstalled: false, createdAt: "2023-08-01T00:00:00Z", updatedAt: "2026-02-15T00:00:00Z" },
  { id: "ext_12", name: "Figma to Code", slug: "figma-to-code", description: "Convert Figma designs directly into production-ready React code", longDescription: "Import Figma designs and automatically generate clean, responsive React/Tailwind components. Supports auto-layout, variants, and design tokens.", author: "CodeCloud", authorAvatar: "C", category: "design", version: "2.0.0", downloads: 432198, rating: 4.8, ratingCount: 2890, icon: "Figma", tags: ["figma", "design", "code-gen"], price: 12, isPremium: true, isVerified: true, isInstalled: false, createdAt: "2024-06-01T00:00:00Z", updatedAt: "2026-04-18T00:00:00Z" },
];

router.get("/extensions-marketplace", async (_req, res): Promise<void> => {
  const category = (_req.query.category as string) || "all";
  const search = (_req.query.search as string) || "";
  const sort = (_req.query.sort as string) || "popular";
  let filtered = [...extensions];
  if (category !== "all") filtered = filtered.filter((e) => e.category === category);
  if (search) filtered = filtered.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()));
  if (sort === "popular") filtered.sort((a, b) => b.downloads - a.downloads);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === "newest") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const categories = [...new Set(extensions.map((e) => e.category))];
  res.json({ extensions: filtered, categories, total: filtered.length });
});

router.get("/extensions-marketplace/:slug", async (req, res): Promise<void> => {
  const ext = extensions.find((e) => e.slug === req.params.slug);
  if (!ext) { res.status(404).json({ error: "Extension not found" }); return; }
  res.json({ extension: ext });
});

router.post("/extensions-marketplace/:slug/install", requireAuth, async (req, res): Promise<void> => {
  const ext = extensions.find((e) => e.slug === req.params.slug);
  if (!ext) { res.status(404).json({ error: "Extension not found" }); return; }
  ext.isInstalled = true;
  ext.downloads += 1;
  res.json({ success: true, extension: ext });
});

router.post("/extensions-marketplace/:slug/uninstall", requireAuth, async (req, res): Promise<void> => {
  const ext = extensions.find((e) => e.slug === req.params.slug);
  if (!ext) { res.status(404).json({ error: "Extension not found" }); return; }
  ext.isInstalled = false;
  res.json({ success: true });
});

export default router;
