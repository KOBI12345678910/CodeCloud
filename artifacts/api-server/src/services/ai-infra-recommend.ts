export interface ProjectProfile {
  projectId: string;
  language: string;
  framework: string;
  hasDatabase: boolean;
  databaseType: string | null;
  estimatedTrafficRPS: number;
  estimatedStorageGB: number;
  hasStaticAssets: boolean;
  hasCronJobs: boolean;
  hasWebSockets: boolean;
  hasFileUploads: boolean;
  hasMLWorkloads: boolean;
  teamSize: number;
  region: string;
}

export interface ComputeRecommendation {
  tier: "starter" | "standard" | "performance" | "dedicated";
  vcpus: number;
  memoryGB: number;
  reason: string;
}

export interface DatabaseRecommendation {
  type: "postgresql" | "mysql" | "mongodb" | "redis" | "none";
  tier: "shared" | "dedicated" | "cluster";
  storageGB: number;
  replicas: number;
  reason: string;
}

export interface CacheRecommendation {
  enabled: boolean;
  type: "redis" | "memcached" | "in-memory" | "none";
  sizeGB: number;
  reason: string;
}

export interface CDNRecommendation {
  enabled: boolean;
  provider: "cloudflare" | "fastly" | "cloudfront" | "none";
  features: string[];
  reason: string;
}

export interface CostEstimate {
  compute: number;
  database: number;
  cache: number;
  cdn: number;
  storage: number;
  bandwidth: number;
  total: number;
  currency: "USD";
  period: "monthly";
}

export interface InfraRecommendation {
  projectId: string;
  generatedAt: Date;
  compute: ComputeRecommendation;
  database: DatabaseRecommendation;
  cache: CacheRecommendation;
  cdn: CDNRecommendation;
  costEstimate: CostEstimate;
  additionalNotes: string[];
  scalingAdvice: string;
  securityNotes: string[];
}

class AIInfraRecommendService {
  recommend(profile: ProjectProfile): InfraRecommendation {
    const compute = this.recommendCompute(profile);
    const database = this.recommendDatabase(profile);
    const cache = this.recommendCache(profile);
    const cdn = this.recommendCDN(profile);
    const costEstimate = this.estimateCost(compute, database, cache, cdn, profile);
    const additionalNotes = this.generateNotes(profile);
    const scalingAdvice = this.generateScalingAdvice(profile);
    const securityNotes = this.generateSecurityNotes(profile);

    return {
      projectId: profile.projectId,
      generatedAt: new Date(),
      compute,
      database,
      cache,
      cdn,
      costEstimate,
      additionalNotes,
      scalingAdvice,
      securityNotes,
    };
  }

  private recommendCompute(profile: ProjectProfile): ComputeRecommendation {
    if (profile.hasMLWorkloads) {
      return {
        tier: "dedicated",
        vcpus: 8,
        memoryGB: 32,
        reason: "ML workloads require dedicated compute with high memory for model inference and training data processing.",
      };
    }
    if (profile.estimatedTrafficRPS > 1000) {
      return {
        tier: "performance",
        vcpus: 4,
        memoryGB: 16,
        reason: `High traffic (${profile.estimatedTrafficRPS} RPS) requires performance-tier compute for consistent response times.`,
      };
    }
    if (profile.estimatedTrafficRPS > 100 || profile.hasWebSockets || profile.teamSize > 5) {
      return {
        tier: "standard",
        vcpus: 2,
        memoryGB: 8,
        reason: "Moderate traffic and feature requirements suit standard compute. WebSocket connections and team collaboration benefit from additional resources.",
      };
    }
    return {
      tier: "starter",
      vcpus: 1,
      memoryGB: 2,
      reason: "Low traffic project fits starter tier. Upgrade when traffic grows beyond 100 RPS.",
    };
  }

  private recommendDatabase(profile: ProjectProfile): DatabaseRecommendation {
    if (!profile.hasDatabase) {
      return { type: "none", tier: "shared", storageGB: 0, replicas: 0, reason: "No database required based on project profile." };
    }

    const dbType = (profile.databaseType as DatabaseRecommendation["type"]) || "postgresql";

    if (profile.estimatedTrafficRPS > 1000) {
      return {
        type: dbType,
        tier: "cluster",
        storageGB: Math.max(profile.estimatedStorageGB * 2, 100),
        replicas: 3,
        reason: `High traffic requires a clustered ${dbType} setup with read replicas for query distribution and failover.`,
      };
    }
    if (profile.estimatedTrafficRPS > 100 || profile.teamSize > 5) {
      return {
        type: dbType,
        tier: "dedicated",
        storageGB: Math.max(profile.estimatedStorageGB, 20),
        replicas: 1,
        reason: `Dedicated ${dbType} instance provides consistent performance and a read replica for backup and read scaling.`,
      };
    }
    return {
      type: dbType,
      tier: "shared",
      storageGB: Math.max(profile.estimatedStorageGB, 5),
      replicas: 0,
      reason: `Shared ${dbType} is cost-effective for low-traffic projects. Upgrade to dedicated when response times degrade.`,
    };
  }

  private recommendCache(profile: ProjectProfile): CacheRecommendation {
    if (profile.estimatedTrafficRPS > 500) {
      return {
        enabled: true,
        type: "redis",
        sizeGB: 4,
        reason: "High traffic benefits from Redis caching for session storage, query caching, and rate limiting.",
      };
    }
    if (profile.estimatedTrafficRPS > 50 || profile.hasWebSockets) {
      return {
        enabled: true,
        type: "redis",
        sizeGB: 1,
        reason: "Redis provides session management, pub/sub for WebSockets, and caching for improved response times.",
      };
    }
    if (profile.hasDatabase) {
      return {
        enabled: true,
        type: "in-memory",
        sizeGB: 0.25,
        reason: "In-memory caching reduces database load for frequently accessed data without additional infrastructure cost.",
      };
    }
    return { enabled: false, type: "none", sizeGB: 0, reason: "No caching needed for this project profile." };
  }

  private recommendCDN(profile: ProjectProfile): CDNRecommendation {
    if (profile.hasStaticAssets && profile.estimatedTrafficRPS > 100) {
      return {
        enabled: true,
        provider: "cloudflare",
        features: ["static asset caching", "DDoS protection", "image optimization", "edge workers", "SSL termination"],
        reason: "High-traffic static assets benefit from CDN edge caching, reducing origin load and improving global latency.",
      };
    }
    if (profile.hasStaticAssets) {
      return {
        enabled: true,
        provider: "cloudflare",
        features: ["static asset caching", "SSL termination", "basic DDoS protection"],
        reason: "CDN improves static asset delivery speed and provides free SSL and basic protection.",
      };
    }
    if (profile.hasFileUploads) {
      return {
        enabled: true,
        provider: "cloudfront",
        features: ["file delivery", "signed URLs", "geographic distribution"],
        reason: "CDN enables fast file delivery for uploads with signed URL support for access control.",
      };
    }
    return { enabled: false, provider: "none", features: [], reason: "No CDN needed — API-only projects benefit minimally from edge caching." };
  }

  private estimateCost(
    compute: ComputeRecommendation,
    database: DatabaseRecommendation,
    cache: CacheRecommendation,
    cdn: CDNRecommendation,
    profile: ProjectProfile
  ): CostEstimate {
    const computeCosts = { starter: 5, standard: 25, performance: 75, dedicated: 200 };
    const dbTierCosts = { shared: 0, dedicated: 25, cluster: 100 };
    const cacheCosts = cache.enabled ? (cache.type === "redis" ? cache.sizeGB * 15 : 0) : 0;
    const cdnCosts = cdn.enabled ? (cdn.provider === "cloudflare" ? 0 : 20) : 0;
    const storageCost = profile.estimatedStorageGB * 0.10;
    const bandwidthCost = profile.estimatedTrafficRPS * 0.01;

    const computeTotal = computeCosts[compute.tier];
    const dbTotal = database.type !== "none" ? dbTierCosts[database.tier] + database.storageGB * 0.10 : 0;

    return {
      compute: computeTotal,
      database: dbTotal,
      cache: cacheCosts,
      cdn: cdnCosts,
      storage: storageCost,
      bandwidth: bandwidthCost,
      total: computeTotal + dbTotal + cacheCosts + cdnCosts + storageCost + bandwidthCost,
      currency: "USD",
      period: "monthly",
    };
  }

  private generateNotes(profile: ProjectProfile): string[] {
    const notes: string[] = [];
    if (profile.hasMLWorkloads) notes.push("Consider GPU instances for ML inference. CPU-only inference is viable for smaller models.");
    if (profile.hasWebSockets) notes.push("WebSocket connections are long-lived — ensure compute tier supports the expected concurrent connection count.");
    if (profile.hasCronJobs) notes.push("Cron jobs can be offloaded to a separate worker to avoid impacting API response times.");
    if (profile.hasFileUploads) notes.push("Use object storage (S3/GCS) for file uploads rather than local disk to enable horizontal scaling.");
    if (profile.teamSize > 10) notes.push("Large teams benefit from staging environments and CI/CD pipelines to prevent deployment conflicts.");
    if (profile.estimatedTrafficRPS > 500) notes.push("Implement rate limiting and request queuing to handle traffic spikes gracefully.");
    if (profile.language === "python" && profile.estimatedTrafficRPS > 100) notes.push("Python applications may benefit from async frameworks (FastAPI) or multiple worker processes for higher throughput.");
    return notes;
  }

  private generateScalingAdvice(profile: ProjectProfile): string {
    if (profile.estimatedTrafficRPS > 1000) {
      return "Implement horizontal auto-scaling with load balancing. Use read replicas for database scaling. Consider microservice decomposition for independently scalable components.";
    }
    if (profile.estimatedTrafficRPS > 100) {
      return "Start with vertical scaling (larger instance). Add a read replica when database becomes bottleneck. Prepare horizontal scaling configuration for growth beyond 1000 RPS.";
    }
    return "Current load is manageable with a single instance. Monitor CPU and memory utilization — scale vertically when either consistently exceeds 70%.";
  }

  private generateSecurityNotes(profile: ProjectProfile): string[] {
    const notes: string[] = [
      "Enable HTTPS everywhere with automatic certificate renewal.",
      "Use environment variables for all secrets — never commit credentials to source control.",
    ];
    if (profile.hasDatabase) {
      notes.push("Restrict database access to application servers only via network policies.");
      notes.push("Enable database connection encryption (SSL/TLS).");
      notes.push("Set up automated database backups with point-in-time recovery.");
    }
    if (profile.hasFileUploads) {
      notes.push("Validate and sanitize all uploaded files. Scan for malware before processing.");
      notes.push("Use signed URLs with expiration for file access control.");
    }
    if (profile.estimatedTrafficRPS > 100) {
      notes.push("Implement rate limiting per IP and per user to prevent abuse.");
      notes.push("Enable WAF rules for common attack patterns (SQL injection, XSS).");
    }
    return notes;
  }
}

export const aiInfraRecommendService = new AIInfraRecommendService();
