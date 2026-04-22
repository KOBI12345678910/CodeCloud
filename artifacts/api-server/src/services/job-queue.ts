export interface Job {
  id: string;
  queue: string;
  name: string;
  data: any;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  priority: number;
  attempts: number;
  maxAttempts: number;
  result: any;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

class JobQueueService {
  private jobs: Map<string, Job> = new Map();
  private queues: Set<string> = new Set(["default", "email", "deploy", "build", "cleanup"]);

  addJob(queue: string, name: string, data: any, priority: number = 0, maxAttempts: number = 3): Job {
    this.queues.add(queue);
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: Job = {
      id, queue, name, data, status: "waiting", priority, attempts: 0, maxAttempts,
      result: null, error: null, createdAt: new Date(), processedAt: null, completedAt: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  processJob(id: string): Job | null {
    const job = this.jobs.get(id); if (!job) return null;
    job.status = "active"; job.processedAt = new Date(); job.attempts++;
    if (Math.random() > 0.1) { job.status = "completed"; job.result = { success: true }; job.completedAt = new Date(); }
    else { job.status = job.attempts >= job.maxAttempts ? "failed" : "waiting"; job.error = "Processing error"; }
    return job;
  }

  getJob(id: string): Job | null { return this.jobs.get(id) || null; }
  listJobs(queue?: string, status?: Job["status"]): Job[] {
    let all = Array.from(this.jobs.values());
    if (queue) all = all.filter(j => j.queue === queue);
    if (status) all = all.filter(j => j.status === status);
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getQueueStats(): QueueStats[] {
    return Array.from(this.queues).map(name => {
      const jobs = Array.from(this.jobs.values()).filter(j => j.queue === name);
      return { name, waiting: jobs.filter(j => j.status === "waiting").length, active: jobs.filter(j => j.status === "active").length, completed: jobs.filter(j => j.status === "completed").length, failed: jobs.filter(j => j.status === "failed").length, delayed: jobs.filter(j => j.status === "delayed").length };
    });
  }

  retryFailed(queue: string): number {
    let count = 0;
    for (const job of this.jobs.values()) { if (job.queue === queue && job.status === "failed") { job.status = "waiting"; job.error = null; count++; } }
    return count;
  }

  purge(queue: string, status: Job["status"]): number {
    let count = 0;
    for (const [id, job] of this.jobs) { if (job.queue === queue && job.status === status) { this.jobs.delete(id); count++; } }
    return count;
  }

  removeJob(id: string): boolean { return this.jobs.delete(id); }
}

export const jobQueueService = new JobQueueService();
