export interface StarterKit {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  stack: string[];
  files: { path: string; content: string }[];
  downloads: number;
  rating: number;
  author: string;
  createdAt: Date;
}

class StarterKitsService {
  private kits: Map<string, StarterKit> = new Map();

  constructor() {
    const defaults: Omit<StarterKit, "id" | "createdAt">[] = [
      { name: "React + Express Fullstack", description: "Production-ready React frontend with Express API", category: "fullstack", tags: ["react", "express", "typescript"], stack: ["React", "Express", "PostgreSQL"], files: [], downloads: 1500, rating: 4.8, author: "codecloud" },
      { name: "Next.js SaaS Starter", description: "SaaS boilerplate with auth, billing, and dashboard", category: "saas", tags: ["nextjs", "stripe", "auth"], stack: ["Next.js", "Prisma", "Stripe"], files: [], downloads: 2200, rating: 4.9, author: "codecloud" },
      { name: "CLI Tool Template", description: "Build command-line tools with TypeScript", category: "cli", tags: ["typescript", "commander", "cli"], stack: ["TypeScript", "Commander"], files: [], downloads: 800, rating: 4.5, author: "codecloud" },
      { name: "REST API Boilerplate", description: "Express API with validation, auth, and testing", category: "api", tags: ["express", "jest", "swagger"], stack: ["Express", "Zod", "JWT"], files: [], downloads: 1800, rating: 4.7, author: "codecloud" },
    ];
    for (const k of defaults) { const id = `kit-${Math.random().toString(36).slice(2, 8)}`; this.kits.set(id, { ...k, id, createdAt: new Date() }); }
  }

  list(category?: string): StarterKit[] {
    const all = Array.from(this.kits.values());
    return category ? all.filter(k => k.category === category) : all;
  }
  get(id: string): StarterKit | null { return this.kits.get(id) || null; }
  search(query: string): StarterKit[] {
    const q = query.toLowerCase();
    return Array.from(this.kits.values()).filter(k => k.name.toLowerCase().includes(q) || k.tags.some(t => t.includes(q)));
  }

  create(data: Omit<StarterKit, "id" | "downloads" | "rating" | "createdAt">): StarterKit {
    const id = `kit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const kit: StarterKit = { ...data, id, downloads: 0, rating: 0, createdAt: new Date() };
    this.kits.set(id, kit);
    return kit;
  }
  delete(id: string): boolean { return this.kits.delete(id); }
}

export const starterKitsService = new StarterKitsService();
