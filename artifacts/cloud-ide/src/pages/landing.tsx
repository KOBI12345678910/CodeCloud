import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Bot, Users, Rocket, Code2, Check, ArrowRight, Sparkles,
  Github, Twitter, Linkedin, Youtube, Star,
} from "lucide-react";
import Header from "@/components/Header";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    emoji: "🤖",
    icon: Bot,
    title: "AI Code Assistant",
    desc: "מודל שפה מתקדם שכותב, משלים ומסביר קוד בזמן אמת — ישירות בתוך העורך.",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    ring: "ring-blue-500/30",
    iconBg: "from-blue-500 to-cyan-400",
  },
  {
    emoji: "👥",
    icon: Users,
    title: "Multiplayer Collaboration",
    desc: "עבדו יחד על אותו קובץ, אותו טרמינל, אותה סביבה — כמו Google Docs לקוד.",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    ring: "ring-purple-500/30",
    iconBg: "from-purple-500 to-pink-500",
  },
  {
    emoji: "🚀",
    icon: Rocket,
    title: "Instant Deployment",
    desc: "מ-localhost ל-production בלחיצה אחת. דומיין מותאם, SSL ו-CDN — מוכנים מיד.",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/30",
    iconBg: "from-emerald-500 to-teal-400",
  },
  {
    emoji: "💻",
    icon: Code2,
    title: "50+ Languages",
    desc: "Python, Node, Go, Rust, Java, C++ ועוד — כל שפה רצה מיד, בלי setup.",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    ring: "ring-amber-500/30",
    iconBg: "from-amber-500 to-orange-500",
  },
];

const STEPS = [
  {
    n: 1,
    emoji: "📝",
    title: "Create",
    desc: "צור פרויקט חדש בשנייה אחת — בחר תבנית או התחל מאפס.",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    n: 2,
    emoji: "💻",
    title: "Code",
    desc: "כתוב קוד בכל שפה שתרצה, עם AI ו-collaboration מובנים.",
    accent: "from-purple-500 to-pink-500",
  },
  {
    n: 3,
    emoji: "🚀",
    title: "Deploy",
    desc: "הצג את הפרויקט לעולם ברגע — public URL, SSL, ו-scale אוטומטי.",
    accent: "from-emerald-500 to-teal-400",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/לתמיד",
    desc: "התחלה מהירה לפרויקטים אישיים.",
    features: [
      "3 פרויקטים פרטיים",
      "0.5 GB אחסון",
      "AI Assistant בסיסי",
      "Public deployment",
      "Community support",
    ],
    cta: "Start free",
    ctaHref: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$7",
    period: "/חודש",
    desc: "ליוצרים ומפתחים עצמאיים.",
    features: [
      "פרויקטים פרטיים ללא הגבלה",
      "10 GB אחסון",
      "AI Assistant מלא ו-Agent",
      "Custom domains + SSL",
      "Always-on deployments",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaHref: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Teams",
    price: "$20",
    period: "/משתמש/חודש",
    desc: "צוותים שבונים ביחד.",
    features: [
      "כל מה שיש ב-Pro",
      "Multiplayer collaboration",
      "Role-based access control",
      "Audit logs ו-SSO",
      "Centralized billing",
      "Dedicated support",
    ],
    cta: "Start with Teams",
    ctaHref: "/register?plan=teams",
    highlight: false,
  },
];

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features", href: "/product" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Docs", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Security", href: "/security" },
    { label: "Compliance", href: "/compliance" },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white antialiased overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 500px at 0% 10%, rgba(59,130,246,0.14), transparent 55%), radial-gradient(700px 500px at 50% 100%, rgba(168,85,247,0.10), transparent 60%)",
        }}
      />

      <Header />

      {/* HERO */}
      <section className="relative pt-20 sm:pt-28 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/80 hover:bg-white/10 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Now with AI-powered code assistance
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Build, deploy, and{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                scale from your browser
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-white/60 leading-relaxed">
              The cloud IDE platform trusted by over 50,000 developers. Write code,
              collaborate with your team, and deploy to production — all without
              leaving the browser.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <button className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 transition-all">
                  Start Building Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
              <a href="#features">
                <button className="px-6 py-3 rounded-lg text-[15px] font-semibold border border-white/15 hover:border-white/30 hover:bg-white/5 transition">
                  See Features
                </button>
              </a>
            </div>
            <p className="mt-4 text-xs text-white/40">
              No credit card required. Free tier available forever.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-wider text-blue-400 uppercase">
                Features
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                כל מה שצריך, במקום אחד
              </h2>
              <p className="mt-4 text-white/55 max-w-2xl mx-auto text-base sm:text-lg">
                סביבת פיתוח מלאה ב-cloud, מאפס ועד production — בלי setup, בלי
                התעסקות, בלי הפסקות.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div
                  className={`group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 ring-1 ring-transparent hover:${f.ring}`}
                >
                  <div
                    aria-hidden
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.iconBg} flex items-center justify-center shadow-lg`}
                      >
                        <f.icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-2xl" aria-hidden>
                        {f.emoji}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {f.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] text-white/60 leading-relaxed">
                      {f.desc}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 group-hover:text-white transition">
                      Learn more
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-wider text-purple-400 uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                מ-zero ל-deployed בשלושה צעדים
              </h2>
            </div>
          </Reveal>

          <div className="relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 180}>
                  <div className="group flex flex-col items-center text-center px-2">
                    <div className="relative">
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${s.accent} blur-xl opacity-40 group-hover:opacity-70 transition-opacity`}
                      />
                      <div
                        className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-2xl ring-4 ring-[#0a0c0f] transition-transform duration-500 group-hover:scale-110`}
                      >
                        <span className="text-white font-bold text-lg">
                          {s.n}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 text-4xl" aria-hidden>
                      {s.emoji}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-[15px] text-white/55 leading-relaxed max-w-xs">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">
                Pricing
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                תוכניות פשוטות, ללא הפתעות
              </h2>
              <p className="mt-4 text-white/55 max-w-2xl mx-auto text-base sm:text-lg">
                התחל בחינם. שדרג כשתגדל. בטל בכל רגע.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 120}>
                <div
                  className={`relative h-full rounded-2xl border p-7 flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                    p.highlight
                      ? "border-blue-500/40 bg-gradient-to-b from-blue-500/[0.08] to-white/[0.02] shadow-2xl shadow-blue-600/20"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-[11px] font-semibold tracking-wide uppercase shadow-lg shadow-blue-600/40">
                      Most popular
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
                    <p className="mt-1.5 text-sm text-white/55">{p.desc}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-tight">{p.price}</span>
                      <span className="text-sm text-white/50">{p.period}</span>
                    </div>
                  </div>

                  <ul className="mt-7 space-y-3 flex-1">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-[14px]">
                        <Check
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            p.highlight ? "text-blue-400" : "text-emerald-400"
                          }`}
                          strokeWidth={3}
                        />
                        <span className="text-white/75">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={p.ctaHref}>
                    <button
                      className={`mt-8 w-full px-5 py-3 rounded-lg text-[14px] font-semibold transition-all ${
                        p.highlight
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50"
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {p.cta}
                    </button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 sm:p-12 text-center">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xl sm:text-2xl text-white/85 font-medium leading-relaxed max-w-3xl mx-auto">
                "CodeCloud changed the way our team ships software. We went from
                two-day setup to two-minute setup."
              </p>
              <p className="mt-5 text-sm text-white/50">
                — Engineering Lead, Series B startup
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                start building?
              </span>
            </h2>
            <p className="mt-5 text-white/55 text-lg">
              הצטרף ל-50,000+ מפתחים שכבר בונים על CodeCloud.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-[15px] font-semibold bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 transition-all">
                  Start Building Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-white/5 mt-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Code2 className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-semibold tracking-tight">CodeCloud</span>
              </div>
              <p className="mt-4 text-sm text-white/50 max-w-xs leading-relaxed">
                The cloud IDE that lets you build, deploy, and scale — all from
                your browser.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[
                  { Icon: Github, href: "https://github.com", label: "GitHub" },
                  { Icon: Twitter, href: "https://twitter.com", label: "Twitter" },
                  { Icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
                  { Icon: Youtube, href: "https://youtube.com", label: "YouTube" },
                ].map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-md border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(FOOTER_LINKS).map(([col, links]) => (
              <div key={col}>
                <p className="text-xs font-semibold tracking-wider uppercase text-white/40">
                  {col}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-white/65 hover:text-white transition">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} CodeCloud. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs text-white/40">
              <Link href="/terms" className="hover:text-white/70 transition">Terms</Link>
              <Link href="/privacy" className="hover:text-white/70 transition">Privacy</Link>
              <Link href="/status" className="hover:text-white/70 transition">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
