import { Link } from "wouter";
import { Code2, Lock, Shield, Cloud } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/i18n";

export default function MarketingFooter() {
  const { t } = useTranslation();
  const COLS = [
    {
      key: "product",
      title: t("footer.product"),
      links: [
        { label: t("footer.overview"), href: "/product" },
        { label: t("nav.solutions"), href: "/solutions" },
        { label: t("nav.pricing"), href: "/pricing" },
        { label: t("footer.changelog"), href: "/changelog" },
        { label: t("footer.status"), href: "/status" },
      ],
    },
    {
      key: "developers",
      title: t("footer.developers"),
      links: [
        { label: t("nav.docs"), href: "/docs" },
        { label: t("footer.api"), href: "/api-docs" },
        { label: t("footer.templates"), href: "/explore?tab=templates" },
        { label: "Bounties", href: "/bounties" },
        { label: t("footer.community"), href: "/blog" },
      ],
    },
    {
      key: "company",
      title: t("footer.company"),
      links: [
        { label: t("nav.blog"), href: "/blog" },
        { label: t("nav.careers"), href: "/careers" },
        { label: t("footer.about"), href: "/product" },
        { label: t("footer.contact"), href: "/support" },
      ],
    },
    {
      key: "legal",
      title: t("footer.legal"),
      links: [
        { label: t("footer.privacy"), href: "/compliance" },
        { label: t("footer.terms"), href: "/compliance" },
        { label: t("footer.security"), href: "/security" },
      ],
    },
  ];

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
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {t("footer.tagline")}
            </p>
            <LanguageSwitcher variant="full" align="start" />
          </div>
          {COLS.map((col) => (
            <div key={col.key}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
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
          <span>&copy; {new Date().getFullYear()} CodeCloud. {t("footer.rights")}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> {t("footer.badge.encrypted")}</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {t("footer.badge.soc2")}</span>
            <span className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> {t("footer.badge.uptime")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
