import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Code2, Home, LayoutDashboard, Search, FileQuestion,
  ArrowRight, Compass, BookOpen, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Explore Projects", href: "/explore", icon: Compass },
  { label: "Documentation", href: "/api-docs", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function NotFound() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="not-found-page">
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="relative w-40 h-40 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping [animation-duration:3s]" />
            <div className="absolute inset-3 rounded-full bg-primary/10 animate-pulse [animation-duration:2s]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <FileQuestion className="w-16 h-16 text-primary/40 animate-[bounce_2s_ease-in-out_infinite]" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive/80 text-destructive-foreground text-[10px] font-bold flex items-center justify-center">!</span>
              </div>
            </div>
          </div>

          <p className="text-8xl font-black text-primary/20 leading-none mb-2 select-none" data-testid="404-code">404</p>
          <h1 className="text-2xl font-bold mb-2" data-testid="404-heading">Page not found</h1>
          <p className="text-muted-foreground mb-8" data-testid="404-message">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <Link href="/">
              <Button variant="outline" data-testid="button-go-home">
                <Home className="w-4 h-4 mr-2" /> Go Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button data-testid="button-go-dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Go to Dashboard
              </Button>
            </Link>
          </div>

          <div className="border-t border-border/50 pt-6">
            <p className="text-sm font-medium mb-3">Looking for something?</p>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-sm mx-auto mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-9"
                  data-testid="search-input"
                />
              </div>
              <Button type="submit" size="icon" variant="secondary" data-testid="button-search">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Link key={s.href} href={s.href}>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" data-testid={`suggestion-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <s.icon className="w-3.5 h-3.5 mr-1.5" /> {s.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
