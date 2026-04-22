export interface EnvironmentConfig {
  nodeVersion: string;
  pythonVersion: string;
  goVersion: string;
  workingDirectory: string;
  buildCommand: string;
  startCommand: string;
  installCommand: string;
}

export const SUPPORTED_VERSIONS = {
  node: ["16", "18", "20", "22"],
  python: ["3.9", "3.10", "3.11", "3.12"],
  go: ["1.20", "1.21", "1.22"],
};

export const DEFAULT_CONFIG: EnvironmentConfig = {
  nodeVersion: "20",
  pythonVersion: "3.11",
  goVersion: "1.21",
  workingDirectory: "/app",
  buildCommand: "",
  startCommand: "",
  installCommand: "",
};

const LANGUAGE_DEFAULTS: Record<string, Partial<EnvironmentConfig>> = {
  javascript: {
    installCommand: "npm install",
    startCommand: "node index.js",
    buildCommand: "",
  },
  typescript: {
    installCommand: "npm install",
    buildCommand: "npx tsc",
    startCommand: "node dist/index.js",
  },
  python: {
    installCommand: "pip install -r requirements.txt",
    startCommand: "python main.py",
    buildCommand: "",
  },
  go: {
    installCommand: "go mod download",
    buildCommand: "go build -o app .",
    startCommand: "./app",
  },
  html: {
    installCommand: "",
    startCommand: "npx serve .",
    buildCommand: "",
  },
  rust: {
    installCommand: "",
    buildCommand: "cargo build --release",
    startCommand: "./target/release/app",
  },
};

export function getDefaultConfigForLanguage(language: string): EnvironmentConfig {
  const languageDefaults = LANGUAGE_DEFAULTS[language.toLowerCase()] || {};
  return { ...DEFAULT_CONFIG, ...languageDefaults };
}

export function validateConfig(config: Partial<EnvironmentConfig>): string[] {
  const errors: string[] = [];

  if (config.nodeVersion && !SUPPORTED_VERSIONS.node.includes(config.nodeVersion)) {
    errors.push(`Unsupported Node.js version: ${config.nodeVersion}`);
  }
  if (config.pythonVersion && !SUPPORTED_VERSIONS.python.includes(config.pythonVersion)) {
    errors.push(`Unsupported Python version: ${config.pythonVersion}`);
  }
  if (config.goVersion && !SUPPORTED_VERSIONS.go.includes(config.goVersion)) {
    errors.push(`Unsupported Go version: ${config.goVersion}`);
  }
  if (config.workingDirectory && !config.workingDirectory.startsWith("/")) {
    errors.push("Working directory must be an absolute path");
  }

  return errors;
}

export function generateDockerfile(language: string, config: EnvironmentConfig): string {
  const lines: string[] = [];

  switch (language.toLowerCase()) {
    case "javascript":
    case "typescript":
      lines.push(`FROM node:${config.nodeVersion}-alpine`);
      lines.push(`WORKDIR ${config.workingDirectory}`);
      lines.push("COPY package*.json ./");
      if (config.installCommand) lines.push(`RUN ${config.installCommand}`);
      lines.push("COPY . .");
      if (config.buildCommand) lines.push(`RUN ${config.buildCommand}`);
      lines.push("EXPOSE 3000");
      lines.push(`CMD ["sh", "-c", "${config.startCommand}"]`);
      break;

    case "python":
      lines.push(`FROM python:${config.pythonVersion}-slim`);
      lines.push(`WORKDIR ${config.workingDirectory}`);
      lines.push("COPY requirements.txt* ./");
      if (config.installCommand) lines.push(`RUN ${config.installCommand}`);
      lines.push("COPY . .");
      if (config.buildCommand) lines.push(`RUN ${config.buildCommand}`);
      lines.push("EXPOSE 8000");
      lines.push(`CMD ["sh", "-c", "${config.startCommand}"]`);
      break;

    case "go":
      lines.push(`FROM golang:${config.goVersion}-alpine`);
      lines.push(`WORKDIR ${config.workingDirectory}`);
      lines.push("COPY go.* ./");
      if (config.installCommand) lines.push(`RUN ${config.installCommand}`);
      lines.push("COPY . .");
      if (config.buildCommand) lines.push(`RUN ${config.buildCommand}`);
      lines.push("EXPOSE 8080");
      lines.push(`CMD ["sh", "-c", "${config.startCommand}"]`);
      break;

    default:
      lines.push(`FROM node:${config.nodeVersion}-alpine`);
      lines.push(`WORKDIR ${config.workingDirectory}`);
      lines.push("COPY . .");
      if (config.installCommand) lines.push(`RUN ${config.installCommand}`);
      if (config.buildCommand) lines.push(`RUN ${config.buildCommand}`);
      lines.push(`CMD ["sh", "-c", "${config.startCommand}"]`);
  }

  return lines.join("\n");
}
