import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Code2, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import CommandPalette from "@/components/CommandPalette";

export default function MarketingHeader() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const links = [
    { key: "product", label: t("nav.product"), href: "/product" },
    { key: "solutions", label: t("nav.solutions"), href: "/solutions" },
    { key: "pricing", label: t("nav.pricing"), href: "/pricing" },
    { key: "blog", label: t("nav.blog"), href: "/blog" },
    { key: "careers", label: t("nav.careers"), href: "/careers" },
    { key: "docs", label: t("nav.docs"), href: "/docs" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
          : "bg-transparent border-b border-transparent"
      }`}
      data-testid="marketing-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="marketing-logo">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">CodeCloud</span>
          </div>
        </Link>

        <nav
          className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
          data-testid="marketing-nav"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <button
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
                data-testid={`nav-${link.key}`}
              >
                {link.label}
              </button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2 px-3 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
            data-testid="marketing-search-trigger"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t("nav.search") || "Search"}</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10">⌘K</kbd>
          </button>
          <LanguageSwitcher variant="compact" />
          <Link href="/sign-in">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-foreground/80 hover:text-foreground hover:bg-white/5"
              data-testid="marketing-login"
            >
              {t("auth.signIn")}
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20"
              data-testid="marketing-cta"
            >
              {t("auth.signUp")}
            </Button>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                data-testid="marketing-hamburger"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-background border-border/60">
              <div className="flex items-center gap-2 px-5 h-16 border-b border-border/60">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold tracking-tight">CodeCloud</span>
              </div>
              <nav className="p-4 space-y-1">
                {links.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link href={link.href}>
                      <button className="w-full text-left px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                        {link.label}
                      </button>
                    </Link>
                  </SheetClose>
                ))}
                <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                  <div className="px-3 py-2">
                    <LanguageSwitcher variant="full" align="start" />
                  </div>
                  <SheetClose asChild>
                    <Link href="/sign-in">
                      <Button variant="ghost" className="w-full justify-start">
                        {t("auth.signIn")}
                      </Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/sign-up">
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        {t("auth.signUp")}
                      </Button>
                    </Link>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
