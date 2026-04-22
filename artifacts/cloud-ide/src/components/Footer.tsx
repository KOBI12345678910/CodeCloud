import { Link } from "wouter";
import { Code2, Github, Twitter, MessageCircle } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/explore" },
      { label: "Templates", href: "/explore?tab=templates" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "API Reference", href: "/api-docs" },
      { label: "Blog", href: "/blog" },
      { label: "Status", href: "/status" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/support" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Compliance", href: "/compliance" },
    ],
  },
];

const SOCIALS = [
  { label: "GitHub", icon: Github, href: "https://github.com" },
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "Discord", icon: MessageCircle, href: "https://discord.com" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30" data-testid="app-footer">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer mb-4" data-testid="footer-logo">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">CodeCloud</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Build, run, and deploy code from anywhere. The cloud IDE for modern developers.
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={s.label}
                  data-testid={`social-${s.label.toLowerCase()}`}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold mb-3" data-testid={`footer-col-${col.title.toLowerCase()}`}>
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") || link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground" data-testid="footer-copyright">
            &copy; {new Date().getFullYear()} CodeCloud. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy">
              <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
            </Link>
            <Link href="/terms">
              <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
            </Link>
            <Link href="/compliance">
              <span className="hover:text-foreground transition-colors cursor-pointer">Compliance</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
