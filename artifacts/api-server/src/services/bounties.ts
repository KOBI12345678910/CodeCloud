export type BountyStatus = "open" | "in_progress" | "completed" | "cancelled";
export type BountyDifficulty = "easy" | "medium" | "hard" | "expert";

export interface BountyApplication {
  id: string;
  bountyId: string;
  applicantId: string;
  applicantName: string;
  message: string;
  createdAt: Date;
  status: "pending" | "accepted" | "rejected";
}

export interface BountyReview {
  id: string;
  bountyId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetUsd: number;
  difficulty: BountyDifficulty;
  status: BountyStatus;
  posterId: string;
  posterName: string;
  assigneeId?: string;
  assigneeName?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  applications: BountyApplication[];
  reviews: BountyReview[];
}

const SAMPLE_TAGS = ["react", "node", "python", "design", "devops", "ai", "rust", "go", "ui"];

class BountyService {
  private bounties = new Map<string, Bounty>();
  private seeded = false;

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.seeded) return;
    this.seeded = true;
    const samples: Array<Partial<Bounty> & Pick<Bounty, "title" | "description" | "category" | "budgetUsd" | "difficulty">> = [
      { title: "Migrate legacy Express API to Fastify", description: "Help migrate a 30-route Express service to Fastify with full test parity. We have CI in place.", category: "backend", budgetUsd: 1500, difficulty: "hard", tags: ["node", "fastify"] },
      { title: "Design a marketing landing page", description: "Looking for a Figma file + production-ready React/Tailwind landing for an open-source dev tool.", category: "design", budgetUsd: 800, difficulty: "medium", tags: ["design", "ui", "tailwind"] },
      { title: "Add Stripe metered billing to side project", description: "I need help wiring metered billing using Stripe usage records, with a webhook handler in Node.", category: "backend", budgetUsd: 600, difficulty: "medium", tags: ["node", "stripe", "billing"] },
      { title: "Optimize Postgres query for 50M rows", description: "Slow analytics query on a large events table. Looking for a battle-tested DB engineer.", category: "database", budgetUsd: 1200, difficulty: "expert", tags: ["postgres", "performance"] },
      { title: "Build a small CLI in Rust", description: "Wrap an existing REST API into an ergonomic CLI tool with subcommands and JSON output.", category: "tools", budgetUsd: 900, difficulty: "medium", tags: ["rust", "cli"] },
      { title: "Write unit tests for our React component library", description: "About 40 components, mostly form inputs. Vitest + React Testing Library.", category: "testing", budgetUsd: 700, difficulty: "easy", tags: ["react", "vitest"] },
    ];
    samples.forEach((s, i) => {
      const id = `bnty-seed-${i + 1}`;
      const now = new Date(Date.now() - (samples.length - i) * 1000 * 60 * 60 * 24);
      this.bounties.set(id, {
        id,
        title: s.title,
        description: s.description,
        category: s.category,
        budgetUsd: s.budgetUsd,
        difficulty: s.difficulty,
        status: i === 0 ? "in_progress" : i === samples.length - 1 ? "completed" : "open",
        posterId: `seed-poster-${i + 1}`,
        posterName: `community-${i + 1}`,
        tags: s.tags || [SAMPLE_TAGS[i % SAMPLE_TAGS.length]!],
        createdAt: now,
        updatedAt: now,
        applications: [],
        reviews: i === samples.length - 1
          ? [{ id: `rev-seed-${i}`, bountyId: id, reviewerId: "seed-poster", reviewerName: "Original poster", rating: 5, comment: "Delivered ahead of schedule. Would hire again.", createdAt: now }]
          : [],
      });
    });
  }

  list(filters: { category?: string; minBudget?: number; maxBudget?: number; difficulty?: BountyDifficulty; status?: BountyStatus; q?: string } = {}): Bounty[] {
    let arr = Array.from(this.bounties.values());
    if (filters.category) arr = arr.filter((b) => b.category === filters.category);
    if (typeof filters.minBudget === "number") arr = arr.filter((b) => b.budgetUsd >= filters.minBudget!);
    if (typeof filters.maxBudget === "number") arr = arr.filter((b) => b.budgetUsd <= filters.maxBudget!);
    if (filters.difficulty) arr = arr.filter((b) => b.difficulty === filters.difficulty);
    if (filters.status) arr = arr.filter((b) => b.status === filters.status);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      arr = arr.filter((b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  get(id: string): Bounty | undefined {
    return this.bounties.get(id);
  }

  create(input: { title: string; description: string; category: string; budgetUsd: number; difficulty: BountyDifficulty; tags?: string[]; posterId: string; posterName: string }): Bounty {
    const id = `bnty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const b: Bounty = {
      id,
      title: input.title,
      description: input.description,
      category: input.category,
      budgetUsd: input.budgetUsd,
      difficulty: input.difficulty,
      status: "open",
      posterId: input.posterId,
      posterName: input.posterName,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
      applications: [],
      reviews: [],
    };
    this.bounties.set(id, b);
    return b;
  }

  apply(bountyId: string, input: { applicantId: string; applicantName: string; message: string }): BountyApplication | null {
    const b = this.bounties.get(bountyId);
    if (!b || b.status !== "open") return null;
    const app: BountyApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bountyId,
      applicantId: input.applicantId,
      applicantName: input.applicantName,
      message: input.message,
      createdAt: new Date(),
      status: "pending",
    };
    b.applications.push(app);
    b.updatedAt = new Date();
    return app;
  }

  setStatus(bountyId: string, status: BountyStatus, assigneeId?: string, assigneeName?: string): Bounty | null {
    const b = this.bounties.get(bountyId);
    if (!b) return null;
    if (assigneeId && !b.applications.find((a) => a.applicantId === assigneeId)) return null;
    b.status = status;
    if (assigneeId) b.assigneeId = assigneeId;
    if (assigneeName) b.assigneeName = assigneeName;
    b.updatedAt = new Date();
    return b;
  }

  canReview(bountyId: string, userId: string): boolean {
    const b = this.bounties.get(bountyId);
    if (!b || b.status !== "completed") return false;
    return b.posterId === userId || b.assigneeId === userId;
  }

  review(bountyId: string, input: { reviewerId: string; reviewerName: string; rating: number; comment: string }): BountyReview | null {
    const b = this.bounties.get(bountyId);
    if (!b || b.status !== "completed") return null;
    if (b.posterId !== input.reviewerId && b.assigneeId !== input.reviewerId) return null;
    if (b.reviews.some((r) => r.reviewerId === input.reviewerId)) return null;
    const r: BountyReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bountyId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      rating: Math.max(1, Math.min(5, input.rating)),
      comment: input.comment,
      createdAt: new Date(),
    };
    b.reviews.push(r);
    return r;
  }

  averageRating(bountyId: string): number {
    const b = this.bounties.get(bountyId);
    if (!b || b.reviews.length === 0) return 0;
    return b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length;
  }
}

export const bountyService = new BountyService();
