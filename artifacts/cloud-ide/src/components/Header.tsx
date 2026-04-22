import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Code2, Search, Bell, Menu, X, LayoutDashboard, Compass,
  BookOpen, CreditCard, Settings, User, Shield, LogOut,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Templates", href: "/explore?tab=templates", icon: BookOpen },
  { label: "Pricing", href: "/pricing", icon: DollarSign },
];

interface HeaderProps {
  variant?: "default" | "minimal";
}

export default function Header({ variant = "default" }: HeaderProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const isAdmin = (user?.publicMetadata as any)?.role === "admin";
  const initials = (user?.firstName?.[0] || user?.username?.[0] || "U").toUpperCase();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href.includes("?")) return location === href.split("?")[0];
    return location === href;
  };

  return (
    <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href={user ? "/dashboard" : "/"}>
          <div className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="header-logo">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight hidden sm:inline">CodeCloud</span>
          </div>
        </Link>

        {variant === "default" && (
          <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm ${isActive(link.href) ? "text-foreground bg-muted/50" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {variant === "default" && (
          <>
            <form onSubmit={handleSearch} className="hidden sm:flex items-center relative max-w-xs w-full">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 h-9 bg-muted/30 border-border/50 focus:bg-background"
                data-testid="header-search"
              />
            </form>

            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-9 w-9"
              onClick={() => setSearchOpen(!searchOpen)}
              data-testid="header-search-mobile-toggle"
            >
              <Search className="w-4 h-4" />
            </Button>
          </>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9" data-testid="header-notifications">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2" data-testid="header-user-menu">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={user.imageUrl} alt={user.username || ""} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-sm font-medium max-w-[120px] truncate">
                  {user.firstName || user.username}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{user.fullName || user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                <User className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing")} data-testid="menu-billing">
                <CreditCard className="w-4 h-4 mr-2" /> Billing
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <Shield className="w-4 h-4 mr-2" /> Admin
                    <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">Admin</Badge>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive" data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="header-login">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="header-signup">Sign up</Button>
            </Link>
          </div>
        )}

        {variant === "default" && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" data-testid="header-hamburger">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold tracking-tight">CodeCloud</span>
                </div>
              </div>
              <nav className="p-4 space-y-1" data-testid="nav-mobile">
                {NAV_LINKS.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link href={link.href}>
                      <button
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive(link.href)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <link.icon className="w-4 h-4" />
                        {link.label}
                      </button>
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {searchOpen && variant === "default" && (
        <div className="sm:hidden border-t border-border/50 px-4 py-2" data-testid="mobile-search-bar">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 h-9"
                autoFocus
              />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSearchOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}
