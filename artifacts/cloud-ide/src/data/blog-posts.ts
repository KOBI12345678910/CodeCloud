export interface BlogPost {
  slug: string;
  date: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "cold-start-73-percent",
    date: "Apr 18, 2026",
    tag: "Engineering",
    title: "How we cut cold-start times by 73%",
    excerpt: "A behind-the-scenes look at the container snapshotting work that makes CodeCloud feel instant.",
    body: [
      "Cold starts are the silent tax on every cloud workspace. When you click 'Open project', every millisecond of latency feels like an eternity. Over the last quarter we spent a focused effort attacking the problem from every angle and shaved 73% off our median cold start.",
      "The biggest win came from container snapshotting. Instead of rebuilding the workspace runtime from a base image on every boot, we now restore from a memory-resident snapshot taken right after the language toolchain is initialized. The first npm install, the first cargo fetch, the first python -m venv — all of it is captured in the snapshot.",
      "We also rewrote the project file hydration layer to use streaming I/O. Files are now lazily mounted from object storage, with a small heuristic to prefetch the entry point and its direct dependencies before the editor renders.",
      "The result: median p50 cold start dropped from 4.1s to 1.1s, and p95 from 9.8s to 2.3s. We're not done — there's still room in the network handshake — but the workspace finally feels instant.",
    ],
  },
  {
    slug: "ai-pair-programming",
    date: "Apr 9, 2026",
    tag: "Product",
    title: "Introducing AI pair-programming",
    excerpt: "Inline completions, refactors, and explanations — all powered by your own private workspace context.",
    body: [
      "Today we're rolling out AI pair-programming to every CodeCloud user. The assistant lives directly in your editor and understands your project — not just the file you're looking at, but the full file tree, your recent terminal output, and the most relevant snippets from across the codebase.",
      "Three modes ship today: inline completion (Tab to accept), chat (open the right panel), and one-click refactors. Everything runs through your own workspace context, so you never have to copy-paste code into a separate AI tool.",
      "Privacy was the hardest part. Your code never leaves your project's encrypted boundary, and prompts are stripped of secrets before being sent to the model.",
    ],
  },
  {
    slug: "100k-developers",
    date: "Mar 28, 2026",
    tag: "Community",
    title: "100,000 developers and counting",
    excerpt: "A note of thanks to the community that's grown around CodeCloud — and what's next.",
    body: [
      "This week we crossed 100,000 active developers building on CodeCloud. Thank you. Every shipped project, every bug report, every late-night Discord thread has shaped what the platform is today.",
      "What's next? More ways to collaborate, deeper AI integration, and serious investment in our self-hosted offering for teams with strict data residency needs. We'll have more to share at the next product update in May.",
    ],
  },
  {
    slug: "collaborative-editor-rearchitecture",
    date: "Mar 14, 2026",
    tag: "Engineering",
    title: "Designing the new collaborative editor",
    excerpt: "How we re-architected real-time collaboration to scale from two devs to two hundred.",
    body: [
      "The original collaborative editor used a simple operational transformation pipeline that worked great for two or three people in a file. Once teams started inviting twenty collaborators into the same project, the cracks showed.",
      "We migrated the entire stack to CRDTs (Yjs under the hood) and introduced a new room manager that gracefully shards traffic across regional relays. Latency for a 20-person session dropped from 800ms to under 100ms, and the document state stays consistent even through aggressive reconnects.",
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
