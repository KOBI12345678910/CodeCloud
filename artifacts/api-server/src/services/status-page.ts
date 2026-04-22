export interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "partial-outage" | "major-outage";
  uptime: number;
  responseTime: number;
  lastChecked: Date;
}

export interface StatusPageConfig {
  title: string;
  description: string;
  services: ServiceStatus[];
  overallStatus: "operational" | "degraded" | "partial-outage" | "major-outage";
  lastUpdated: Date;
}

class StatusPageService {
  private services: Map<string, ServiceStatus> = new Map();

  constructor() {
    const defaults: Omit<ServiceStatus, "lastChecked">[] = [
      { name: "API", status: "operational", uptime: 99.99, responseTime: 45 },
      { name: "Web IDE", status: "operational", uptime: 99.95, responseTime: 120 },
      { name: "Database", status: "operational", uptime: 99.99, responseTime: 12 },
      { name: "File Storage", status: "operational", uptime: 99.97, responseTime: 80 },
      { name: "Deployments", status: "operational", uptime: 99.90, responseTime: 200 },
      { name: "Authentication", status: "operational", uptime: 99.99, responseTime: 30 },
    ];
    for (const s of defaults) this.services.set(s.name, { ...s, lastChecked: new Date() });
  }

  getPage(): StatusPageConfig {
    const services = Array.from(this.services.values());
    const hasOutage = services.some(s => s.status === "major-outage");
    const hasDegraded = services.some(s => s.status !== "operational");
    return {
      title: "CodeCloud Status", description: "Current system status",
      services, overallStatus: hasOutage ? "major-outage" : hasDegraded ? "degraded" : "operational",
      lastUpdated: new Date(),
    };
  }

  updateService(name: string, status: ServiceStatus["status"], responseTime?: number): ServiceStatus | null {
    const s = this.services.get(name); if (!s) return null;
    s.status = status; if (responseTime) s.responseTime = responseTime; s.lastChecked = new Date();
    return s;
  }

  getService(name: string): ServiceStatus | null { return this.services.get(name) || null; }
  listServices(): ServiceStatus[] { return Array.from(this.services.values()); }
}

export const statusPageService = new StatusPageService();
