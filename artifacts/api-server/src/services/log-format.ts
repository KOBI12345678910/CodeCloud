export interface LogFormat {
  id: string;
  deploymentId: string;
  name: string;
  format: "json" | "text" | "clf" | "custom";
  template: string;
  fields: string[];
  enrichment: Record<string, string>;
  samplingRate: number;
  enabled: boolean;
  createdAt: Date;
}

class LogFormatService {
  private formats: Map<string, LogFormat> = new Map();

  create(deploymentId: string, name: string, format: LogFormat["format"]): LogFormat {
    const id = `lf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const templates: Record<string, string> = {
      json: '{"timestamp":"$time","level":"$level","message":"$message","request_id":"$request_id"}',
      text: "$time [$level] $message",
      clf: '$remote_addr - $remote_user [$time] "$request" $status $body_bytes_sent',
      custom: "$time | $level | $service | $message",
    };
    const lf: LogFormat = {
      id, deploymentId, name, format,
      template: templates[format],
      fields: ["timestamp", "level", "message", "request_id", "service", "environment"],
      enrichment: { service: name, environment: "production" },
      samplingRate: 1.0, enabled: true, createdAt: new Date(),
    };
    this.formats.set(id, lf);
    return lf;
  }

  get(id: string): LogFormat | null { return this.formats.get(id) || null; }
  list(deploymentId?: string): LogFormat[] {
    const all = Array.from(this.formats.values());
    return deploymentId ? all.filter(f => f.deploymentId === deploymentId) : all;
  }

  update(id: string, updates: Partial<Pick<LogFormat, "template" | "fields" | "enrichment" | "samplingRate" | "enabled">>): LogFormat | null {
    const lf = this.formats.get(id);
    if (!lf) return null;
    Object.assign(lf, updates);
    return lf;
  }

  delete(id: string): boolean { return this.formats.delete(id); }

  preview(id: string): string | null {
    const lf = this.formats.get(id);
    if (!lf) return null;
    let output = lf.template;
    const vars: Record<string, string> = {
      time: new Date().toISOString(), level: "INFO", message: "Request processed",
      request_id: "req-abc123", remote_addr: "192.168.1.1", remote_user: "-",
      request: "GET /api/health HTTP/1.1", status: "200", body_bytes_sent: "1234",
      service: lf.enrichment.service || "app", ...lf.enrichment,
    };
    for (const [k, v] of Object.entries(vars)) output = output.replace(new RegExp(`\\$${k}`, "g"), v);
    return output;
  }
}

export const logFormatService = new LogFormatService();
