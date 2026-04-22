export interface StarterKit {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  tags: string[];
  features: StarterFeature[];
  stack: StackItem[];
  files: StarterFile[];
  estimatedSetupTime: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  previewImage?: string;
}

export interface StarterFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface StackItem {
  name: string;
  category: "frontend" | "backend" | "database" | "auth" | "payments" | "deployment" | "realtime" | "testing";
  version?: string;
}

export interface StarterFile {
  path: string;
  description: string;
  template: string;
}

export const STARTER_KITS: StarterKit[] = [
  {
    id: "saas-starter",
    name: "SaaS Starter",
    category: "Business",
    description: "Complete SaaS boilerplate with authentication, subscription billing, team management, and admin dashboard. Ready to launch your next SaaS product.",
    icon: "rocket",
    tags: ["saas", "billing", "auth", "dashboard", "teams"],
    difficulty: "intermediate",
    estimatedSetupTime: 15,
    features: [
      { name: "User Authentication", description: "Email/password + social login with Clerk", included: true },
      { name: "Subscription Billing", description: "Stripe integration with plans & invoices", included: true },
      { name: "Admin Dashboard", description: "User management, analytics, settings", included: true },
      { name: "Team Management", description: "Invite members, roles, permissions", included: true },
      { name: "Email Notifications", description: "Transactional emails with templates", included: true },
      { name: "API Rate Limiting", description: "Per-plan rate limits", included: true },
      { name: "Audit Logging", description: "Track all user actions", included: true },
      { name: "Multi-tenancy", description: "Isolated data per organization", included: true },
    ],
    stack: [
      { name: "React", category: "frontend", version: "18" },
      { name: "Vite", category: "frontend", version: "5" },
      { name: "Tailwind CSS", category: "frontend", version: "3" },
      { name: "Express", category: "backend", version: "5" },
      { name: "PostgreSQL", category: "database" },
      { name: "Drizzle ORM", category: "database" },
      { name: "Clerk", category: "auth" },
      { name: "Stripe", category: "payments" },
    ],
    files: [
      { path: "src/pages/dashboard.tsx", description: "Main dashboard with analytics widgets", template: "import { useUser } from '@clerk/react';\n\nexport default function Dashboard() {\n  const { user } = useUser();\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Welcome, {user?.firstName}</h1>\n      {/* Analytics widgets */}\n    </div>\n  );\n}" },
      { path: "src/pages/billing.tsx", description: "Subscription management page", template: "export default function Billing() {\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Billing</h1>\n      {/* Plan selection, invoices */}\n    </div>\n  );\n}" },
      { path: "src/pages/settings.tsx", description: "Account & team settings", template: "export default function Settings() {\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Settings</h1>\n    </div>\n  );\n}" },
      { path: "server/routes/billing.ts", description: "Stripe webhook & billing API", template: "import { Router } from 'express';\nconst router = Router();\n\nrouter.post('/webhook', async (req, res) => {\n  // Handle Stripe webhooks\n});\n\nexport default router;" },
      { path: "server/routes/teams.ts", description: "Team management API", template: "import { Router } from 'express';\nconst router = Router();\n\nrouter.get('/', async (req, res) => {\n  // List team members\n});\n\nexport default router;" },
    ],
  },
  {
    id: "blog-engine",
    name: "Blog Engine",
    category: "Content",
    description: "Full-featured blog platform with markdown support, server-side rendering, SEO optimization, comments, and RSS feed. Perfect for content-driven sites.",
    icon: "pen-tool",
    tags: ["blog", "markdown", "seo", "ssr", "cms"],
    difficulty: "beginner",
    estimatedSetupTime: 10,
    features: [
      { name: "Markdown Editor", description: "Rich markdown editor with live preview", included: true },
      { name: "SEO Optimization", description: "Meta tags, sitemap, structured data", included: true },
      { name: "RSS Feed", description: "Auto-generated Atom/RSS feeds", included: true },
      { name: "Comment System", description: "Threaded comments with moderation", included: true },
      { name: "Categories & Tags", description: "Organize posts with categories and tags", included: true },
      { name: "Search", description: "Full-text search across all posts", included: true },
      { name: "Reading Time", description: "Estimated reading time per post", included: true },
      { name: "Social Sharing", description: "Open Graph images & share buttons", included: true },
    ],
    stack: [
      { name: "React", category: "frontend", version: "18" },
      { name: "Vite", category: "frontend", version: "5" },
      { name: "Tailwind CSS", category: "frontend", version: "3" },
      { name: "Express", category: "backend", version: "5" },
      { name: "PostgreSQL", category: "database" },
      { name: "Drizzle ORM", category: "database" },
    ],
    files: [
      { path: "src/pages/blog/index.tsx", description: "Blog listing page", template: "export default function BlogIndex() {\n  return (\n    <div className=\"max-w-3xl mx-auto p-6\">\n      <h1 className=\"text-3xl font-bold\">Blog</h1>\n      {/* Post listing */}\n    </div>\n  );\n}" },
      { path: "src/pages/blog/[slug].tsx", description: "Individual post page", template: "export default function BlogPost() {\n  return (\n    <article className=\"max-w-3xl mx-auto p-6 prose\">\n      {/* Rendered markdown */}\n    </article>\n  );\n}" },
      { path: "src/components/MarkdownEditor.tsx", description: "Markdown editor with preview", template: "export function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {\n  return <textarea value={value} onChange={e => onChange(e.target.value)} />;\n}" },
      { path: "server/routes/posts.ts", description: "Blog posts CRUD API", template: "import { Router } from 'express';\nconst router = Router();\n\nrouter.get('/', async (req, res) => {\n  // List posts\n});\n\nexport default router;" },
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce Store",
    category: "Business",
    description: "Complete online store with product catalog, shopping cart, payment processing, order management, and admin panel.",
    icon: "shopping-cart",
    tags: ["ecommerce", "payments", "cart", "products", "orders"],
    difficulty: "advanced",
    estimatedSetupTime: 20,
    features: [
      { name: "Product Catalog", description: "Categories, filters, search, variants", included: true },
      { name: "Shopping Cart", description: "Persistent cart with quantity management", included: true },
      { name: "Checkout & Payments", description: "Stripe checkout with multiple payment methods", included: true },
      { name: "Order Management", description: "Order tracking, status updates, history", included: true },
      { name: "Admin Panel", description: "Product management, orders, analytics", included: true },
      { name: "Inventory Tracking", description: "Stock levels, low-stock alerts", included: true },
      { name: "Reviews & Ratings", description: "Customer reviews with star ratings", included: true },
      { name: "Discount Codes", description: "Coupon codes and promotional pricing", included: true },
    ],
    stack: [
      { name: "React", category: "frontend", version: "18" },
      { name: "Vite", category: "frontend", version: "5" },
      { name: "Tailwind CSS", category: "frontend", version: "3" },
      { name: "Express", category: "backend", version: "5" },
      { name: "PostgreSQL", category: "database" },
      { name: "Drizzle ORM", category: "database" },
      { name: "Clerk", category: "auth" },
      { name: "Stripe", category: "payments" },
    ],
    files: [
      { path: "src/pages/shop/index.tsx", description: "Product catalog page", template: "export default function Shop() {\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Shop</h1>\n      {/* Product grid */}\n    </div>\n  );\n}" },
      { path: "src/pages/shop/product/[id].tsx", description: "Product detail page", template: "export default function ProductDetail() {\n  return (\n    <div className=\"p-6\">\n      {/* Product images, description, add to cart */}\n    </div>\n  );\n}" },
      { path: "src/pages/cart.tsx", description: "Shopping cart page", template: "export default function Cart() {\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Cart</h1>\n    </div>\n  );\n}" },
      { path: "src/pages/checkout.tsx", description: "Checkout flow", template: "export default function Checkout() {\n  return (\n    <div className=\"p-6\">\n      <h1 className=\"text-2xl font-bold\">Checkout</h1>\n    </div>\n  );\n}" },
      { path: "server/routes/products.ts", description: "Product CRUD API", template: "import { Router } from 'express';\nconst router = Router();\n\nrouter.get('/', async (req, res) => {\n  // List products\n});\n\nexport default router;" },
      { path: "server/routes/orders.ts", description: "Order management API", template: "import { Router } from 'express';\nconst router = Router();\n\nrouter.post('/', async (req, res) => {\n  // Create order\n});\n\nexport default router;" },
    ],
  },
  {
    id: "chat-app",
    name: "Real-Time Chat App",
    category: "Social",
    description: "Full-featured chat application with real-time messaging, channels, direct messages, file sharing, and online presence indicators.",
    icon: "message-circle",
    tags: ["chat", "websocket", "realtime", "messaging", "social"],
    difficulty: "intermediate",
    estimatedSetupTime: 15,
    features: [
      { name: "Real-Time Messaging", description: "Instant message delivery via WebSocket", included: true },
      { name: "Channels", description: "Public and private channels", included: true },
      { name: "Direct Messages", description: "1-on-1 private conversations", included: true },
      { name: "File Sharing", description: "Upload and share images & files", included: true },
      { name: "Online Presence", description: "See who's online in real-time", included: true },
      { name: "Message Reactions", description: "React to messages with emoji", included: true },
      { name: "Typing Indicators", description: "See when others are typing", included: true },
      { name: "Message Search", description: "Search through message history", included: true },
    ],
    stack: [
      { name: "React", category: "frontend", version: "18" },
      { name: "Vite", category: "frontend", version: "5" },
      { name: "Tailwind CSS", category: "frontend", version: "3" },
      { name: "Express", category: "backend", version: "5" },
      { name: "Socket.io", category: "realtime", version: "4" },
      { name: "PostgreSQL", category: "database" },
      { name: "Drizzle ORM", category: "database" },
      { name: "Clerk", category: "auth" },
    ],
    files: [
      { path: "src/pages/chat/index.tsx", description: "Main chat interface", template: "export default function Chat() {\n  return (\n    <div className=\"flex h-screen\">\n      {/* Sidebar + Message area */}\n    </div>\n  );\n}" },
      { path: "src/components/MessageList.tsx", description: "Message list with virtual scroll", template: "export function MessageList({ messages }: { messages: any[] }) {\n  return <div>{/* Render messages */}</div>;\n}" },
      { path: "src/components/MessageInput.tsx", description: "Message composer with file upload", template: "export function MessageInput({ onSend }: { onSend: (msg: string) => void }) {\n  return <input placeholder=\"Type a message...\" />;\n}" },
      { path: "server/ws/chat.ts", description: "WebSocket chat handler", template: "import { Server } from 'socket.io';\n\nexport function setupChat(io: Server) {\n  io.on('connection', (socket) => {\n    socket.on('message', (data) => {\n      // Broadcast message\n    });\n  });\n}" },
    ],
  },
];

export function getStarterKits(): StarterKit[] {
  return STARTER_KITS;
}

export function getStarterKit(id: string): StarterKit | undefined {
  return STARTER_KITS.find(k => k.id === id);
}

export function getStarterKitsByCategory(category: string): StarterKit[] {
  return STARTER_KITS.filter(k => k.category === category);
}

export function searchStarterKits(query: string): StarterKit[] {
  const q = query.toLowerCase();
  return STARTER_KITS.filter(k =>
    k.name.toLowerCase().includes(q) ||
    k.description.toLowerCase().includes(q) ||
    k.tags.some(t => t.includes(q))
  );
}
