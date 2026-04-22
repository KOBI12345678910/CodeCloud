export interface ErrorPattern {
  id: string;
  pattern: string;
  regex: RegExp;
  category: "runtime" | "network" | "memory" | "disk" | "auth" | "config" | "dependency";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestedFix: string;
  occurrences: number;
  lastSeen: Date | null;
  autoRemediation: boolean;
  remediationAction: string | null;
}

export interface ErrorOccurrence {
  id: string;
  patternId: string;
  containerId: string;
  containerName: string;
  timestamp: Date;
  rawMessage: string;
  stackTrace: string | null;
  context: Record<string, string>;
  resolved: boolean;
}

export interface CauseAnalysis {
  patternId: string;
  rootCause: string;
  contributingFactors: string[];
  affectedContainers: string[];
  timelineEvents: { timestamp: Date; event: string }[];
  recommendedActions: string[];
  confidence: number;
}

const DEFAULT_PATTERNS: Omit<ErrorPattern, "occurrences" | "lastSeen">[] = [
  {
    id: "ep-oom",
    pattern: "OOMKilled|out of memory|Cannot allocate memory|heap out of memory",
    regex: /OOMKilled|out of memory|Cannot allocate memory|heap out of memory/i,
    category: "memory",
    severity: "critical",
    description: "Out of memory — container exceeded memory limit",
    suggestedFix: "Increase memory limit or optimize memory usage. Check for memory leaks.",
    autoRemediation: true,
    remediationAction: "restart_with_increased_memory",
  },
  {
    id: "ep-econnrefused",
    pattern: "ECONNREFUSED|Connection refused|connect ECONNREFUSED",
    regex: /ECONNREFUSED|Connection refused|connect ECONNREFUSED/i,
    category: "network",
    severity: "high",
    description: "Connection refused — target service is not accepting connections",
    suggestedFix: "Verify target service is running. Check firewall rules and port bindings.",
    autoRemediation: false,
    remediationAction: null,
  },
  {
    id: "ep-enospc",
    pattern: "ENOSPC|No space left on device|disk full",
    regex: /ENOSPC|No space left on device|disk full/i,
    category: "disk",
    severity: "high",
    description: "Disk full — no space left on device",
    suggestedFix: "Clean up temporary files, logs, and unused artifacts. Increase disk allocation.",
    autoRemediation: true,
    remediationAction: "cleanup_temp_files",
  },
  {
    id: "ep-segfault",
    pattern: "Segmentation fault|SIGSEGV|signal 11",
    regex: /Segmentation fault|SIGSEGV|signal 11/i,
    category: "runtime",
    severity: "critical",
    description: "Segmentation fault — process crashed due to invalid memory access",
    suggestedFix: "Check native dependencies and runtime version compatibility. Review recent code changes.",
    autoRemediation: true,
    remediationAction: "restart_container",
  },
  {
    id: "ep-timeout",
    pattern: "ETIMEDOUT|request timeout|gateway timeout|504",
    regex: /ETIMEDOUT|request timeout|gateway timeout|504/i,
    category: "network",
    severity: "medium",
    description: "Request timeout — upstream service did not respond in time",
    suggestedFix: "Increase timeout settings. Check upstream service health and network latency.",
    autoRemediation: false,
    remediationAction: null,
  },
  {
    id: "ep-auth",
    pattern: "EACCES|Permission denied|401 Unauthorized|403 Forbidden",
    regex: /EACCES|Permission denied|401 Unauthorized|403 Forbidden/i,
    category: "auth",
    severity: "medium",
    description: "Permission denied — authentication or authorization failure",
    suggestedFix: "Verify credentials, tokens, and file permissions. Check service account roles.",
    autoRemediation: false,
    remediationAction: null,
  },
  {
    id: "ep-module",
    pattern: "MODULE_NOT_FOUND|Cannot find module|ModuleNotFoundError",
    regex: /MODULE_NOT_FOUND|Cannot find module|ModuleNotFoundError/i,
    category: "dependency",
    severity: "high",
    description: "Missing module — required dependency not found",
    suggestedFix: "Run package install. Verify dependency versions and lock file integrity.",
    autoRemediation: true,
    remediationAction: "reinstall_dependencies",
  },
  {
    id: "ep-config",
    pattern: "missing required|env variable.*not set|configuration error|invalid config",
    regex: /missing required|env variable.*not set|configuration error|invalid config/i,
    category: "config",
    severity: "medium",
    description: "Configuration error — missing or invalid configuration values",
    suggestedFix: "Check environment variables and configuration files. Ensure all required values are set.",
    autoRemediation: false,
    remediationAction: null,
  },
  {
    id: "ep-cpu",
    pattern: "CPU throttled|cpu quota exceeded|process.*100%",
    regex: /CPU throttled|cpu quota exceeded|process.*100%/i,
    category: "runtime",
    severity: "high",
    description: "CPU throttling — container exceeded CPU quota",
    suggestedFix: "Optimize CPU-intensive operations. Consider scaling horizontally or increasing CPU limits.",
    autoRemediation: true,
    remediationAction: "scale_cpu",
  },
];

class ErrorPatternService {
  private patterns: ErrorPattern[];
  private occurrences: ErrorOccurrence[] = [];

  constructor() {
    this.patterns = DEFAULT_PATTERNS.map(p => ({
      ...p,
      occurrences: 0,
      lastSeen: null,
    }));
  }

  getPatterns(): ErrorPattern[] {
    return [...this.patterns].sort((a, b) => b.occurrences - a.occurrences);
  }

  getPatternById(id: string): ErrorPattern | undefined {
    return this.patterns.find(p => p.id === id);
  }

  addPattern(pattern: Omit<ErrorPattern, "occurrences" | "lastSeen">): ErrorPattern {
    const entry: ErrorPattern = { ...pattern, occurrences: 0, lastSeen: null };
    this.patterns.push(entry);
    return entry;
  }

  removePattern(id: string): boolean {
    const idx = this.patterns.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.patterns.splice(idx, 1);
    return true;
  }

  matchMessage(message: string): ErrorPattern | null {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(message)) {
        pattern.occurrences++;
        pattern.lastSeen = new Date();
        return pattern;
      }
    }
    return null;
  }

  recordOccurrence(
    patternId: string,
    containerId: string,
    containerName: string,
    rawMessage: string,
    stackTrace: string | null = null,
    context: Record<string, string> = {}
  ): ErrorOccurrence {
    const occurrence: ErrorOccurrence = {
      id: `eo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      patternId,
      containerId,
      containerName,
      timestamp: new Date(),
      rawMessage,
      stackTrace,
      context,
      resolved: false,
    };
    this.occurrences.push(occurrence);
    return occurrence;
  }

  getOccurrences(patternId?: string, containerId?: string, limit = 50): ErrorOccurrence[] {
    let results = [...this.occurrences];
    if (patternId) results = results.filter(o => o.patternId === patternId);
    if (containerId) results = results.filter(o => o.containerId === containerId);
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  resolveOccurrence(id: string): boolean {
    const occ = this.occurrences.find(o => o.id === id);
    if (!occ) return false;
    occ.resolved = true;
    return true;
  }

  analyzeCause(patternId: string): CauseAnalysis | null {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (!pattern) return null;

    const occurrences = this.occurrences.filter(o => o.patternId === patternId);
    const affectedContainers = [...new Set(occurrences.map(o => o.containerName))];

    const analysis: CauseAnalysis = {
      patternId,
      rootCause: pattern.description,
      contributingFactors: this.getContributingFactors(pattern),
      affectedContainers,
      timelineEvents: occurrences.slice(0, 10).map(o => ({
        timestamp: o.timestamp,
        event: o.rawMessage,
      })),
      recommendedActions: [pattern.suggestedFix],
      confidence: Math.min(0.5 + occurrences.length * 0.1, 0.95),
    };

    return analysis;
  }

  private getContributingFactors(pattern: ErrorPattern): string[] {
    const factors: string[] = [];
    switch (pattern.category) {
      case "memory":
        factors.push("High memory usage trend", "Possible memory leak", "Insufficient memory limit");
        break;
      case "network":
        factors.push("Network latency", "Service dependency unavailable", "DNS resolution issues");
        break;
      case "disk":
        factors.push("Log file accumulation", "Build artifacts not cleaned", "Large temp files");
        break;
      case "runtime":
        factors.push("Incompatible runtime version", "Unhandled exception", "Resource exhaustion");
        break;
      case "auth":
        factors.push("Expired credentials", "Incorrect permissions", "Token rotation needed");
        break;
      case "config":
        factors.push("Missing environment variable", "Invalid config format", "Deployment config mismatch");
        break;
      case "dependency":
        factors.push("Lock file out of sync", "Incompatible versions", "Missing native bindings");
        break;
    }
    return factors;
  }

  getStats(): {
    totalPatterns: number;
    totalOccurrences: number;
    unresolvedCount: number;
    topPatterns: { id: string; description: string; count: number }[];
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const unresolvedCount = this.occurrences.filter(o => !o.resolved).length;
    const topPatterns = this.patterns
      .filter(p => p.occurrences > 0)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5)
      .map(p => ({ id: p.id, description: p.description, count: p.occurrences }));

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const p of this.patterns) {
      bySeverity[p.severity] = (bySeverity[p.severity] || 0) + p.occurrences;
      byCategory[p.category] = (byCategory[p.category] || 0) + p.occurrences;
    }

    return {
      totalPatterns: this.patterns.length,
      totalOccurrences: this.occurrences.length,
      unresolvedCount,
      topPatterns,
      bySeverity,
      byCategory,
    };
  }
}

export const errorPatternService = new ErrorPatternService();
