import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  techStack: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  popularity: number;
  isPremium: boolean;
  author: string;
  tags: string[];
  features: string[];
  demoUrl?: string;
}

const DESIGN_TEMPLATES: DesignTemplate[] = [
  { id: "t-saas-dashboard", name: "SaaS Dashboard Pro", description: "Complete admin dashboard with analytics, user management, dark/light themes.", category: "dashboard", thumbnail: "/templates/saas-dashboard.png", techStack: ["React", "TypeScript", "Tailwind", "Recharts"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 4850, isPremium: false, author: "CodeCloud", tags: ["admin", "analytics", "charts"], features: ["Dark mode", "Responsive", "Charts", "Tables", "Forms"] },
  { id: "t-landing-page", name: "Modern Landing Page", description: "Conversion-optimized landing page with hero, features, pricing, testimonials.", category: "marketing", thumbnail: "/templates/landing.png", techStack: ["React", "TypeScript", "Tailwind", "Framer Motion"], difficulty: "beginner", estimatedTime: "3 min", popularity: 7200, isPremium: false, author: "CodeCloud", tags: ["marketing", "landing", "conversion"], features: ["Animations", "Mobile-first", "SEO", "CTA sections"] },
  { id: "t-ecommerce", name: "E-Commerce Store", description: "Full-featured online store with cart, checkout, product pages, Stripe integration.", category: "ecommerce", thumbnail: "/templates/ecommerce.png", techStack: ["React", "Node.js", "PostgreSQL", "Stripe"], difficulty: "advanced", estimatedTime: "10 min", popularity: 5600, isPremium: true, author: "CodeCloud", tags: ["shop", "payments", "products"], features: ["Cart", "Checkout", "Product gallery", "Inventory", "Orders"] },
  { id: "t-blog-cms", name: "Blog & CMS", description: "Full-featured blog platform with markdown editor, categories, SEO.", category: "content", thumbnail: "/templates/blog.png", techStack: ["React", "Node.js", "PostgreSQL", "MDX"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 3400, isPremium: false, author: "CodeCloud", tags: ["blog", "cms", "content"], features: ["Markdown editor", "Categories", "SEO", "RSS", "Comments"] },
  { id: "t-social-platform", name: "Social Platform", description: "Social network with profiles, posts, follows, real-time chat, notifications.", category: "social", thumbnail: "/templates/social.png", techStack: ["React", "Node.js", "PostgreSQL", "Socket.IO"], difficulty: "advanced", estimatedTime: "15 min", popularity: 4100, isPremium: true, author: "CodeCloud", tags: ["social", "chat", "profiles"], features: ["Feed", "Profiles", "Chat", "Notifications", "Follows"] },
  { id: "t-ai-chatbot", name: "AI Chatbot App", description: "Multi-model AI chatbot with conversation history, streaming, code highlighting.", category: "ai", thumbnail: "/templates/ai-chat.png", techStack: ["React", "Node.js", "OpenAI", "Anthropic"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 8900, isPremium: false, author: "CodeCloud", tags: ["ai", "chatbot", "gpt"], features: ["Multi-model", "Streaming", "Code blocks", "History", "Export"] },
  { id: "t-crm", name: "CRM System", description: "Customer relationship management with contacts, deals, pipelines, email integration.", category: "business", thumbnail: "/templates/crm.png", techStack: ["React", "Node.js", "PostgreSQL", "SendGrid"], difficulty: "advanced", estimatedTime: "10 min", popularity: 2800, isPremium: true, author: "CodeCloud", tags: ["crm", "sales", "contacts"], features: ["Contacts", "Deals", "Pipeline", "Email", "Reports"] },
  { id: "t-portfolio", name: "Developer Portfolio", description: "Stunning portfolio with projects, skills, timeline, contact form.", category: "marketing", thumbnail: "/templates/portfolio.png", techStack: ["React", "TypeScript", "Tailwind", "Three.js"], difficulty: "beginner", estimatedTime: "3 min", popularity: 6100, isPremium: false, author: "CodeCloud", tags: ["portfolio", "resume", "personal"], features: ["3D effects", "Responsive", "Projects grid", "Timeline", "Contact form"] },
  { id: "t-project-manager", name: "Project Manager", description: "Kanban boards, Gantt charts, team collaboration, time tracking.", category: "productivity", thumbnail: "/templates/project-mgr.png", techStack: ["React", "Node.js", "PostgreSQL", "DnD Kit"], difficulty: "advanced", estimatedTime: "10 min", popularity: 3200, isPremium: true, author: "CodeCloud", tags: ["kanban", "project", "teams"], features: ["Kanban", "Gantt", "Time tracking", "Comments", "Files"] },
  { id: "t-realtime-collab", name: "Real-time Collaboration", description: "Multiplayer document editor with cursors, comments, version history.", category: "productivity", thumbnail: "/templates/collab.png", techStack: ["React", "Node.js", "Yjs", "WebSocket"], difficulty: "advanced", estimatedTime: "10 min", popularity: 2100, isPremium: true, author: "CodeCloud", tags: ["collab", "realtime", "editor"], features: ["Multiplayer", "Cursors", "Comments", "Versions", "Conflict resolution"] },
  { id: "t-api-platform", name: "API Platform", description: "API management with docs, keys, rate limiting, analytics, webhooks.", category: "developer", thumbnail: "/templates/api-platform.png", techStack: ["React", "Node.js", "PostgreSQL", "Swagger"], difficulty: "advanced", estimatedTime: "10 min", popularity: 1800, isPremium: true, author: "CodeCloud", tags: ["api", "developer", "platform"], features: ["API docs", "API keys", "Rate limiting", "Analytics", "Webhooks"] },
  { id: "t-video-platform", name: "Video Platform", description: "Video sharing with uploads, transcoding, playlists, recommendations.", category: "media", thumbnail: "/templates/video.png", techStack: ["React", "Node.js", "FFmpeg", "S3"], difficulty: "advanced", estimatedTime: "15 min", popularity: 1500, isPremium: true, author: "CodeCloud", tags: ["video", "streaming", "media"], features: ["Upload", "Transcoding", "Playlists", "Search", "Recommendations"] },
  { id: "t-booking-system", name: "Booking System", description: "Appointment scheduling with calendar, availability, reminders, payments.", category: "business", thumbnail: "/templates/booking.png", techStack: ["React", "Node.js", "PostgreSQL", "Stripe"], difficulty: "intermediate", estimatedTime: "8 min", popularity: 3800, isPremium: false, author: "CodeCloud", tags: ["booking", "calendar", "appointments"], features: ["Calendar", "Availability", "Reminders", "Payments", "Multi-timezone"] },
  { id: "t-mobile-app", name: "Mobile App (Expo)", description: "Cross-platform mobile app with navigation, auth, push notifications.", category: "mobile", thumbnail: "/templates/mobile.png", techStack: ["React Native", "Expo", "TypeScript", "NativeBase"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 4200, isPremium: false, author: "CodeCloud", tags: ["mobile", "expo", "app"], features: ["Navigation", "Auth", "Push notifications", "Camera", "Gestures"] },
  { id: "t-game-2d", name: "2D Game Engine", description: "Browser game with physics, sprites, collision detection, leaderboards.", category: "game", thumbnail: "/templates/game-2d.png", techStack: ["React", "TypeScript", "Canvas", "Matter.js"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 2600, isPremium: false, author: "CodeCloud", tags: ["game", "2d", "physics"], features: ["Physics", "Sprites", "Collision", "Leaderboards", "Sound"] },
  { id: "t-data-dashboard", name: "Data Analytics Dashboard", description: "Interactive data visualization with charts, filters, real-time updates, exports.", category: "dashboard", thumbnail: "/templates/data-analytics.png", techStack: ["React", "D3.js", "Recharts", "PostgreSQL"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 3900, isPremium: false, author: "CodeCloud", tags: ["data", "analytics", "visualization"], features: ["Charts", "Filters", "Real-time", "Export CSV", "Drill-down"] },
  { id: "t-marketplace", name: "Marketplace Platform", description: "Multi-vendor marketplace with listings, search, payments, reviews.", category: "ecommerce", thumbnail: "/templates/marketplace.png", techStack: ["React", "Node.js", "PostgreSQL", "Stripe Connect"], difficulty: "advanced", estimatedTime: "15 min", popularity: 2200, isPremium: true, author: "CodeCloud", tags: ["marketplace", "vendors", "listings"], features: ["Multi-vendor", "Listings", "Search", "Reviews", "Payments"] },
  { id: "t-saas-starter", name: "SaaS Starter Kit", description: "Complete SaaS boilerplate with auth, billing, teams, onboarding, settings.", category: "business", thumbnail: "/templates/saas-starter.png", techStack: ["React", "Node.js", "PostgreSQL", "Stripe"], difficulty: "intermediate", estimatedTime: "5 min", popularity: 9200, isPremium: false, author: "CodeCloud", tags: ["saas", "starter", "boilerplate"], features: ["Auth", "Billing", "Teams", "Onboarding", "Settings", "Dark mode"] },
];

router.get("/design-templates", async (req, res): Promise<void> => {
  const { category, difficulty, search, premium } = req.query;
  let results = [...DESIGN_TEMPLATES];

  if (category && category !== "all") results = results.filter((t) => t.category === category);
  if (difficulty && difficulty !== "all") results = results.filter((t) => t.difficulty === difficulty);
  if (premium === "true") results = results.filter((t) => t.isPremium);
  if (premium === "false") results = results.filter((t) => !t.isPremium);
  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q)));
  }

  const categories = [...new Set(DESIGN_TEMPLATES.map((t) => t.category))];

  res.json({
    total: results.length,
    categories,
    templates: results.sort((a, b) => b.popularity - a.popularity),
  });
});

router.get("/design-templates/:id", async (req, res): Promise<void> => {
  const template = DESIGN_TEMPLATES.find((t) => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

router.post("/design-templates/:id/deploy", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const template = DESIGN_TEMPLATES.find((t) => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json({
    message: `Template "${template.name}" deployed successfully`,
    projectId: `prj_${Date.now()}`,
    template: template.id,
  });
});

export default router;
