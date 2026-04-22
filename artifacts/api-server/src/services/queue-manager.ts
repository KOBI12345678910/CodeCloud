type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "dead-letter";

interface QueueJob {
  id: string;
  queue: string;
  name: string;
  data: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  progress: number;
  result: unknown;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  nextRetryAt: string | null;
}

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  deadLetter: number;
  throughput: number;
  avgProcessingMs: number;
}

class QueueManagerService {
  private jobs = new Map<string, QueueJob>();
  private queues = new Map<string, QueueStats>();

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData(): void {
    const queueNames = ["email", "deployments", "ai-tasks", "backups", "webhooks", "notifications"];
    const now = Date.now();

    for (const qName of queueNames) {
      const waiting = Math.floor(Math.random() * 20);
      const active = Math.floor(Math.random() * 5);
      const completed = Math.floor(500 + Math.random() * 5000);
      const failed = Math.floor(Math.random() * 50);
      const delayed = Math.floor(Math.random() * 10);

      this.queues.set(qName, {
        name: qName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        deadLetter: Math.floor(Math.random() * 5),
        throughput: Math.floor(10 + Math.random() * 100),
        avgProcessingMs: Math.floor(50 + Math.random() * 2000),
      });

      for (let i = 0; i < Math.min(waiting + active + failed, 20); i++) {
        const id = `job_${qName}_${now}_${i}`;
        const statuses: JobStatus[] = ["waiting", "active", "completed", "failed"];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        this.jobs.set(id, {
          id,
          queue: qName,
          name: `${qName}-task-${i}`,
          data: { projectId: `proj_${Math.random().toString(36).slice(2, 8)}` },
          status,
          attempts: status === "failed" ? Math.floor(1 + Math.random() * 3) : 1,
          maxAttempts: 3,
          progress: status === "completed" ? 100 : status === "active" ? Math.floor(Math.random() * 100) : 0,
          result: status === "completed" ? { success: true } : null,
          error: status === "failed" ? "Processing failed: timeout exceeded" : null,
          createdAt: new Date(now - Math.floor(Math.random() * 3600_000)).toISOString(),
          processedAt: status !== "waiting" ? new Date(now - Math.floor(Math.random() * 1800_000)).toISOString() : null,
          completedAt: status === "completed" ? new Date(now - Math.floor(Math.random() * 600_000)).toISOString() : null,
          failedAt: status === "failed" ? new Date(now - Math.floor(Math.random() * 600_000)).toISOString() : null,
          nextRetryAt: status === "failed" ? new Date(now + Math.floor(Math.random() * 300_000)).toISOString() : null,
        });
      }
    }
  }

  getAllQueues(): QueueStats[] {
    return [...this.queues.values()];
  }

  getQueueStats(queueName: string): QueueStats | null {
    return this.queues.get(queueName) || null;
  }

  getJobs(queueName: string, status?: JobStatus, limit: number = 50): QueueJob[] {
    return [...this.jobs.values()]
      .filter(j => j.queue === queueName && (!status || j.status === status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getJob(jobId: string): QueueJob | null {
    return this.jobs.get(jobId) || null;
  }

  addJob(queueName: string, name: string, data: Record<string, unknown>): QueueJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: QueueJob = {
      id, queue: queueName, name, data,
      status: "waiting", attempts: 0, maxAttempts: 3, progress: 0,
      result: null, error: null,
      createdAt: new Date().toISOString(),
      processedAt: null, completedAt: null, failedAt: null, nextRetryAt: null,
    };
    this.jobs.set(id, job);

    const stats = this.queues.get(queueName);
    if (stats) stats.waiting++;

    setTimeout(() => {
      job.status = "active";
      job.processedAt = new Date().toISOString();
      job.attempts = 1;
      if (stats) { stats.waiting--; stats.active++; }

      setTimeout(() => {
        job.status = "completed";
        job.progress = 100;
        job.completedAt = new Date().toISOString();
        job.result = { success: true };
        if (stats) { stats.active--; stats.completed++; }
      }, 1500);
    }, 500);

    return job;
  }

  retryJob(jobId: string): { success: boolean; message: string; job: QueueJob | null } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, message: "Job not found", job: null };
    if (job.status !== "failed" && job.status !== "dead-letter") {
      return { success: false, message: "Only failed or dead-letter jobs can be retried", job };
    }

    job.status = "waiting";
    job.error = null;
    job.failedAt = null;
    job.nextRetryAt = null;

    const stats = this.queues.get(job.queue);
    if (stats) {
      if (job.status === "dead-letter") stats.deadLetter--;
      else stats.failed--;
      stats.waiting++;
    }

    setTimeout(() => {
      job.status = "active";
      job.processedAt = new Date().toISOString();
      job.attempts++;
      if (stats) { stats.waiting--; stats.active++; }

      setTimeout(() => {
        if (Math.random() > 0.3) {
          job.status = "completed";
          job.progress = 100;
          job.completedAt = new Date().toISOString();
          job.result = { success: true, retried: true };
          if (stats) { stats.active--; stats.completed++; }
        } else {
          job.status = "failed";
          job.failedAt = new Date().toISOString();
          job.error = "Retry failed: service unavailable";
          if (stats) { stats.active--; stats.failed++; }
        }
      }, 2000);
    }, 500);

    return { success: true, message: "Job queued for retry", job };
  }

  moveToDlq(jobId: string): { success: boolean; message: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, message: "Job not found" };
    if (job.status !== "failed") return { success: false, message: "Only failed jobs can be moved to DLQ" };

    const stats = this.queues.get(job.queue);
    if (stats) { stats.failed--; stats.deadLetter++; }
    job.status = "dead-letter";
    return { success: true, message: "Job moved to dead-letter queue" };
  }

  purgeQueue(queueName: string, status?: JobStatus): { purged: number } {
    let purged = 0;
    for (const [id, job] of this.jobs) {
      if (job.queue === queueName && (!status || job.status === status)) {
        this.jobs.delete(id);
        purged++;
      }
    }
    return { purged };
  }

  getDeadLetterJobs(limit: number = 50): QueueJob[] {
    return [...this.jobs.values()]
      .filter(j => j.status === "dead-letter")
      .sort((a, b) => new Date(b.failedAt || b.createdAt).getTime() - new Date(a.failedAt || a.createdAt).getTime())
      .slice(0, limit);
  }

  getDashboard(): {
    queues: QueueStats[];
    totalJobs: number;
    activeJobs: number;
    failedJobs: number;
    deadLetterJobs: number;
    throughputPerMin: number;
  } {
    const queues = this.getAllQueues();
    return {
      queues,
      totalJobs: this.jobs.size,
      activeJobs: [...this.jobs.values()].filter(j => j.status === "active").length,
      failedJobs: [...this.jobs.values()].filter(j => j.status === "failed").length,
      deadLetterJobs: [...this.jobs.values()].filter(j => j.status === "dead-letter").length,
      throughputPerMin: queues.reduce((sum, q) => sum + q.throughput, 0),
    };
  }
}

export const queueManager = new QueueManagerService();
