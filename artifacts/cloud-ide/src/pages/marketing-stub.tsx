import { Link } from "wouter";
import { ArrowLeft, Sparkles, Shield, FileText, Users, Mail, Globe, Zap, Lock, Server, Heart, Code, Building2 } from "lucide-react";
import Header from "@/components/Header";
import type { ReactNode } from "react";

interface StubProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export default function MarketingStub({ title, subtitle, eyebrow = "Coming soon" }: StubProps) {
  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 70% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(700px 400px at 0% 0%, rgba(59,130,246,0.10), transparent 55%)",
        }}
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-28 sm:py-36 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/80">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          {eyebrow}
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            {title}
          </span>
        </h1>
        {subtitle && (
          <p className="mt-5 text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-10 flex justify-center">
          <Link href="/">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 hover:bg-white/5 text-sm font-medium transition">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function LegalShell({ icon, eyebrow, title, lastUpdated, children }: { icon: ReactNode; eyebrow: string; title: string; lastUpdated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 70% -10%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(700px 400px at 0% 0%, rgba(59,130,246,0.08), transparent 55%)",
        }}
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/70">
          {icon}
          {eyebrow}
        </div>
        <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/40">Last updated: {lastUpdated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-7 text-white/75">
          {children}
        </div>
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-sm text-white/50">
          <Link href="/" className="inline-flex items-center gap-2 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/support" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export const TermsPage = () => (
  <LegalShell
    icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
    eyebrow="Legal"
    title="Terms of Service"
    lastUpdated="April 22, 2026"
  >
    <p>
      These Terms of Service (&quot;Terms&quot;) govern your access to and use of CodeCloud
      (the &quot;Service&quot;), a cloud development and AI agent platform. By creating an
      account or using the Service, you agree to these Terms. If you do not agree, do not
      use the Service.
    </p>

    <Section title="1. Accounts">
      <p>
        You must be at least 13 years old to use the Service. You are responsible for
        keeping your credentials secure and for all activity that occurs under your
        account. Notify us immediately at security@codecloud.app if you suspect any
        unauthorized use.
      </p>
    </Section>

    <Section title="2. Acceptable use">
      <p>You agree not to use the Service to:</p>
      <ul className="list-disc pl-6 space-y-1.5">
        <li>Violate any law, regulation, or third-party right.</li>
        <li>Mine cryptocurrency, run botnets, send spam, or perform DDoS attacks.</li>
        <li>Host malware, phishing pages, or content that infringes intellectual property.</li>
        <li>Attempt to reverse-engineer, probe, or disrupt the Service or its infrastructure.</li>
        <li>Resell raw compute, storage, or AI inference except via our official partner program.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these rules, with or without notice.</p>
    </Section>

    <Section title="3. Your content">
      <p>
        You retain all rights to the code, data, and other materials you upload or generate
        on the Service (&quot;Your Content&quot;). You grant us a limited license to host,
        copy, transmit, and display Your Content solely to operate and improve the Service.
        Public projects are visible to anyone; private projects are accessible only to you
        and the collaborators you authorize.
      </p>
    </Section>

    <Section title="4. AI features">
      <p>
        The Service includes AI-powered features that generate code, text, and other
        outputs. Outputs are produced by third-party large language models and may be
        inaccurate, incomplete, or unsafe. You are responsible for reviewing AI output
        before using it. We do not train foundation models on your private project content.
      </p>
    </Section>

    <Section title="5. Plans, credits, and billing">
      <p>
        Paid plans and pay-as-you-go AI credits are billed via Stripe. By purchasing
        credits or a subscription, you authorize us to charge your payment method.
        Subscriptions renew automatically until cancelled. Credits are non-refundable
        except where required by law. Auto top-up, if enabled, will charge your default
        payment method when your balance falls below the threshold you set.
      </p>
    </Section>

    <Section title="6. Service availability">
      <p>
        We aim for high availability but do not guarantee uninterrupted service. We may
        perform maintenance, change features, or impose usage limits at any time. The
        Service is provided &quot;as is&quot; without warranties of any kind, to the
        maximum extent permitted by law.
      </p>
    </Section>

    <Section title="7. Termination">
      <p>
        You may close your account at any time from your account settings. We may suspend
        or terminate your access if you breach these Terms or pose a risk to the Service
        or other users. On termination, your data may be deleted after a grace period
        described in our Privacy Policy.
      </p>
    </Section>

    <Section title="8. Limitation of liability">
      <p>
        To the maximum extent permitted by law, our total liability for any claim arising
        from the Service is limited to the greater of (a) the amount you paid us in the 12
        months before the claim, or (b) USD 100. We are not liable for indirect,
        incidental, or consequential damages.
      </p>
    </Section>

    <Section title="9. Changes">
      <p>
        We may update these Terms from time to time. Material changes will be announced in
        the product or by email at least 14 days before they take effect. Continued use of
        the Service after changes take effect constitutes acceptance.
      </p>
    </Section>

    <Section title="10. Contact">
      <p>Questions? Email <a className="text-blue-400 hover:underline" href="mailto:legal@codecloud.app">legal@codecloud.app</a>.</p>
    </Section>
  </LegalShell>
);

export const PrivacyPage = () => (
  <LegalShell
    icon={<Shield className="w-3.5 h-3.5 text-blue-400" />}
    eyebrow="Legal"
    title="Privacy Policy"
    lastUpdated="April 22, 2026"
  >
    <p>
      This Privacy Policy explains what information CodeCloud collects, how we use it, and
      the choices you have. We follow the principles of GDPR, CCPA, and similar privacy
      laws regardless of where you live.
    </p>

    <Section title="What we collect">
      <ul className="list-disc pl-6 space-y-1.5">
        <li><strong>Account data</strong> — email, username, profile picture, and authentication identifiers from Clerk.</li>
        <li><strong>Project data</strong> — code, files, and metadata you upload or create on the Service.</li>
        <li><strong>Usage data</strong> — pages visited, actions taken, IP address, device, and browser, used to operate and secure the Service.</li>
        <li><strong>AI usage</strong> — prompts you send and outputs generated, so we can bill correctly and debug issues.</li>
        <li><strong>Billing data</strong> — payment method tokens (handled by Stripe — we never see your card number) and invoice history.</li>
      </ul>
    </Section>

    <Section title="How we use your data">
      <ul className="list-disc pl-6 space-y-1.5">
        <li>Operate, maintain, and secure the Service.</li>
        <li>Process payments and prevent fraud.</li>
        <li>Send transactional emails (receipts, security alerts, account notices).</li>
        <li>Respond to support requests.</li>
        <li>Improve the product through aggregated, de-identified analytics.</li>
      </ul>
      <p>We do <strong>not</strong> sell your personal data, and we do not train foundation AI models on your private project content.</p>
    </Section>

    <Section title="Sub-processors">
      <p>We share data with vetted vendors that help us operate the Service:</p>
      <ul className="list-disc pl-6 space-y-1.5">
        <li><strong>Clerk</strong> — authentication and session management.</li>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li><strong>Anthropic, OpenAI, Google</strong> — AI model inference.</li>
        <li><strong>Cloud infrastructure providers</strong> — compute, storage, and content delivery.</li>
      </ul>
    </Section>

    <Section title="Retention">
      <p>
        Active account data is kept while your account exists. After deletion, project
        data is purged within 30 days; backups are rotated within 90 days. Invoice and
        tax records are retained for 7 years to comply with financial regulations.
      </p>
    </Section>

    <Section title="Your rights">
      <p>
        You can access, export, correct, or delete your personal data at any time from
        Settings → Privacy, or by emailing <a className="text-blue-400 hover:underline" href="mailto:privacy@codecloud.app">privacy@codecloud.app</a>.
        EU and California residents have additional rights under GDPR and CCPA, including
        the right to object to processing and to lodge a complaint with a supervisory authority.
      </p>
    </Section>

    <Section title="Security">
      <p>
        Data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Project secrets are
        encrypted with per-project keys. We run regular security reviews and accept
        responsible disclosure reports at <a className="text-blue-400 hover:underline" href="mailto:security@codecloud.app">security@codecloud.app</a>.
      </p>
    </Section>

    <Section title="Children">
      <p>The Service is not directed to children under 13. We do not knowingly collect data from children.</p>
    </Section>

    <Section title="Changes">
      <p>
        We will announce material changes to this policy in the product or by email at
        least 14 days before they take effect.
      </p>
    </Section>
  </LegalShell>
);

function AboutValue({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-white/60 leading-6">{body}</p>
    </div>
  );
}

export const AboutPage = () => (
  <div className="min-h-screen bg-[#0a0c0f] text-white">
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(900px 500px at 70% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(700px 400px at 0% 0%, rgba(59,130,246,0.10), transparent 55%)",
      }}
    />
    <Header />
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-24">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/70">
        <Building2 className="w-3.5 h-3.5 text-blue-400" />
        About
      </div>
      <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight">
        Software, written with{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          AI by your side
        </span>
      </h1>
      <p className="mt-5 text-lg text-white/60 max-w-2xl leading-relaxed">
        CodeCloud is a cloud development platform built around a simple idea: anyone with
        an idea should be able to ship working software. We pair a real, multi-language
        IDE running in the cloud with an AI agent that can plan, code, run, and debug
        alongside you — and a deployment layer that turns your project into a live URL in
        seconds.
      </p>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AboutValue
          icon={<Code className="w-5 h-5" />}
          title="Real software, not toys"
          body="Full Linux containers, your choice of language, real terminals, real package managers. Nothing in a sandboxed iframe."
        />
        <AboutValue
          icon={<Zap className="w-5 h-5" />}
          title="AI that actually executes"
          body="Our agent doesn't just suggest code. It edits files, runs commands, watches for errors, and pauses for your approval at safe checkpoints."
        />
        <AboutValue
          icon={<Globe className="w-5 h-5" />}
          title="Built for the world"
          body="Available in 100+ languages with full RTL support. We translate the product so you can build in yours."
        />
        <AboutValue
          icon={<Lock className="w-5 h-5" />}
          title="Your code stays yours"
          body="Private projects are encrypted at rest with per-project keys. We never train foundation models on your code."
        />
        <AboutValue
          icon={<Server className="w-5 h-5" />}
          title="Predictable, fair pricing"
          body="A real free tier, transparent pay-as-you-go AI credits, and team plans with included usage. Auto top-up only when you ask."
        />
        <AboutValue
          icon={<Heart className="w-5 h-5" />}
          title="Made by builders"
          body="We use CodeCloud to build CodeCloud. Every feature ships through the same AI agent, IDE, and deployment pipeline you use."
        />
      </section>

      <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <h2 className="text-2xl font-semibold">Get in touch</h2>
        <p className="mt-2 text-white/60">
          Questions, partnerships, press, or just saying hi — we read everything.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
          <a className="flex items-center gap-2 text-white/80 hover:text-white" href="mailto:hello@codecloud.app">
            <Mail className="w-4 h-4 text-blue-400" /> hello@codecloud.app
          </a>
          <a className="flex items-center gap-2 text-white/80 hover:text-white" href="mailto:support@codecloud.app">
            <Users className="w-4 h-4 text-blue-400" /> support@codecloud.app
          </a>
          <a className="flex items-center gap-2 text-white/80 hover:text-white" href="mailto:security@codecloud.app">
            <Shield className="w-4 h-4 text-blue-400" /> security@codecloud.app
          </a>
        </div>
      </section>

      <div className="mt-14 flex justify-center">
        <Link href="/sign-up">
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-sm font-semibold transition">
            Start building free
          </button>
        </Link>
      </div>
    </main>
  </div>
);

export const ProductPage = () => (
  <MarketingStub
    title="Product"
    subtitle="הסקירה המלאה של היכולות שלנו — IDE, AI, deployment ו-collaboration — בקרוב."
  />
);
export const SolutionsPage = () => (
  <MarketingStub
    title="Solutions"
    subtitle="פתרונות מותאמים לסטארט-אפים, צוותים ארגוניים, מורים וסטודנטים."
  />
);
export const BlogPage = () => (
  <MarketingStub
    title="Blog"
    subtitle="עדכונים על המוצר, סיפורי לקוחות ומדריכי developer — בדרך."
  />
);
export const CareersPage = () => (
  <MarketingStub
    title="Careers"
    subtitle="אנחנו בונים את העתיד של הפיתוח בענן. הצטרף אלינו."
  />
);
export const DocsPage = () => (
  <MarketingStub
    title="Documentation"
    subtitle="המדריך המלא ל-CodeCloud, מתחילים ועד מתקדמים — בקרוב באוויר."
  />
);
