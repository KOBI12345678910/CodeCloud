import { db, projectsTable, usersTable, templatesTable } from "@workspace/db";
import { sql, eq, and, or, ilike, desc } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

export interface DiscoveryHit {
  id: string;
  type: "project" | "template" | "user" | "doc" | "post";
  title: string;
  subtitle?: string;
  url: string;
  rank?: number;
}

export interface DiscoveryResponse {
  groups: { type: DiscoveryHit["type"]; label: string; hits: DiscoveryHit[] }[];
  query: string;
  took: number;
}

const STORE_PATH = path.join(process.env.SEARCH_STORE_DIR || "/tmp", "search-discovery-store.json");
type Store = { recentByUser: Record<string, string[]>; trending: Record<string, { count: number; lastSeen: number }> };
let store: Store = { recentByUser: {}, trending: {} };
try {
  if (fs.existsSync(STORE_PATH)) {
    store = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    if (!store.recentByUser) store.recentByUser = {};
    if (!store.trending) store.trending = {};
  }
} catch { /* ignore */ }

let writeTimer: NodeJS.Timeout | null = null;
function persist(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try { fs.writeFileSync(STORE_PATH, JSON.stringify(store)); } catch { /* ignore */ }
  }, 1000);
}

const TRENDING_TTL = 1000 * 60 * 60 * 24;

export function trackSearch(query: string, userId?: string): void {
  const q = query.trim().toLowerCase();
  if (!q) return;
  if (userId) {
    const list = store.recentByUser[userId] || [];
    const filtered = list.filter((x) => x !== q);
    filtered.unshift(q);
    store.recentByUser[userId] = filtered.slice(0, 10);
  }
  const cur = store.trending[q];
  store.trending[q] = { count: (cur?.count || 0) + 1, lastSeen: Date.now() };
  persist();
}

export function getRecentSearches(userId?: string): string[] {
  if (!userId) return [];
  return store.recentByUser[userId] || [];
}

export function getTrendingSearches(limit = 8): { query: string; count: number }[] {
  const now = Date.now();
  return Object.entries(store.trending)
    .filter(([, v]) => now - v.lastSeen < TRENDING_TTL)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([query, v]) => ({ query, count: v.count }));
}

const DOC_INDEX = [
  { id: "doc-getting-started", title: "Getting Started", subtitle: "Spin up your first project", url: "/docs#getting-started" },
  { id: "doc-editor", title: "Editor & Shortcuts", subtitle: "Multi-cursor, AI, keymaps", url: "/docs#editor" },
  { id: "doc-deploy", title: "Deployments", subtitle: "Custom domains and SSL", url: "/docs#deploy" },
  { id: "doc-collab", title: "Collaboration", subtitle: "Pair-program in real time", url: "/docs#collab" },
  { id: "doc-api", title: "API Reference", subtitle: "REST endpoints and SDKs", url: "/api-docs" },
  { id: "doc-bounties", title: "Bounties Guide", subtitle: "Post and claim paid work", url: "/docs#bounties" },
  { id: "doc-faq", title: "FAQ", subtitle: "Common questions", url: "/docs#faq" },
];

const POST_INDEX = [
  { id: "post-coldstart", title: "How we cut cold-start times by 73%", subtitle: "Engineering deep dive", url: "/blog/cold-starts" },
  { id: "post-ai-pair", title: "Introducing AI pair-programming", subtitle: "Product update", url: "/blog/ai-pair" },
  { id: "post-100k", title: "100,000 developers and counting", subtitle: "Community milestone", url: "/blog/100k" },
  { id: "post-collab", title: "Designing the new collaborative editor", subtitle: "Engineering", url: "/blog/collab-editor" },
];

function matches(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export async function discoverySearch(opts: {
  query: string;
  userId?: string;
  limit?: number;
}): Promise<DiscoveryResponse> {
  const start = Date.now();
  const q = opts.query.trim();
  const lim = Math.min(opts.limit || 6, 10);
  const lc = q.toLowerCase();

  if (!q) {
    return { groups: [], query: q, took: Date.now() - start };
  }

  const userId = opts.userId || "";
  const accessClause = opts.userId
    ? sql`(p.is_public = true OR p.owner_id = ${userId})`
    : sql`p.is_public = true`;
  const ilikePattern = `%${q.replace(/[%_]/g, (c) => "\\" + c)}%`;

  const [projectsRes, templatesRes, usersRes] = await Promise.all([
    // Projects: PostgreSQL websearch_to_tsquery + ts_rank with ILIKE fallback
    db.execute(sql`
      SELECT p.id, p.name, p.slug, p.description, p.language,
        ts_rank(
          setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(p.language, '')), 'C'),
          websearch_to_tsquery('english', ${q})
        ) AS rank
      FROM projects p
      WHERE p.is_archived = false
        AND ${accessClause}
        AND (
          (
            setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(p.language, '')), 'C')
          ) @@ websearch_to_tsquery('english', ${q})
          OR p.name ILIKE ${ilikePattern}
          OR p.description ILIKE ${ilikePattern}
        )
      ORDER BY rank DESC NULLS LAST, p.updated_at DESC
      LIMIT ${lim}
    `),
    db.execute(sql`
      SELECT t.id, t.name, t.description, t.language,
        ts_rank(
          setweight(to_tsvector('english', coalesce(t.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(t.description, '')), 'B'),
          websearch_to_tsquery('english', ${q})
        ) AS rank
      FROM templates t
      WHERE (
          setweight(to_tsvector('english', coalesce(t.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(t.description, '')), 'B')
        ) @@ websearch_to_tsquery('english', ${q})
        OR t.name ILIKE ${ilikePattern}
        OR t.description ILIKE ${ilikePattern}
      ORDER BY rank DESC NULLS LAST
      LIMIT ${lim}
    `),
    db.execute(sql`
      SELECT u.id, u.username, u.display_name, u.bio,
        ts_rank(
          setweight(to_tsvector('english', coalesce(u.username, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(u.display_name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(u.bio, '')), 'C'),
          websearch_to_tsquery('english', ${q})
        ) AS rank
      FROM users u
      WHERE (
          setweight(to_tsvector('english', coalesce(u.username, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(u.display_name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(u.bio, '')), 'C')
        ) @@ websearch_to_tsquery('english', ${q})
        OR u.username ILIKE ${ilikePattern}
        OR u.display_name ILIKE ${ilikePattern}
      ORDER BY rank DESC NULLS LAST
      LIMIT ${lim}
    `),
  ]);

  const projects = projectsRes.rows as Array<{ id: string; name: string; slug: string; description: string | null; language: string; rank: number }>;
  const templates = templatesRes.rows as Array<{ id: string; name: string; description: string | null; language: string; rank: number }>;
  const users = usersRes.rows as Array<{ id: string; username: string; display_name: string | null; bio: string | null; rank: number }>;

  const groups: DiscoveryResponse["groups"] = [];
  if (projects.length) {
    groups.push({
      type: "project",
      label: "Projects",
      hits: projects.map((p) => ({
        id: p.id, type: "project" as const, title: p.name,
        subtitle: p.description || p.language, url: `/project/${p.id}`,
      })),
    });
  }
  if (templates.length) {
    groups.push({
      type: "template",
      label: "Templates",
      hits: templates.map((t) => ({
        id: t.id, type: "template" as const, title: t.name,
        subtitle: t.description || t.language, url: `/templates?selected=${t.id}`,
      })),
    });
  }
  if (users.length) {
    groups.push({
      type: "user",
      label: "Users",
      hits: users.map((u) => ({
        id: u.id, type: "user" as const, title: u.display_name || u.username,
        subtitle: `@${u.username}`, url: `/profile/${u.username}`,
      })),
    });
  }

  const docHits = DOC_INDEX.filter((d) => matches(d.title, lc) || matches(d.subtitle, lc)).slice(0, lim);
  if (docHits.length) {
    groups.push({
      type: "doc",
      label: "Docs",
      hits: docHits.map((d) => ({ id: d.id, type: "doc" as const, title: d.title, subtitle: d.subtitle, url: d.url })),
    });
  }
  const postHits = POST_INDEX.filter((p) => matches(p.title, lc) || matches(p.subtitle, lc)).slice(0, lim);
  if (postHits.length) {
    groups.push({
      type: "post",
      label: "Community",
      hits: postHits.map((p) => ({ id: p.id, type: "post" as const, title: p.title, subtitle: p.subtitle, url: p.url })),
    });
  }

  trackSearch(q, opts.userId);

  return { groups, query: q, took: Date.now() - start };
}

export async function getTopUsers(limit = 8): Promise<{ id: string; username: string; displayName: string | null; projects: number }[]> {
  const rows = await db.execute(sql`
    SELECT u.id, u.username, u.display_name, count(p.id)::int AS projects
    FROM users u
    LEFT JOIN projects p ON p.owner_id = u.id AND p.is_public = true AND p.is_archived = false
    GROUP BY u.id
    ORDER BY projects DESC, u.created_at DESC
    LIMIT ${limit}
  `);
  return (rows.rows as any[]).map((r) => ({
    id: r.id, username: r.username, displayName: r.display_name, projects: r.projects,
  }));
}

export async function getTagCloud(limit = 24): Promise<{ tag: string; count: number }[]> {
  const rows = await db.execute(sql`
    SELECT language AS tag, count(*)::int AS count
    FROM projects
    WHERE is_public = true AND is_archived = false
    GROUP BY language
    ORDER BY count DESC
    LIMIT ${limit}
  `);
  return rows.rows as { tag: string; count: number }[];
}

export async function getTrendingProjects(window: "day" | "week" | "month" = "week", limit = 12): Promise<any[]> {
  const interval = window === "day" ? sql`'1 day'` : window === "month" ? sql`'30 days'` : sql`'7 days'`;
  const rows = await db.execute(sql`
    SELECT p.id, p.name, p.slug, p.description, p.language, p.owner_id,
           u.username AS owner_name,
           COALESCE((SELECT count(*) FROM stars s WHERE s.project_id = p.id), 0)::int AS stars,
           p.created_at, p.updated_at
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE p.is_public = true AND p.is_archived = false
      AND p.updated_at > NOW() - INTERVAL ${interval}
    ORDER BY stars DESC, p.updated_at DESC
    LIMIT ${limit}
  `);
  return rows.rows;
}
