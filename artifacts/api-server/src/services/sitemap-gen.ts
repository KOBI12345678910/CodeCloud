export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

class SitemapGenService {
  generate(baseUrl: string, pages: { path: string; updatedAt?: Date; priority?: number; changefreq?: SitemapEntry["changefreq"] }[]): string {
    const entries: SitemapEntry[] = pages.map(p => ({
      url: `${baseUrl}${p.path}`,
      lastmod: (p.updatedAt || new Date()).toISOString().slice(0, 10),
      changefreq: p.changefreq || "weekly",
      priority: p.priority || 0.5,
    }));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(e => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
  }

  generateRobotsTxt(baseUrl: string, disallow: string[] = []): string {
    return `User-agent: *\n${disallow.map(d => `Disallow: ${d}`).join("\n")}\nSitemap: ${baseUrl}/sitemap.xml`;
  }
}

export const sitemapGenService = new SitemapGenService();
