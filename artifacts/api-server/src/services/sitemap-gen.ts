import { LANGUAGES } from "@workspace/i18n";

export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  alternates?: { hreflang: string; href: string }[];
}

interface PageInput {
  path: string;
  updatedAt?: Date;
  priority?: number;
  changefreq?: SitemapEntry["changefreq"];
  /** When true, emit per-locale hreflang alternates for this page. */
  i18n?: boolean;
}

class SitemapGenService {
  generate(baseUrl: string, pages: PageInput[]): string {
    const cleanBase = baseUrl.replace(/\/$/, "");
    const entries: SitemapEntry[] = pages.map((p) => {
      const alternates = p.i18n
        ? LANGUAGES.map((l) => ({
            hreflang: l.code,
            href: `${cleanBase}/${l.code}${p.path === "/" ? "" : p.path}`,
          })).concat([{ hreflang: "x-default", href: `${cleanBase}${p.path}` }])
        : undefined;
      return {
        url: `${cleanBase}${p.path}`,
        lastmod: (p.updatedAt || new Date()).toISOString().slice(0, 10),
        changefreq: p.changefreq || "weekly",
        priority: p.priority ?? 0.5,
        alternates,
      };
    });

    const urls = entries
      .map((e) => {
        const alt = e.alternates
          ? e.alternates
              .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
              .join("\n")
          : "";
        return `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>${alt ? "\n" + alt : ""}\n  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
  }

  generateRobotsTxt(baseUrl: string, disallow: string[] = []): string {
    return `User-agent: *\n${disallow.map((d) => `Disallow: ${d}`).join("\n")}\nSitemap: ${baseUrl}/sitemap.xml`;
  }
}

export const sitemapGenService = new SitemapGenService();
