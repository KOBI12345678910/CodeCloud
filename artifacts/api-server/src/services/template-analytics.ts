export interface TemplateUsage {
  templateId: string;
  templateName: string;
  category: string;
  usageCount: number;
  uniqueUsers: number;
  avgRating: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  lastUsed: string;
  feedback: TemplateFeedback[];
}

export interface TemplateFeedback {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TemplateAbTest {
  id: string;
  templateId: string;
  variantA: { description: string; conversions: number; impressions: number };
  variantB: { description: string; conversions: number; impressions: number };
  status: "running" | "completed" | "paused";
  winner?: "A" | "B";
  startedAt: string;
}

export function getTemplateAnalytics(): TemplateUsage[] {
  return [
    { templateId: "t1", templateName: "React + Vite Starter", category: "frontend", usageCount: 12400, uniqueUsers: 8200, avgRating: 4.7, trend: "up", trendPercent: 15, lastUsed: new Date(Date.now() - 300000).toISOString(), feedback: [{ id: "f1", userId: "u1", rating: 5, comment: "Perfect for quick prototyping", createdAt: new Date(Date.now() - 86400000).toISOString() }, { id: "f2", userId: "u2", rating: 4, comment: "Would love TypeScript strict mode by default", createdAt: new Date(Date.now() - 172800000).toISOString() }] },
    { templateId: "t2", templateName: "Express API", category: "backend", usageCount: 9800, uniqueUsers: 6500, avgRating: 4.5, trend: "stable", trendPercent: 2, lastUsed: new Date(Date.now() - 600000).toISOString(), feedback: [{ id: "f3", userId: "u3", rating: 5, comment: "Great structure", createdAt: new Date(Date.now() - 259200000).toISOString() }] },
    { templateId: "t3", templateName: "Full-Stack Next.js", category: "fullstack", usageCount: 15200, uniqueUsers: 10100, avgRating: 4.8, trend: "up", trendPercent: 25, lastUsed: new Date(Date.now() - 120000).toISOString(), feedback: [{ id: "f4", userId: "u4", rating: 5, comment: "Best full-stack template", createdAt: new Date(Date.now() - 43200000).toISOString() }] },
    { templateId: "t4", templateName: "Python Flask", category: "backend", usageCount: 5600, uniqueUsers: 3800, avgRating: 4.2, trend: "down", trendPercent: -8, lastUsed: new Date(Date.now() - 3600000).toISOString(), feedback: [] },
    { templateId: "t5", templateName: "Static HTML/CSS", category: "frontend", usageCount: 3200, uniqueUsers: 2800, avgRating: 4.0, trend: "down", trendPercent: -12, lastUsed: new Date(Date.now() - 7200000).toISOString(), feedback: [] },
    { templateId: "t6", templateName: "Go CLI Tool", category: "backend", usageCount: 2100, uniqueUsers: 1500, avgRating: 4.6, trend: "up", trendPercent: 30, lastUsed: new Date(Date.now() - 1800000).toISOString(), feedback: [{ id: "f5", userId: "u5", rating: 5, comment: "Clean and fast", createdAt: new Date(Date.now() - 345600000).toISOString() }] },
  ];
}

export function getTemplateAbTests(): TemplateAbTest[] {
  return [
    { id: "ab1", templateId: "t1", variantA: { description: "Build modern React apps with Vite", conversions: 620, impressions: 5000 }, variantB: { description: "Lightning-fast React development environment", conversions: 740, impressions: 5000 }, status: "running", startedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "ab2", templateId: "t3", variantA: { description: "Full-stack web apps with Next.js", conversions: 850, impressions: 4000 }, variantB: { description: "Ship production apps in minutes with Next.js", conversions: 920, impressions: 4000 }, status: "completed", winner: "B", startedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  ];
}
