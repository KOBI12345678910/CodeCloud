import { useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Code2, Lock, Eye, EyeOff, Loader2, AlertCircle, Check, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL || "";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/\d/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetErrors = Partial<Record<"password" | "confirmPassword", string>>;

interface PasswordCheck {
  label: string;
  met: boolean;
}

function usePasswordStrength(password: string) {
  return useMemo(() => {
    const checks: PasswordCheck[] = [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Lowercase letter", met: /[a-z]/.test(password) },
      { label: "A number", met: /\d/.test(password) },
    ];
    const score = checks.filter((c) => c.met).length;
    let label = "Weak";
    let color = "bg-red-500";
    if (score === 4) {
      label = "Strong";
      color = "bg-emerald-500";
    } else if (score >= 3) {
      label = "Good";
      color = "bg-amber-500";
    } else if (score >= 2) {
      label = "Fair";
      color = "bg-orange-500";
    }
    return { checks, score, label, color };
  }, [password]);
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<ResetErrors>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = usePasswordStrength(password);
  const showStrength = password.length > 0;

  const validateForm = (): boolean => {
    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: ResetErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ResetErrors;
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

    if (!token) {
      setServerError("Missing reset token. Please use the link from your email.");
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message || data.error || "Failed to reset password. Please try again.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setServerError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearFieldError = (field: keyof ResetErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12" data-testid="reset-password-page">
        <div className="w-full max-w-[400px] text-center">
          <div className="flex items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">CodeCloud</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button className="mt-6 h-11" data-testid="button-request-new">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12" data-testid="reset-password-page">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">CodeCloud</span>
            </div>
          </Link>
        </div>

        {isSuccess ? (
          <div data-testid="success-message">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Password reset complete</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full mt-6 h-11" data-testid="button-go-to-login">
                Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">{t("auth.reset.title", { defaultValue: "Set new password" })}</h1>
                <LanguageSwitcher variant="compact" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a strong password for your account
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2" data-testid="server-error">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm">New Password</Label>
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
                    placeholder="Enter new password"
                    className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                    autoFocus
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

                {showStrength && (
                  <div className="mt-2 space-y-2" data-testid="password-strength">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors ${
                              i < strength.score ? strength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {strength.checks.map((check) => (
                        <div key={check.label} className="flex items-center gap-1.5 text-xs">
                          {check.met ? (
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={check.met ? "text-muted-foreground" : "text-muted-foreground/60"}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    placeholder="Re-enter new password"
                    className={`pl-10 pr-10 h-11 ${errors.confirmPassword ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1" data-testid="error-confirm-password">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
                data-testid="button-reset"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
