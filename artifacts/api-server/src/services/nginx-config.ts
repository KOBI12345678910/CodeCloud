export interface NginxConfig {
  id: string;
  projectId: string;
  name: string;
  config: string;
  locations: NginxLocation[];
  upstreams: NginxUpstream[];
  gzip: boolean;
  gzipTypes: string[];
  headers: Record<string, string>;
  ssl: boolean;
  http2: boolean;
  rateLimit: string | null;
  cacheControl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NginxLocation {
  path: string;
  proxyPass: string | null;
  root: string | null;
  tryFiles: string | null;
  rewrite: string | null;
  headers: Record<string, string>;
}

export interface NginxUpstream {
  name: string;
  servers: { address: string; weight: number; backup: boolean }[];
  method: "round_robin" | "least_conn" | "ip_hash";
}

class NginxConfigService {
  private configs: Map<string, NginxConfig> = new Map();

  create(projectId: string, name: string): NginxConfig {
    const id = `nginx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const config: NginxConfig = {
      id, projectId, name,
      config: this.generateDefault(name),
      locations: [
        { path: "/", proxyPass: "http://localhost:3000", root: null, tryFiles: null, rewrite: null, headers: {} },
        { path: "/static/", proxyPass: null, root: "/var/www/static", tryFiles: "$uri $uri/ =404", rewrite: null, headers: { "Cache-Control": "public, max-age=31536000" } },
      ],
      upstreams: [{ name: "app", servers: [{ address: "127.0.0.1:3000", weight: 1, backup: false }], method: "round_robin" }],
      gzip: true,
      gzipTypes: ["text/plain", "text/css", "application/json", "application/javascript", "text/xml", "application/xml", "image/svg+xml"],
      headers: { "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "X-XSS-Protection": "1; mode=block" },
      ssl: true, http2: true,
      rateLimit: "10r/s", cacheControl: "public, max-age=3600",
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.configs.set(id, config);
    return config;
  }

  get(id: string): NginxConfig | null {
    return this.configs.get(id) || null;
  }

  getByProject(projectId: string): NginxConfig[] {
    return Array.from(this.configs.values()).filter(c => c.projectId === projectId);
  }

  update(id: string, updates: Partial<Pick<NginxConfig, "name" | "locations" | "upstreams" | "gzip" | "gzipTypes" | "headers" | "ssl" | "http2" | "rateLimit" | "cacheControl">>): NginxConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;
    Object.assign(config, updates, { updatedAt: new Date() });
    config.config = this.generate(config);
    return config;
  }

  delete(id: string): boolean {
    return this.configs.delete(id);
  }

  validate(configStr: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const braces = configStr.split("").reduce((acc, ch) => acc + (ch === "{" ? 1 : ch === "}" ? -1 : 0), 0);
    if (braces !== 0) errors.push("Unmatched braces in configuration");
    if (!configStr.includes("server")) errors.push("Missing server block");
    if (configStr.includes("root") && !configStr.includes("root /")) errors.push("Root directive may be misconfigured");
    return { valid: errors.length === 0, errors };
  }

  private generateDefault(name: string): string {
    return `server {
    listen 80;
    server_name ${name}.codecloud.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
  }

  private generate(config: NginxConfig): string {
    let lines: string[] = [];

    for (const upstream of config.upstreams) {
      lines.push(`upstream ${upstream.name} {`);
      if (upstream.method !== "round_robin") lines.push(`    ${upstream.method.replace("_", " ")};`);
      for (const s of upstream.servers) {
        let line = `    server ${s.address}`;
        if (s.weight !== 1) line += ` weight=${s.weight}`;
        if (s.backup) line += " backup";
        lines.push(line + ";");
      }
      lines.push("}", "");
    }

    lines.push("server {");
    lines.push(config.ssl ? "    listen 443 ssl" + (config.http2 ? " http2" : "") + ";" : "    listen 80;");
    lines.push(`    server_name ${config.name}.codecloud.dev;`);
    lines.push("");

    if (config.gzip) {
      lines.push("    gzip on;");
      lines.push(`    gzip_types ${config.gzipTypes.join(" ")};`);
      lines.push("");
    }

    for (const [key, value] of Object.entries(config.headers)) {
      lines.push(`    add_header ${key} "${value}";`);
    }
    if (Object.keys(config.headers).length) lines.push("");

    for (const loc of config.locations) {
      lines.push(`    location ${loc.path} {`);
      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        lines.push("        proxy_http_version 1.1;");
        lines.push("        proxy_set_header Host $host;");
      }
      if (loc.root) lines.push(`        root ${loc.root};`);
      if (loc.tryFiles) lines.push(`        try_files ${loc.tryFiles};`);
      if (loc.rewrite) lines.push(`        rewrite ${loc.rewrite};`);
      for (const [k, v] of Object.entries(loc.headers)) {
        lines.push(`        add_header ${k} "${v}";`);
      }
      lines.push("    }");
    }

    lines.push("}");
    return lines.join("\n");
  }
}

export const nginxConfigService = new NginxConfigService();
