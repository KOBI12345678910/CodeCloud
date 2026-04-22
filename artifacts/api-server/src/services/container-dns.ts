export interface DnsRecord {
  id: string;
  name: string;
  type: "A" | "AAAA" | "CNAME" | "SRV";
  value: string;
  ttl: number;
  internal: boolean;
}

export interface DnsConfig {
  projectId: string;
  records: DnsRecord[];
  cacheEnabled: boolean;
  cacheTtl: number;
  monitoring: { queries: number; cacheHits: number; cacheMisses: number; errors: number };
}

export function getDnsConfig(projectId: string): DnsConfig {
  return {
    projectId, cacheEnabled: true, cacheTtl: 300,
    records: [
      { id: "d1", name: "api.project.internal", type: "A", value: "10.0.1.10", ttl: 300, internal: true },
      { id: "d2", name: "db.project.internal", type: "A", value: "10.0.1.20", ttl: 600, internal: true },
      { id: "d3", name: "cache.project.internal", type: "A", value: "10.0.1.30", ttl: 300, internal: true },
      { id: "d4", name: "app.example.com", type: "CNAME", value: "lb.codecloud.io", ttl: 3600, internal: false },
    ],
    monitoring: { queries: 45000, cacheHits: 38000, cacheMisses: 7000, errors: 12 },
  };
}

export function addDnsRecord(projectId: string, record: Omit<DnsRecord, "id">): DnsRecord {
  return { ...record, id: crypto.randomUUID() };
}
