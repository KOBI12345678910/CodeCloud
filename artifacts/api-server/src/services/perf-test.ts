export interface LighthouseResult {
  id: string;
  url: string;
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  metrics: { fcp: number; lcp: number; tbt: number; cls: number; si: number; tti: number };
  suggestions: { title: string; description: string; impact: string }[];
  timestamp: string;
}

export function runLighthouseAudit(url: string): LighthouseResult {
  const perf = Math.floor(Math.random() * 40) + 60;
  const accessibility = Math.floor(Math.random() * 20) + 80;
  const bestPractices = Math.floor(Math.random() * 25) + 75;
  const seo = Math.floor(Math.random() * 15) + 85;

  const suggestions: { title: string; description: string; impact: string }[] = [];
  if (perf < 90) suggestions.push({ title: "Reduce JavaScript bundle size", description: "Consider code splitting and lazy loading", impact: "high" });
  if (perf < 80) suggestions.push({ title: "Optimize images", description: "Use WebP format and lazy load below-fold images", impact: "high" });
  suggestions.push({ title: "Enable text compression", description: "Use gzip or Brotli compression for text assets", impact: "medium" });
  if (perf < 70) suggestions.push({ title: "Minimize main thread work", description: "Reduce long tasks blocking the main thread", impact: "high" });
  suggestions.push({ title: "Serve static assets with efficient cache policy", description: "Set appropriate Cache-Control headers", impact: "medium" });

  return {
    id: crypto.randomUUID(),
    url,
    scores: { performance: perf, accessibility, bestPractices, seo },
    metrics: {
      fcp: Math.random() * 2 + 0.5,
      lcp: Math.random() * 3 + 1,
      tbt: Math.random() * 500 + 50,
      cls: Math.random() * 0.3,
      si: Math.random() * 3 + 1,
      tti: Math.random() * 4 + 1.5,
    },
    suggestions,
    timestamp: new Date().toISOString(),
  };
}
