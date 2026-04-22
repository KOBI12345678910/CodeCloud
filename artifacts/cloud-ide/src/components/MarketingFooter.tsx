import { Link } from "wouter";
import { Code2, Lock, Shield, Cloud } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/product" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "API", href: "/api-docs" },
      { label: "Templates", href: "/explore?tab=templates" },
      { label: "Community", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "About", href: "/product" },
      { label: "Contact", href: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/compliance" },
      { label: "Terms", href: "/compliance" },
      { label: "Security", href: "/security" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">CodeCloud</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The cloud IDE for modern software teams.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <span>&copy; {new Date().getFullYear()} CodeCloud. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Encrypted</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> SOC 2</span>
            <span className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> 99.9% Uptime</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
