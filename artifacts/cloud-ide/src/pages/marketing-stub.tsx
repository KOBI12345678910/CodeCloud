import { Link } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";
import Header from "@/components/Header";

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
export const AboutPage = () => (
  <MarketingStub
    title="About"
    subtitle="הסיפור מאחורי CodeCloud והאנשים שבונים אותו."
  />
);
export const TermsPage = () => (
  <MarketingStub title="Terms of Service" subtitle="התנאים המשפטיים לשימוש ב-CodeCloud." eyebrow="Legal" />
);
export const PrivacyPage = () => (
  <MarketingStub title="Privacy Policy" subtitle="איך אנחנו שומרים על הפרטיות שלך." eyebrow="Legal" />
);
