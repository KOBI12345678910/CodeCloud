export interface Badge {
  label: string;
  value: string;
  color: string;
  style: "flat" | "flat-square" | "for-the-badge" | "plastic";
  url: string;
}

class BadgeGeneratorService {
  generateBadge(label: string, value: string, color: string = "blue", style: Badge["style"] = "flat"): Badge {
    const url = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}?style=${style}`;
    return { label, value, color, style, url };
  }

  generateProjectBadges(project: { name: string; version: string; license: string; language: string; tests?: { passing: number; total: number }; coverage?: number; uptime?: number }): Badge[] {
    const badges: Badge[] = [
      this.generateBadge("version", project.version, "blue"),
      this.generateBadge("license", project.license, "green"),
      this.generateBadge("language", project.language, "orange"),
    ];
    if (project.tests) badges.push(this.generateBadge("tests", `${project.tests.passing}/${project.tests.total} passing`, project.tests.passing === project.tests.total ? "brightgreen" : "yellow"));
    if (project.coverage !== undefined) badges.push(this.generateBadge("coverage", `${project.coverage}%`, project.coverage >= 80 ? "brightgreen" : project.coverage >= 50 ? "yellow" : "red"));
    if (project.uptime !== undefined) badges.push(this.generateBadge("uptime", `${project.uptime}%`, project.uptime >= 99.9 ? "brightgreen" : "yellow"));
    return badges;
  }

  getMarkdown(badges: Badge[]): string {
    return badges.map(b => `![${b.label}](${b.url})`).join(" ");
  }
}

export const badgeGeneratorService = new BadgeGeneratorService();
