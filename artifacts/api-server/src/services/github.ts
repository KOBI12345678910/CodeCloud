export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "";

export function getGitHubConfig() {
  return {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    redirectUri: GITHUB_REDIRECT_URI,
    isConfigured: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
  };
}

export function buildGitHubAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as GitHubTokenResponse & { error?: string; error_description?: string };

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data as GitHubTokenResponse;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }

  return (await response.json()) as GitHubUser;
}

export async function fetchGitHubEmails(accessToken: string): Promise<GitHubEmail[]> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub emails fetch failed: ${response.status}`);
  }

  return (await response.json()) as GitHubEmail[];
}

export function getPrimaryEmail(emails: GitHubEmail[]): string | null {
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary.email;

  const verified = emails.find((e) => e.verified);
  if (verified) return verified.email;

  return null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  updated_at: string;
}

export interface GitHubFileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  download_url: string | null;
}

export async function listUserRepos(accessToken: string, page = 1, perPage = 30): Promise<GitHubRepo[]> {
  const response = await fetch(
    `https://api.github.com/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}&type=all`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!response.ok) throw new Error(`GitHub repos fetch failed: ${response.status}`);
  return (await response.json()) as GitHubRepo[];
}

export async function getRepoContents(
  accessToken: string,
  owner: string,
  repo: string,
  path = "",
  branch = "main"
): Promise<GitHubFileEntry[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!response.ok) throw new Error(`GitHub contents fetch failed: ${response.status}`);
  const result = await response.json();
  return Array.isArray(result) ? (result as GitHubFileEntry[]) : [result as GitHubFileEntry];
}

export async function getFileRawContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch = "main"
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.text();
}

const LANG_MAP: Record<string, string> = {
  JavaScript: "javascript",
  TypeScript: "typescript",
  Python: "python",
  Go: "go",
  Rust: "rust",
  Java: "java",
  Ruby: "ruby",
  "C++": "cpp",
  C: "cpp",
  PHP: "php",
  HTML: "html",
};

export function detectLanguage(githubLang: string | null): string {
  if (!githubLang) return "javascript";
  return LANG_MAP[githubLang] || githubLang.toLowerCase();
}

export function detectRunCommand(lang: string, fileNames: string[]): string {
  const has = (name: string) => fileNames.some((f) => f === name || f.endsWith(`/${name}`));

  if (has("package.json")) {
    if (has("next.config.js") || has("next.config.ts") || has("next.config.mjs")) return "npm run dev";
    if (has("vite.config.ts") || has("vite.config.js")) return "npm run dev";
    return "npm start";
  }
  if (has("requirements.txt") || has("setup.py") || has("pyproject.toml")) {
    if (has("manage.py")) return "python manage.py runserver";
    if (has("app.py")) return "python app.py";
    return "python main.py";
  }
  if (has("go.mod")) return "go run .";
  if (has("Cargo.toml")) return "cargo run";
  if (has("Gemfile")) return "bundle exec ruby app.rb";
  if (has("index.html")) return "npx serve .";

  switch (lang) {
    case "python": return "python main.py";
    case "go": return "go run .";
    case "rust": return "cargo run";
    default: return "npm start";
  }
}
