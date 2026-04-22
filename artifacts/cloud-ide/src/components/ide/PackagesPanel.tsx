import { useMemo, useState } from "react";
import { Package, Plus, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Runtime = "npm" | "pip";

interface InstalledPackage {
  name: string;
  version: string;
  runtime: Runtime;
}

const SUGGESTIONS: Record<Runtime, string[]> = {
  npm: [
    "react", "react-dom", "next", "vite", "typescript", "express",
    "tailwindcss", "zod", "axios", "lodash", "date-fns", "framer-motion",
    "@tanstack/react-query", "drizzle-orm", "vitest",
  ],
  pip: [
    "requests", "flask", "django", "fastapi", "numpy", "pandas",
    "pytest", "sqlalchemy", "pydantic", "uvicorn", "scikit-learn",
    "matplotlib", "beautifulsoup4", "boto3",
  ],
};

const DEFAULT_PACKAGES: InstalledPackage[] = [
  { name: "react", version: "18.3.1", runtime: "npm" },
  { name: "react-dom", version: "18.3.1", runtime: "npm" },
  { name: "typescript", version: "5.6.3", runtime: "npm" },
  { name: "vite", version: "5.4.10", runtime: "npm" },
];

export default function PackagesPanel() {
  const [runtime, setRuntime] = useState<Runtime>("npm");
  const [packages, setPackages] = useState<InstalledPackage[]>(DEFAULT_PACKAGES);
  const [query, setQuery] = useState("");

  const visiblePackages = useMemo(
    () => packages.filter((p) => p.runtime === runtime),
    [packages, runtime],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as string[];
    const installed = new Set(visiblePackages.map((p) => p.name));
    return SUGGESTIONS[runtime]
      .filter((name) => name.toLowerCase().includes(q) && !installed.has(name))
      .slice(0, 8);
  }, [query, runtime, visiblePackages]);

  const installNamed = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (packages.some((p) => p.name === trimmed && p.runtime === runtime)) return;
    setPackages((prev) => [...prev, { name: trimmed, version: "latest", runtime }]);
    setQuery("");
  };

  const handleRemove = (name: string) => {
    setPackages((prev) => prev.filter((p) => !(p.name === name && p.runtime === runtime)));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-sidebar-border/70 space-y-2">
        <div className="flex rounded-md border border-border/50 overflow-hidden text-[11px]">
          {(["npm", "pip"] as const).map((rt) => (
            <button
              key={rt}
              onClick={() => setRuntime(rt)}
              className={`flex-1 h-6 transition-colors ${
                runtime === rt
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              data-testid={`runtime-${rt}`}
            >
              {rt}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") installNamed(query);
            }}
            placeholder={`Search ${runtime} packages…`}
            className="h-7 pl-7 pr-7 text-xs"
            data-testid="input-search-package"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="rounded-md border border-border/50 bg-popover/60 divide-y divide-border/30" data-testid="search-results">
            {searchResults.map((name) => (
              <button
                key={name}
                onClick={() => installNamed(name)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs hover:bg-accent/40 transition-colors"
                data-testid={`suggestion-${name}`}
              >
                <span className="truncate">{name}</span>
                <Plus className="w-3 h-3 text-primary shrink-0" />
              </button>
            ))}
          </div>
        )}
        {query && searchResults.length === 0 && (
          <Button
            size="sm"
            className="h-7 w-full text-xs gap-1"
            onClick={() => installNamed(query)}
            data-testid="button-install-custom"
          >
            <Plus className="w-3 h-3" /> Install "{query}"
          </Button>
        )}
        <div className="text-[10px] text-muted-foreground">
          {visiblePackages.length} {runtime} package{visiblePackages.length === 1 ? "" : "s"} installed
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {visiblePackages.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No {runtime} packages installed
          </div>
        )}
        {visiblePackages.map((pkg) => (
          <div
            key={`${pkg.runtime}:${pkg.name}`}
            className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40 transition-colors"
            data-testid={`package-row-${pkg.name}`}
          >
            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{pkg.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">{pkg.version}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              onClick={() => handleRemove(pkg.name)}
              title={`Remove ${pkg.name}`}
              data-testid={`button-remove-${pkg.name}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
