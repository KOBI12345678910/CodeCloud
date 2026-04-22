import { useState } from "react";
import { Link } from "wouter";
import { Code2, Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL || "";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setEmailError("");

    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setIsSubmitted(true);
    } catch {
      setServerError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12" data-testid="forgot-password-page">
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

        {isSubmitted ? (
          <div data-testid="success-message">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a password reset link. The link will expire in 1 hour.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="text-primary hover:underline font-medium"
                data-testid="button-try-again"
              >
                try again
              </button>
              .
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-6 h-11" data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2" data-testid="server-error">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
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
                      if (emailError) setEmailError("");
                    }}
                    placeholder="you@example.com"
                    className={`pl-10 h-11 ${emailError ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                    data-testid="input-email"
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-destructive mt-1" data-testid="error-email">{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 mt-4"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1" data-testid="link-back-login">
                <ArrowLeft className="w-3 h-3" />
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
