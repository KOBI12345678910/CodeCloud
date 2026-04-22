import { useState, useEffect, useCallback } from "react";
import {
  Copy, Check, Shield, Rocket, Code2, Star, Scale,
  ChevronDown, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface BadgeInfo {
  svg: string;
  markdown: string;
  html: string;
}

interface AllBadges {
  build: BadgeInfo;
  deploy: BadgeInfo;
  language: BadgeInfo;
  stars: BadgeInfo;
  license: BadgeInfo;
}

const BADGE_META: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  build: { label: "Build Status", icon: Shield, description: "Shows current build/container status" },
  deploy: { label: "Deploy Status", icon: Rocket, description: "Shows latest deployment status" },
  language: { label: "Language", icon: Code2, description: "Shows project language" },
  stars: { label: "Stars", icon: Star, description: "Shows star count" },
  license: { label: "License", icon: Scale, description: "Shows project license" },
};

interface ProjectBadgesProps {
  projectId: string;
  showEmbedCodes?: boolean;
}

export default function ProjectBadges({ projectId, showEmbedCodes = true }: ProjectBadgesProps) {
  const { toast } = useToast();
  const [badges, setBadges] = useState<AllBadges | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyFormat, setCopyFormat] = useState<"markdown" | "html">("markdown");

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/badges/${projectId}/all`);
        if (res.ok) setBadges(await res.json());
      } catch {}
    };
    fetchBadges();
  }, [projectId]);

  const copyCode = useCallback((key: string, format: "markdown" | "html") => {
    if (!badges) return;
    const badge = badges[key as keyof AllBadges];
    const code = format === "markdown" ? badge.markdown : badge.html;
    navigator.clipboard.writeText(code);
    setCopiedKey(`${key}-${format}`);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied to clipboard" });
  }, [badges, toast]);

  const copyAllBadges = useCallback(() => {
    if (!badges) return;
    const keys = Object.keys(badges) as (keyof AllBadges)[];
    const code = keys.map((k) => copyFormat === "markdown" ? badges[k].markdown : badges[k].html).join("\n");
    navigator.clipboard.writeText(code);
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "All badges copied" });
  }, [badges, copyFormat, toast]);

  if (!badges) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center flex-wrap gap-2">
        {Object.keys(badges).map((key) => (
          <img
            key={key}
            src={badges[key as keyof AllBadges].svg}
            alt={BADGE_META[key]?.label || key}
            className="h-5"
          />
        ))}
      </div>

      {showEmbedCodes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Embed Codes</span>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1">
                    {copyFormat === "markdown" ? "Markdown" : "HTML"}
                    <ChevronDown className="w-2.5 h-2.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCopyFormat("markdown")}>Markdown</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCopyFormat("html")}>HTML</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={copyAllBadges}>
                {copiedKey === "all" ? <Check className="w-2.5 h-2.5 mr-1 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 mr-1" />}
                Copy All
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {(Object.keys(badges) as (keyof AllBadges)[]).map((key) => {
              const meta = BADGE_META[key];
              const Icon = meta?.icon || Shield;
              const code = copyFormat === "markdown" ? badges[key].markdown : badges[key].html;
              const copyId = `${key}-${copyFormat}`;
              return (
                <div key={key} className="flex items-center gap-2 group">
                  <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="flex-1 text-[10px] font-mono bg-muted/30 px-2 py-1 rounded truncate text-muted-foreground">
                    {code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyCode(key, copyFormat)}
                  >
                    {copiedKey === copyId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
