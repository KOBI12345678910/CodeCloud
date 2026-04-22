export interface SocialCard {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "website" | "article";
  twitterCard: "summary" | "summary_large_image";
  siteName: string;
}

class SocialCardsService {
  generate(project: { name: string; description: string; url: string; language?: string; stars?: number; forks?: number }): SocialCard {
    return {
      title: project.name,
      description: project.description.slice(0, 200),
      image: `https://opengraph.githubassets.com/1/${encodeURIComponent(project.name)}`,
      url: project.url,
      type: "website",
      twitterCard: "summary_large_image",
      siteName: "CodeCloud",
    };
  }

  getMetaTags(card: SocialCard): string {
    return [
      `<meta property="og:title" content="${card.title}" />`,
      `<meta property="og:description" content="${card.description}" />`,
      `<meta property="og:image" content="${card.image}" />`,
      `<meta property="og:url" content="${card.url}" />`,
      `<meta property="og:type" content="${card.type}" />`,
      `<meta property="og:site_name" content="${card.siteName}" />`,
      `<meta name="twitter:card" content="${card.twitterCard}" />`,
      `<meta name="twitter:title" content="${card.title}" />`,
      `<meta name="twitter:description" content="${card.description}" />`,
      `<meta name="twitter:image" content="${card.image}" />`,
    ].join("\n");
  }
}

export const socialCardsService = new SocialCardsService();
