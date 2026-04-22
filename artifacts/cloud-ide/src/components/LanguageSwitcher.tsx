import { useMemo, useState } from "react";
import { Check, Globe, Languages, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTranslation, LANGUAGES } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "icon" | "compact" | "full";
  align?: "start" | "center" | "end";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "icon",
  align = "end",
  className = "",
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const filtered = useMemo(() => {
    if (!query.trim()) return LANGUAGES;
    const q = query.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q),
    );
  }, [query]);

  const trigger =
    variant === "full" ? (
      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 ${className}`}
        data-testid="language-switcher-trigger"
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm">{current.nativeName}</span>
        {i18n.isMachine && (
          <Badge variant="outline" className="text-[10px]">
            {t("common.machineTranslation")}
          </Badge>
        )}
      </Button>
    ) : variant === "compact" ? (
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 px-2 ${className}`}
        data-testid="language-switcher-trigger"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs uppercase">{current.code}</span>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className={`h-9 w-9 ${className}`}
        title={t("language.switcher.label")}
        aria-label={t("language.switcher.label")}
        data-testid="language-switcher-trigger"
      >
        <Globe className="w-4 h-4" />
      </Button>
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 p-0" data-testid="language-switcher-menu">
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("language.switcher.search")}
              className="w-full text-sm pl-7 pr-2 py-1.5 bg-transparent border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
              data-testid="language-switcher-search"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("language.switcher.empty")}
            </div>
          ) : (
            filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setOpen(false);
                }}
                dir={lang.dir}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left ${
                  lang.code === current.code ? "bg-accent/50" : ""
                }`}
                data-testid={`language-option-${lang.code}`}
              >
                <span className="flex-1 truncate">{lang.nativeName}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{lang.code}</span>
                {!lang.hand && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600">MT</span>
                )}
                {lang.code === current.code && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))
          )}
        </div>
        {i18n.isMachine && (
          <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>{t("common.machineTranslation")}</span>
            <a
              href="https://github.com/codecloud/i18n"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("common.suggestImprovement")}
            </a>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
