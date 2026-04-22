import { db, projectsTable, filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface ProjectAnalysis {
  name: string;
  description: string;
  language: string;
  framework: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  entryPoint: string;
  sourceFiles: string[];
  configFiles: string[];
  license: string;
}

export async function analyzeProject(projectId: string): Promise<ProjectAnalysis> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) throw new Error("Project not found");

  const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));

  const analysis: ProjectAnalysis = {
    name: project.name || "my-project",
    description: project.description || "",
    language: "JavaScript",
    framework: "",
    dependencies: {},
    devDependencies: {},
    scripts: {},
    hasTests: false,
    hasDocker: false,
    hasCI: false,
    entryPoint: "",
    sourceFiles: [],
    configFiles: [],
    license: "MIT",
  };

  const filePaths = files.map(f => f.path);

  const pkgFile = files.find(f => f.name === "package.json" && !f.path.includes("node_modules"));
  if (pkgFile && pkgFile.content) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      if (pkg.name) analysis.name = pkg.name;
      if (pkg.description) analysis.description = pkg.description;
      if (pkg.dependencies) analysis.dependencies = pkg.dependencies;
      if (pkg.devDependencies) analysis.devDependencies = pkg.devDependencies;
      if (pkg.scripts) analysis.scripts = pkg.scripts;
      if (pkg.license) analysis.license = pkg.license;
      if (pkg.main) analysis.entryPoint = pkg.main;
    } catch {}
  }

  const allDeps = { ...analysis.dependencies, ...analysis.devDependencies };
  if (allDeps["react"] || allDeps["react-dom"]) {
    analysis.framework = allDeps["next"] ? "Next.js" : allDeps["gatsby"] ? "Gatsby" : "React";
  } else if (allDeps["vue"]) {
    analysis.framework = allDeps["nuxt"] ? "Nuxt.js" : "Vue.js";
  } else if (allDeps["@angular/core"]) {
    analysis.framework = "Angular";
  } else if (allDeps["express"]) {
    analysis.framework = "Express";
  } else if (allDeps["fastify"]) {
    analysis.framework = "Fastify";
  } else if (allDeps["hono"]) {
    analysis.framework = "Hono";
  }

  if (filePaths.some(p => p.endsWith(".ts") || p.endsWith(".tsx"))) {
    analysis.language = "TypeScript";
  } else if (filePaths.some(p => p.endsWith(".py"))) {
    analysis.language = "Python";
  } else if (filePaths.some(p => p.endsWith(".rb"))) {
    analysis.language = "Ruby";
  } else if (filePaths.some(p => p.endsWith(".go"))) {
    analysis.language = "Go";
  } else if (filePaths.some(p => p.endsWith(".rs"))) {
    analysis.language = "Rust";
  }

  const pyReqs = files.find(f => f.name === "requirements.txt");
  if (pyReqs && pyReqs.content) {
    analysis.language = "Python";
    const deps: Record<string, string> = {};
    pyReqs.content.split("\n").filter(l => l.trim() && !l.startsWith("#")).forEach(l => {
      const [name, ver] = l.split("==");
      if (name) deps[name.trim()] = ver?.trim() || "*";
    });
    analysis.dependencies = deps;
    if (deps["flask"]) analysis.framework = "Flask";
    else if (deps["django"]) analysis.framework = "Django";
    else if (deps["fastapi"]) analysis.framework = "FastAPI";
  }

  analysis.hasTests = filePaths.some(p =>
    p.includes("test") || p.includes("spec") || p.includes("__tests__")
  );
  analysis.hasDocker = filePaths.some(p =>
    p.toLowerCase().includes("dockerfile") || p === "docker-compose.yml" || p === "docker-compose.yaml"
  );
  analysis.hasCI = filePaths.some(p =>
    p.includes(".github/workflows") || p.includes(".gitlab-ci") || p.includes(".circleci")
  );

  analysis.sourceFiles = filePaths.filter(p =>
    /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cpp|c|cs)$/.test(p) && !p.includes("node_modules")
  ).slice(0, 50);

  analysis.configFiles = filePaths.filter(p =>
    /\.(json|yaml|yml|toml|ini|env|config)$/.test(p) ||
    p === ".gitignore" || p === "Makefile" || p === "Dockerfile"
  ).slice(0, 20);

  if (!analysis.entryPoint) {
    const candidates = ["src/index.ts", "src/index.js", "src/main.ts", "src/main.js", "index.ts", "index.js", "app.ts", "app.js", "main.py", "app.py"];
    analysis.entryPoint = candidates.find(c => filePaths.includes(c)) || "";
  }

  return analysis;
}

export function generateReadme(analysis: ProjectAnalysis, options?: {
  includeApi?: boolean;
  includeBadges?: boolean;
  includeContributing?: boolean;
  includeLicense?: boolean;
  customSections?: { title: string; content: string }[];
}): string {
  const opts = {
    includeApi: true,
    includeBadges: true,
    includeContributing: true,
    includeLicense: true,
    ...options,
  };

  const sections: string[] = [];

  if (opts.includeBadges) {
    const badges: string[] = [];
    badges.push(`![${analysis.language}](https://img.shields.io/badge/language-${encodeURIComponent(analysis.language)}-blue)`);
    if (analysis.framework) {
      badges.push(`![${analysis.framework}](https://img.shields.io/badge/framework-${encodeURIComponent(analysis.framework)}-green)`);
    }
    if (analysis.license) {
      badges.push(`![License](https://img.shields.io/badge/license-${encodeURIComponent(analysis.license)}-yellow)`);
    }
    sections.push(badges.join(" "));
    sections.push("");
  }

  sections.push(`# ${analysis.name}`);
  sections.push("");
  sections.push(analysis.description || `A ${analysis.language}${analysis.framework ? ` ${analysis.framework}` : ""} project.`);
  sections.push("");

  sections.push("## Table of Contents");
  sections.push("");
  const toc = ["Features", "Prerequisites", "Installation", "Usage"];
  if (opts.includeApi && analysis.framework) toc.push("API Documentation");
  if (analysis.hasTests) toc.push("Testing");
  if (analysis.hasDocker) toc.push("Docker");
  if (opts.includeContributing) toc.push("Contributing");
  if (opts.includeLicense) toc.push("License");
  toc.forEach(item => sections.push(`- [${item}](#${item.toLowerCase().replace(/ /g, "-")})`));
  sections.push("");

  sections.push("## Features");
  sections.push("");
  const features: string[] = [];
  if (analysis.framework) features.push(`Built with ${analysis.framework}`);
  features.push(`Written in ${analysis.language}`);
  if (analysis.hasTests) features.push("Comprehensive test suite");
  if (analysis.hasDocker) features.push("Docker support for containerized deployment");
  if (analysis.hasCI) features.push("CI/CD pipeline configured");
  if (Object.keys(analysis.dependencies).length > 0) {
    const notable = Object.keys(analysis.dependencies).filter(d =>
      !d.startsWith("@types/") && !["tslib", "typescript"].includes(d)
    ).slice(0, 5);
    if (notable.length > 0) features.push(`Key dependencies: ${notable.join(", ")}`);
  }
  features.forEach(f => sections.push(`- ${f}`));
  sections.push("");

  sections.push("## Prerequisites");
  sections.push("");
  if (analysis.language === "Python") {
    sections.push("- Python 3.8 or higher");
    sections.push("- pip (Python package manager)");
  } else if (analysis.language === "Go") {
    sections.push("- Go 1.20 or higher");
  } else if (analysis.language === "Rust") {
    sections.push("- Rust 1.70 or higher");
    sections.push("- Cargo (Rust package manager)");
  } else {
    sections.push("- Node.js 18 or higher");
    sections.push("- npm or pnpm");
  }
  if (analysis.hasDocker) sections.push("- Docker (optional, for containerized deployment)");
  sections.push("");

  sections.push("## Installation");
  sections.push("");
  sections.push("Clone the repository:");
  sections.push("");
  sections.push("```bash");
  sections.push(`git clone https://github.com/username/${analysis.name}.git`);
  sections.push(`cd ${analysis.name}`);
  sections.push("```");
  sections.push("");
  sections.push("Install dependencies:");
  sections.push("");
  if (analysis.language === "Python") {
    sections.push("```bash");
    sections.push("pip install -r requirements.txt");
    sections.push("```");
  } else if (analysis.language === "Go") {
    sections.push("```bash");
    sections.push("go mod download");
    sections.push("```");
  } else if (analysis.language === "Rust") {
    sections.push("```bash");
    sections.push("cargo build");
    sections.push("```");
  } else {
    sections.push("```bash");
    sections.push("npm install");
    sections.push("```");
  }
  sections.push("");

  if (Object.keys(analysis.scripts).length > 0 || analysis.entryPoint) {
    sections.push("## Usage");
    sections.push("");
    if (analysis.scripts["dev"]) {
      sections.push("Start the development server:");
      sections.push("");
      sections.push("```bash");
      sections.push("npm run dev");
      sections.push("```");
      sections.push("");
    }
    if (analysis.scripts["start"]) {
      sections.push("Start the application:");
      sections.push("");
      sections.push("```bash");
      sections.push("npm start");
      sections.push("```");
      sections.push("");
    }
    if (analysis.scripts["build"]) {
      sections.push("Build for production:");
      sections.push("");
      sections.push("```bash");
      sections.push("npm run build");
      sections.push("```");
      sections.push("");
    }
    if (!analysis.scripts["dev"] && !analysis.scripts["start"] && analysis.entryPoint) {
      sections.push("Run the application:");
      sections.push("");
      if (analysis.language === "Python") {
        sections.push("```bash");
        sections.push(`python ${analysis.entryPoint}`);
        sections.push("```");
      } else if (analysis.language === "Go") {
        sections.push("```bash");
        sections.push("go run .");
        sections.push("```");
      } else {
        sections.push("```bash");
        sections.push(`node ${analysis.entryPoint}`);
        sections.push("```");
      }
      sections.push("");
    }

    const otherScripts = Object.entries(analysis.scripts).filter(
      ([k]) => !["dev", "start", "build", "test", "lint"].includes(k)
    );
    if (otherScripts.length > 0) {
      sections.push("### Available Scripts");
      sections.push("");
      sections.push("| Script | Command |");
      sections.push("|--------|---------|");
      Object.entries(analysis.scripts).forEach(([name, cmd]) => {
        sections.push(`| \`${name}\` | \`${cmd}\` |`);
      });
      sections.push("");
    }
  }

  if (opts.includeApi && analysis.framework) {
    sections.push("## API Documentation");
    sections.push("");
    if (["Express", "Fastify", "Hono", "Flask", "Django", "FastAPI"].includes(analysis.framework)) {
      sections.push(`This project uses ${analysis.framework} as the backend framework.`);
      sections.push("");
      sections.push("### Endpoints");
      sections.push("");
      sections.push("| Method | Path | Description |");
      sections.push("|--------|------|-------------|");
      sections.push("| GET | `/api/health` | Health check |");
      sections.push("| GET | `/api/v1/...` | API endpoints |");
      sections.push("");
      sections.push("> Refer to the source code for the complete list of available endpoints.");
    } else {
      sections.push(`Built with ${analysis.framework}. Refer to the source code for API documentation.`);
    }
    sections.push("");
  }

  if (analysis.hasTests) {
    sections.push("## Testing");
    sections.push("");
    sections.push("Run the test suite:");
    sections.push("");
    sections.push("```bash");
    if (analysis.scripts["test"]) {
      sections.push(`npm test`);
    } else if (analysis.language === "Python") {
      sections.push("pytest");
    } else if (analysis.language === "Go") {
      sections.push("go test ./...");
    } else if (analysis.language === "Rust") {
      sections.push("cargo test");
    } else {
      sections.push("npm test");
    }
    sections.push("```");
    sections.push("");
  }

  if (analysis.hasDocker) {
    sections.push("## Docker");
    sections.push("");
    sections.push("Build and run with Docker:");
    sections.push("");
    sections.push("```bash");
    sections.push(`docker build -t ${analysis.name} .`);
    sections.push(`docker run -p 3000:3000 ${analysis.name}`);
    sections.push("```");
    sections.push("");
  }

  sections.push("## Project Structure");
  sections.push("");
  sections.push("```");
  const dirs = new Set<string>();
  analysis.sourceFiles.slice(0, 20).forEach(f => {
    const parts = f.split("/");
    if (parts.length > 1) dirs.add(parts[0] + "/");
    sections.push(`├── ${f}`);
  });
  sections.push("```");
  sections.push("");

  if (opts.includeContributing) {
    sections.push("## Contributing");
    sections.push("");
    sections.push("Contributions are welcome! Please follow these steps:");
    sections.push("");
    sections.push("1. Fork the repository");
    sections.push("2. Create a feature branch (`git checkout -b feature/amazing-feature`)");
    sections.push("3. Commit your changes (`git commit -m 'Add amazing feature'`)");
    sections.push("4. Push to the branch (`git push origin feature/amazing-feature`)");
    sections.push("5. Open a Pull Request");
    sections.push("");
  }

  if (opts.includeLicense) {
    sections.push("## License");
    sections.push("");
    sections.push(`This project is licensed under the ${analysis.license} License — see the [LICENSE](LICENSE) file for details.`);
    sections.push("");
  }

  sections.push("---");
  sections.push("");
  sections.push(`*Generated by CodeCloud README Generator*`);
  sections.push("");

  if (opts.customSections) {
    for (const cs of opts.customSections) {
      sections.push(`## ${cs.title}`);
      sections.push("");
      sections.push(cs.content);
      sections.push("");
    }
  }

  return sections.join("\n");
}
