import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Code2, Bell, Menu, LayoutDashboard,
  CreditCard, Settings, User, Shield, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const PUBLIC_NAV = [
  { label: "Product", href: "/product" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Docs", href: "/docs" },
];

interface HeaderProps {
  variant?: "default" | "minimal";
}

export default function Header({ variant = "default" }: HeaderProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdmin = (user?.publicMetadata as any)?.role === "admin";
  const initials = (user?.firstName?.[0] || user?.username?.[0] || "U").toUpperCase();
  const handleSignOut = () => { signOut(); navigate("/"); };
  const isActive = (href: string) => location === href;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/5 bg-[#0b0d10]/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
      data-testid="app-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
        <Link href={user ? "/dashboard" : "/"}>
          <div className="flex items-center gap-2 cursor-pointer shrink-0 group" data-testid="header-logo">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Code2 className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight text-white text-[15px]">CodeCloud</span>
          </div>
        </Link>

        {variant === "default" && (
          <nav className="hidden md:flex items-center gap-1 ml-2" data-testid="nav-desktop">
            {PUBLIC_NAV.map((link) => (
              <Link key={link.href} href={link.href}>
                <button
                  className={`px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {user ? (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-white/70 hover:text-white hover:bg-white/5">
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-white/70 hover:text-white hover:bg-white/5" data-testid="header-notifications">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2 text-white hover:bg-white/5" data-testid="header-user-menu">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.imageUrl} alt={user.username || ""} />
                    <AvatarFallback className="text-xs bg-blue-500/20 text-blue-300">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{user.fullName || user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/pricing")}><CreditCard className="w-4 h-4 mr-2" /> Billing</DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="w-4 h-4 mr-2" /> Admin
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">Admin</Badge>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/login">
              <button
                className="px-4 py-2 text-[14px] font-medium text-white/80 hover:text-white transition-colors"
                data-testid="header-login"
              >
                Log in
              </button>
            </Link>
            <Link href="/register">
              <button
                className="px-4 py-2 text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 transition-all"
                data-testid="header-signup"
              >
                Start building
              </button>
            </Link>
          </div>
        )}

        {variant === "default" && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-white/80 hover:text-white hover:bg-white/5" data-testid="header-hamburger">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-[#0b0d10] border-white/10 text-white">
              <div className="flex items-center gap-2 px-5 h-16 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Code2 className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-semibold tracking-tight">CodeCloud</span>
              </div>
              <nav className="p-3 space-y-1" data-testid="nav-mobile">
                {PUBLIC_NAV.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link href={link.href}>
                      <button
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive(link.href)
                            ? "bg-white/10 text-white font-medium"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {link.label}
                      </button>
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              {!user && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 space-y-2">
                  <SheetClose asChild>
                    <Link href="/login">
                      <button className="w-full px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition">
                        Log in
                      </button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/register">
                      <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition">
                        Start building
                      </button>
                    </Link>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}
