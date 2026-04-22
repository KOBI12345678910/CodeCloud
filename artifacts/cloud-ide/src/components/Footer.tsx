import { Link } from "wouter";
import { Code2, Github, Twitter, MessageCircle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/i18n";

const SOCIALS = [
  { label: "GitHub", icon: Github, href: "https://github.com" },
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "Discord", icon: MessageCircle, href: "https://discord.com" },
];

export default function Footer() {
  const { t } = useTranslation();
  const COLUMNS = [
    {
      key: "product",
      title: t("footer.product"),
      links: [
        { label: t("footer.features"), href: "/explore" },
        { label: t("footer.templates"), href: "/explore?tab=templates" },
        { label: t("nav.pricing"), href: "/pricing" },
        { label: t("footer.changelog"), href: "/changelog" },
      ],
    },
    {
      key: "resources",
      title: t("footer.resources"),
      links: [
        { label: t("nav.docs"), href: "/docs" },
        { label: t("footer.apiReference"), href: "/api-docs" },
        { label: t("nav.blog"), href: "/blog" },
        { label: t("footer.status"), href: "/status" },
        { label: t("footer.security"), href: "/security" },
      ],
    },
    {
      key: "company",
      title: t("footer.company"),
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("nav.careers"), href: "/careers" },
        { label: t("footer.contact"), href: "/support" },
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
        { label: t("footer.compliance"), href: "/compliance" },
      ],
    },
  ];

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
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 mb-4">
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
            <LanguageSwitcher variant="full" align="start" />
          </div>

          {COLUMNS.map((col) => (
            <div key={col.key}>
              <h3 className="text-sm font-semibold mb-3" data-testid={`footer-col-${col.key}`}>
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground" data-testid="footer-copyright">
            &copy; {new Date().getFullYear()} CodeCloud. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer">{t("footer.privacy")}</span></Link>
            <Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer">{t("footer.terms")}</span></Link>
            <Link href="/compliance"><span className="hover:text-foreground transition-colors cursor-pointer">{t("footer.compliance")}</span></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
