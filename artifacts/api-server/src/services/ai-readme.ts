export interface GeneratedReadme {
  id: string;
  projectId: string;
  content: string;
  sections: string[];
  generatedAt: Date;
}

class AIReadmeService {
  private readmes: GeneratedReadme[] = [];

  generate(projectId: string, projectName: string, files: { path: string; content: string }[]): GeneratedReadme {
    const languages = new Set<string>();
    const hasPackageJson = files.some(f => f.path.includes("package.json"));
    const hasRequirements = files.some(f => f.path.includes("requirements.txt"));
    const hasCargo = files.some(f => f.path.includes("Cargo.toml"));
    
    for (const f of files) {
      const ext = f.path.split(".").pop()?.toLowerCase();
      if (ext === "ts" || ext === "tsx") languages.add("TypeScript");
      if (ext === "js" || ext === "jsx") languages.add("JavaScript");
      if (ext === "py") languages.add("Python");
      if (ext === "rs") languages.add("Rust");
      if (ext === "go") languages.add("Go");
    }

    const langStr = Array.from(languages).join(", ") || "JavaScript";
    const sections = ["Description", "Features", "Tech Stack", "Getting Started", "Project Structure", "API Reference", "Contributing", "License"];

    const content = `# ${projectName}

## Description

${projectName} is a modern application built with ${langStr}. It provides a comprehensive set of features for developers and teams.

## Features

- Fast and responsive user interface
- RESTful API with comprehensive endpoints
- Real-time collaboration support
- Built-in authentication and authorization
- Deployment and CI/CD integration

## Tech Stack

${Array.from(languages).map(l => `- **${l}**`).join("\n")}
${hasPackageJson ? "- **Node.js** with npm/pnpm" : ""}
${hasRequirements ? "- **Python** with pip" : ""}
${hasCargo ? "- **Rust** with Cargo" : ""}

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- ${hasPackageJson ? "pnpm" : "npm"} package manager

### Installation

\`\`\`bash
git clone https://github.com/your-org/${projectName.toLowerCase().replace(/\s+/g, "-")}.git
cd ${projectName.toLowerCase().replace(/\s+/g, "-")}
${hasPackageJson ? "pnpm install" : "npm install"}
\`\`\`

### Running

\`\`\`bash
${hasPackageJson ? "pnpm dev" : "npm run dev"}
\`\`\`

## Project Structure

\`\`\`
${files.slice(0, 15).map(f => f.path).join("\n")}
\`\`\`

## API Reference

See the API documentation at \`/api/docs\` when running locally.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a Pull Request

## License

MIT License - see LICENSE file for details.
`;

    const readme: GeneratedReadme = {
      id: `readme-${Date.now()}`, projectId, content, sections, generatedAt: new Date(),
    };
    this.readmes.push(readme);
    return readme;
  }

  list(projectId?: string): GeneratedReadme[] {
    return projectId ? this.readmes.filter(r => r.projectId === projectId) : this.readmes;
  }
}

export const aiReadmeService = new AIReadmeService();
