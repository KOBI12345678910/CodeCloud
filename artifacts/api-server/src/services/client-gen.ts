export interface GeneratedClient {
  id: string;
  projectId: string;
  language: "typescript" | "python" | "go";
  version: string;
  specUrl: string;
  code: string;
  packageName: string;
  status: "generating" | "ready" | "failed";
  createdAt: Date;
}

class ClientGenService {
  private clients: GeneratedClient[] = [];

  generate(projectId: string, language: GeneratedClient["language"], specUrl: string): GeneratedClient {
    const packageName = `api-client-${language}`;
    const code = this.generateCode(language, packageName);
    const client: GeneratedClient = {
      id: `cg-${Date.now()}`, projectId, language, version: "1.0.0",
      specUrl, code, packageName, status: "ready", createdAt: new Date(),
    };
    this.clients.push(client);
    return client;
  }

  list(projectId?: string): GeneratedClient[] {
    return projectId ? this.clients.filter(c => c.projectId === projectId) : this.clients;
  }

  get(id: string): GeneratedClient | null { return this.clients.find(c => c.id === id) || null; }

  private generateCode(language: string, pkg: string): string {
    if (language === "typescript") {
      return `// Auto-generated API client: ${pkg}
export class ApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}
  
  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      method, headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: \`Bearer \${this.apiKey}\` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(\`API error: \${res.status}\`);
    return res.json();
  }
  
  async getProjects() { return this.request<any[]>("GET", "/api/projects"); }
  async getProject(id: string) { return this.request<any>("GET", \`/api/projects/\${id}\`); }
  async createProject(data: any) { return this.request<any>("POST", "/api/projects", data); }
}`;
    }
    if (language === "python") {
      return `# Auto-generated API client: ${pkg}
import requests

class ApiClient:
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url
        self.headers = {"Content-Type": "application/json"}
        if api_key: self.headers["Authorization"] = f"Bearer {api_key}"
    
    def get_projects(self): return requests.get(f"{self.base_url}/api/projects", headers=self.headers).json()
    def get_project(self, id): return requests.get(f"{self.base_url}/api/projects/{id}", headers=self.headers).json()
`;
    }
    return `// Auto-generated ${language} client for ${pkg}`;
  }
}

export const clientGenService = new ClientGenService();
