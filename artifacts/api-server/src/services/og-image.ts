export interface SocialCard {
  projectId: string;
  title: string;
  description: string;
  language: string;
  framework?: string;
  stars: number;
  ogImageUrl: string;
  twitterCard: { card: string; title: string; description: string; image: string };
  openGraph: { title: string; description: string; image: string; url: string; type: string };
}

export function generateSocialCard(project: { id: string; name: string; description?: string; language?: string; framework?: string; stars?: number }, baseUrl: string): SocialCard {
  const title = project.name;
  const description = project.description || `A ${project.language || "code"} project on CodeCloud`;
  const ogImageUrl = `${baseUrl}/api/social-cards/${project.id}/og.png`;

  return {
    projectId: project.id,
    title,
    description,
    language: project.language || "JavaScript",
    framework: project.framework,
    stars: project.stars || 0,
    ogImageUrl,
    twitterCard: { card: "summary_large_image", title, description, image: ogImageUrl },
    openGraph: { title, description, image: ogImageUrl, url: `${baseUrl}/project/${project.id}`, type: "website" },
  };
}

export function generateOgMetaTags(card: SocialCard): string {
  return [
    `<meta property="og:title" content="${card.openGraph.title}" />`,
    `<meta property="og:description" content="${card.openGraph.description}" />`,
    `<meta property="og:image" content="${card.openGraph.image}" />`,
    `<meta property="og:url" content="${card.openGraph.url}" />`,
    `<meta property="og:type" content="${card.openGraph.type}" />`,
    `<meta name="twitter:card" content="${card.twitterCard.card}" />`,
    `<meta name="twitter:title" content="${card.twitterCard.title}" />`,
    `<meta name="twitter:description" content="${card.twitterCard.description}" />`,
    `<meta name="twitter:image" content="${card.twitterCard.image}" />`,
  ].join("\n");
}
