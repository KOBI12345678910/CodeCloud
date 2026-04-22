import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Code2, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL || "";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: LoginErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Login failed. Please try again.");
        return;
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setLocation("/dashboard");
    } catch {
      setServerError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setServerError("");
    setOauthLoading(provider);
    try {
      const res = await fetch(`${API_URL}/api/auth/${provider}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || `${provider} login is not available right now.`);
        setOauthLoading(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setServerError(`Unable to connect to ${provider}. Please try again.`);
      setOauthLoading(null);
    }
  };

  const clearFieldError = (field: keyof LoginErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex" data-testid="login-page">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Code2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight">CodeCloud</span>
            </div>
          </Link>
          <div className="max-w-md">
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Build, deploy, and scale from your browser
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Join thousands of developers who code, collaborate, and ship production applications without leaving the browser.
            </p>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>All systems operational</span>
              </div>
              <span>99.9% uptime</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CodeCloud
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight">CodeCloud</span>
              </div>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full h-11 relative"
              onClick={() => handleOAuth("google")}
              disabled={isLoading || oauthLoading !== null}
              data-testid="button-google-login"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  Continue with Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 relative"
              onClick={() => handleOAuth("github")}
              disabled={isLoading || oauthLoading !== null}
              data-testid="button-github-login"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <GitHubIcon className="w-5 h-5 mr-3" />
                  Continue with GitHub
                </>
              )}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">
                or continue with email
              </span>
            </div>
          </div>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2" data-testid="server-error">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="you@example.com"
                  className={`pl-10 h-11 ${errors.email ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1" data-testid="error-email">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="Enter your password"
                  className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  autoComplete="current-password"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1" data-testid="error-password">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading || oauthLoading !== null}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-primary font-medium hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
