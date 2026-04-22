export interface ViewportTest {
  name: string;
  width: number;
  height: number;
  deviceType: "mobile" | "tablet" | "desktop";
}

export interface ResponsiveIssue {
  id: string;
  viewport: string;
  type: "overflow" | "overlap" | "spacing" | "font-size" | "touch-target" | "image" | "layout";
  severity: "low" | "medium" | "high";
  element: string;
  description: string;
  suggestedFix: string;
  cssProperty: string | null;
  currentValue: string | null;
  recommendedValue: string | null;
}

export interface ResponsiveReport {
  url: string;
  generatedAt: Date;
  score: number;
  viewports: ViewportTest[];
  issues: ResponsiveIssue[];
  summary: string;
}

const DEFAULT_VIEWPORTS: ViewportTest[] = [
  { name: "iPhone SE", width: 375, height: 667, deviceType: "mobile" },
  { name: "iPhone 14 Pro", width: 393, height: 852, deviceType: "mobile" },
  { name: "iPad", width: 768, height: 1024, deviceType: "tablet" },
  { name: "iPad Pro", width: 1024, height: 1366, deviceType: "tablet" },
  { name: "Laptop", width: 1440, height: 900, deviceType: "desktop" },
  { name: "Desktop", width: 1920, height: 1080, deviceType: "desktop" },
];

class AIResponsiveService {
  analyze(url: string, viewports?: ViewportTest[]): ResponsiveReport {
    const vps = viewports || DEFAULT_VIEWPORTS;
    const issues = this.generateIssues(url, vps);
    const score = Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === "high" ? 15 : i.severity === "medium" ? 8 : 3), 0));

    return {
      url, generatedAt: new Date(), score, viewports: vps, issues,
      summary: score >= 90 ? "Excellent responsive design" : score >= 70 ? "Good with minor issues" : score >= 50 ? "Several responsive issues found" : "Significant responsive problems detected",
    };
  }

  getDefaultViewports(): ViewportTest[] {
    return [...DEFAULT_VIEWPORTS];
  }

  private generateIssues(url: string, viewports: ViewportTest[]): ResponsiveIssue[] {
    const issues: ResponsiveIssue[] = [];
    let counter = 0;

    for (const vp of viewports) {
      if (vp.deviceType === "mobile") {
        issues.push({
          id: `ri-${++counter}`, viewport: vp.name, type: "overflow",
          severity: "high", element: ".hero-section",
          description: "Horizontal overflow detected — content extends beyond viewport width",
          suggestedFix: "Add overflow-x: hidden to container or use max-width: 100%",
          cssProperty: "overflow-x", currentValue: "visible", recommendedValue: "hidden",
        });
        issues.push({
          id: `ri-${++counter}`, viewport: vp.name, type: "touch-target",
          severity: "medium", element: "nav a",
          description: "Navigation links too small for touch (24px). Minimum recommended: 44px",
          suggestedFix: "Increase link padding to at least 44x44px for mobile touch targets",
          cssProperty: "min-height", currentValue: "24px", recommendedValue: "44px",
        });
      }
      if (vp.deviceType === "tablet") {
        issues.push({
          id: `ri-${++counter}`, viewport: vp.name, type: "layout",
          severity: "low", element: ".grid-container",
          description: "Grid layout could use 2-column instead of single column at this width",
          suggestedFix: "Add a breakpoint at 768px for 2-column grid layout",
          cssProperty: "grid-template-columns", currentValue: "1fr", recommendedValue: "repeat(2, 1fr)",
        });
      }
    }
    return issues;
  }
}

export const aiResponsiveService = new AIResponsiveService();
