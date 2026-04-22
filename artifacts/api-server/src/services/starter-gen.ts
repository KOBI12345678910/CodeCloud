export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export interface StarterGenResult {
  projectName: string;
  description: string;
  files: GeneratedFile[];
  techStack: string[];
}

export function generateStarterFiles(description: string, language: string = "typescript"): StarterGenResult {
  const projectName = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const files: GeneratedFile[] = [
    { path: "package.json", content: JSON.stringify({ name: projectName, version: "1.0.0", scripts: { dev: "tsx watch src/index.ts", build: "tsc", start: "node dist/index.js", test: "vitest" }, dependencies: { express: "^5.0.0" }, devDependencies: { typescript: "^5.3.0", tsx: "^4.0.0", vitest: "^1.0.0" } }, null, 2), description: "Project manifest with dependencies and scripts" },
    { path: "tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", strict: true, outDir: "dist", rootDir: "src", esModuleInterop: true, skipLibCheck: true }, include: ["src"] }, null, 2), description: "TypeScript configuration" },
    { path: ".gitignore", content: "node_modules/\ndist/\n.env\n*.log\ncoverage/\n.DS_Store", description: "Git ignore rules" },
    { path: ".eslintrc.json", content: JSON.stringify({ extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"], parser: "@typescript-eslint/parser", rules: { "no-console": "warn" } }, null, 2), description: "ESLint configuration" },
    { path: "Dockerfile", content: "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY dist ./dist\nEXPOSE 3000\nCMD [\"node\", \"dist/index.js\"]", description: "Docker container definition" },
    { path: "README.md", content: `# ${projectName}\n\n${description}\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Build\n\n\`\`\`bash\nnpm run build\nnpm start\n\`\`\``, description: "Project documentation" },
    { path: "src/index.ts", content: `import express from "express";\n\nconst app = express();\nconst port = process.env.PORT || 3000;\n\napp.get("/", (_req, res) => res.json({ status: "ok" }));\n\napp.listen(port, () => console.log(\`Server running on port \${port}\`));`, description: "Application entry point" },
  ];
  return { projectName, description, files, techStack: ["TypeScript", "Express", "Node.js"] };
}
