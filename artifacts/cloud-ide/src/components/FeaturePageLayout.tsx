import MarketingHeader from "./MarketingHeader";
import MarketingFooter from "./MarketingFooter";

interface FeaturePageLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
  testId?: string;
}

export default function FeaturePageLayout({ title, subtitle, badge, children, testId }: FeaturePageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid={testId}>
      <MarketingHeader />
      <main>
        <section className="relative pt-20 pb-10 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,hsl(224_76%_48%/0.08),transparent_60%)] pointer-events-none" />
          <div className="max-w-5xl mx-auto text-center relative">
            {badge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs sm:text-sm text-primary mb-5">
                {badge}
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          </div>
        </section>
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
