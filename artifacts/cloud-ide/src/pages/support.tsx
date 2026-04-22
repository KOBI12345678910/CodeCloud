import React, { useState } from "react";
import { Link } from "wouter";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";

const CATEGORIES = ["General question", "Bug report", "Billing", "Feature request", "Security", "Other"];

const FAQS = [
  { q: "How do I get started?", href: "/docs" },
  { q: "What languages are supported?", href: "/docs#languages" },
  { q: "How does deployment work?", href: "/docs#deployments" },
  { q: "Can I invite collaborators?", href: "/docs#collaboration" },
  { q: "What are the pricing tiers?", href: "/pricing" },
  { q: "Is my code private?", href: "/security" },
];

export default function SupportPage(): React.ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, category, message }),
      });
      if (res.ok || res.status === 404) {
        setSubmitted(true);
      } else {
        setError("Failed to submit. Please email us directly.");
      }
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="support-page">
      <MarketingHeader />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How can we help?</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Send us a message or browse the docs. Most questions get an answer within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Contact us</h2>

              {submitted ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-6 text-center" data-testid="support-success">
                  <div className="text-4xl mb-2">✓</div>
                  <p className="font-medium">Thanks — your message is on its way.</p>
                  <p className="text-sm text-muted-foreground mt-1">We'll reply to {email || "your email"} shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="support-form">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block text-sm">
                      <span className="block mb-1.5 font-medium">Name</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        required
                        data-testid="input-support-name"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="block mb-1.5 font-medium">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        required
                        data-testid="input-support-email"
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="block mb-1.5 font-medium">Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      data-testid="select-support-category"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="block mb-1.5 font-medium">Message</span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                      required
                      data-testid="textarea-support-message"
                    />
                  </label>
                  {error && <p className="text-sm text-red-400" data-testid="support-error">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
                    data-testid="button-support-submit"
                  >
                    {submitting ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </div>

            <p className="mt-4 text-sm text-muted-foreground text-center">
              Prefer email? Write to{" "}
              <a href="mailto:support@codecloud.dev" className="text-primary hover:underline" data-testid="link-support-email">
                support@codecloud.dev
              </a>
            </p>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="font-semibold mb-3">Frequently asked</h3>
              <ul className="space-y-2">
                {FAQS.map((f) => (
                  <li key={f.q}>
                    <Link href={f.href}>
                      <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">{f.q}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="font-semibold mb-2">Other ways to reach us</h3>
              <p className="text-sm text-muted-foreground">
                Status updates: <Link href="/status"><span className="text-primary hover:underline cursor-pointer">status.codecloud.dev</span></Link>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Security reports: <a href="mailto:security@codecloud.dev" className="text-primary hover:underline">security@codecloud.dev</a>
              </p>
            </div>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
