import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { deploymentsTable, projectsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const BLOG_POSTS = [
  { slug: "cold-starts", title: "How we cut cold-start times by 73%", category: "Engineering", excerpt: "A behind-the-scenes look at the container snapshotting work that makes CodeCloud feel instant.", date: new Date("2026-04-18"), author: "Maya Chen" },
  { slug: "ai-pair", title: "Introducing AI pair-programming", category: "Product", excerpt: "Inline completions, refactors, and explanations powered by your private workspace context.", date: new Date("2026-04-09"), author: "Daniel Park" },
  { slug: "100k", title: "100,000 developers and counting", category: "Community", excerpt: "A note of thanks to the community that has grown around CodeCloud.", date: new Date("2026-03-28"), author: "Sara Lopez" },
  { slug: "collab-editor", title: "Designing the new collaborative editor", category: "Engineering", excerpt: "How we re-architected real-time collaboration to scale from two devs to two hundred.", date: new Date("2026-03-14"), author: "Andre Müller" },
];

const CHANGELOG_ENTRIES = [
  { version: "1.5.0", date: new Date("2026-04-16"), title: "Search, Explore & Bounties", summary: "Global Cmd+K search, expanded Explore page, public Bounties marketplace, and richer docs/blog/changelog." },
  { version: "1.4.0", date: new Date("2026-04-10"), title: "Auth & security hardening", summary: "JWT auth, Google OAuth, AES-GCM secrets, project export." },
  { version: "1.3.0", date: new Date("2026-04-05"), title: "Admin & API keys", summary: "Admin panel, API keys, settings tabs, file tree polish." },
  { version: "1.2.0", date: new Date("2026-03-28"), title: "Templates & Explore", summary: "Project templates, Explore page, dashboard stats." },
];

const newsletterSubscribers = new Map<string, { email: string; topic: "blog" | "changelog" | "all"; createdAt: Date }>();

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}

function rssChannel(opts: { title: string; description: string; link: string; items: { title: string; description: string; link: string; guid: string; pubDate: Date; category?: string }[] }): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>`;
  xml += `<title>${escapeXml(opts.title)}</title>`;
  xml += `<link>${escapeXml(opts.link)}</link>`;
  xml += `<description>${escapeXml(opts.description)}</description>`;
  xml += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;
  for (const i of opts.items) {
    xml += `<item><title>${escapeXml(i.title)}</title>`;
    xml += `<link>${escapeXml(i.link)}</link>`;
    xml += `<guid>${escapeXml(i.guid)}</guid>`;
    if (i.category) xml += `<category>${escapeXml(i.category)}</category>`;
    xml += `<description>${escapeXml(i.description)}</description>`;
    xml += `<pubDate>${i.pubDate.toUTCString()}</pubDate></item>`;
  }
  xml += `</channel></rss>`;
  return xml;
}

router.get("/projects/:id/feed.xml", async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { res.status(404).send("Project not found"); return; }
    const deployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.projectId, projectId)).orderBy(desc(deploymentsTable.createdAt)).limit(20);
    const xml = rssChannel({
      title: `${project.name} - Changelog`,
      description: `Deployment feed for ${project.name}`,
      link: `/project/${project.id}`,
      items: deployments.map((d) => ({
        title: `Deployment ${d.status} - v${d.version || "latest"}`,
        description: `Status: ${d.status}`,
        link: `/project/${project.id}`,
        guid: d.id,
        pubDate: new Date(d.createdAt),
      })),
    });
    res.type("application/rss+xml").send(xml);
  } catch (err: any) { res.status(500).send(err.message); }
});

router.get("/blog/rss.xml", (_req: Request, res: Response): void => {
  const xml = rssChannel({
    title: "CodeCloud Blog",
    description: "Stories, deep dives, and product updates from the CodeCloud team.",
    link: "/blog",
    items: BLOG_POSTS.map((p) => ({
      title: p.title,
      description: p.excerpt,
      link: `/blog/${p.slug}`,
      guid: `blog-${p.slug}`,
      pubDate: p.date,
      category: p.category,
    })),
  });
  res.type("application/rss+xml").send(xml);
});

router.get("/blog/posts", (req: Request, res: Response): void => {
  const cat = (req.query.category as string | undefined)?.toLowerCase();
  const posts = cat && cat !== "all" ? BLOG_POSTS.filter((p) => p.category.toLowerCase() === cat) : BLOG_POSTS;
  res.json({ posts });
});

router.get("/changelog/rss.xml", (_req: Request, res: Response): void => {
  const xml = rssChannel({
    title: "CodeCloud Changelog",
    description: "What's new in CodeCloud — features and fixes.",
    link: "/changelog",
    items: CHANGELOG_ENTRIES.map((e) => ({
      title: `v${e.version} — ${e.title}`,
      description: e.summary,
      link: `/changelog#${e.version}`,
      guid: `changelog-${e.version}`,
      pubDate: e.date,
    })),
  });
  res.type("application/rss+xml").send(xml);
});

router.post("/newsletter/subscribe", (req: Request, res: Response): void => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const topic = (req.body?.topic as "blog" | "changelog" | "all") || "all";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }
  newsletterSubscribers.set(email, { email, topic, createdAt: new Date() });
  res.status(201).json({ ok: true, email, topic });
});

router.get("/newsletter/subscribers/count", (_req: Request, res: Response): void => {
  res.json({ count: newsletterSubscribers.size });
});

export default router;
