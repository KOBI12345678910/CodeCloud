/**
 * Lightweight wrapper around BullMQ. We import lazily so the package can be
 * built/tested without Redis installed locally. An in-memory driver is provided
 * for tests and dev environments where Redis isn't available.
 */

export interface JobPayloadMap {
  health: { ping: string; ts: number };
  "audit-log-writer": {
    actorId: string | null;
    tenantId: string | null;
    action: string;
    target?: string;
    metadata?: Record<string, unknown>;
  };
  // additional queues can extend this map via declaration merging
  [key: string]: Record<string, unknown>;
}

export type QueueName = keyof JobPayloadMap & string;

export interface QueueDriver {
  enqueue<N extends QueueName>(queue: N, payload: JobPayloadMap[N]): Promise<string>;
  process<N extends QueueName>(
    queue: N,
    handler: (payload: JobPayloadMap[N]) => Promise<void>,
  ): Promise<void>;
  close(): Promise<void>;
}

/**
 * Type-safe handler erasure. We can't store `(p: JobPayloadMap[N]) => …`
 * directly in a heterogeneous map, but we can store a wrapper that has
 * already captured its specific payload type at the `process` call site —
 * so the map value is `(p: unknown) => Promise<void>` and each entry is a
 * closure that re-narrows to the right payload at the boundary.
 */
type ErasedHandler = (payload: unknown) => Promise<void>;

/** In-memory driver: runs handlers immediately on the next microtask. */
export class InMemoryQueueDriver implements QueueDriver {
  private readonly handlers = new Map<string, ErasedHandler>();
  private readonly pending: Promise<void>[] = [];
  private nextId = 1;

  async enqueue<N extends QueueName>(queue: N, payload: JobPayloadMap[N]): Promise<string> {
    const id = String(this.nextId++);
    const handler = this.handlers.get(queue);
    if (handler) {
      const p = Promise.resolve().then(() => handler(payload));
      this.pending.push(p);
    }
    return id;
  }

  async process<N extends QueueName>(
    queue: N,
    handler: (payload: JobPayloadMap[N]) => Promise<void>,
  ): Promise<void> {
    // Re-narrow at the boundary: the wrapper takes `unknown` so it fits
    // the heterogeneous map, but every payload that flows through it is
    // typed by `enqueue<N>`'s call site, which is checked at compile time.
    const erased: ErasedHandler = (payload) => handler(payload as JobPayloadMap[N]);
    this.handlers.set(queue, erased);
  }

  async drain(): Promise<void> {
    await Promise.all(this.pending);
    this.pending.length = 0;
  }

  async close(): Promise<void> {
    await this.drain();
    this.handlers.clear();
  }
}

export interface BullMqDriverOptions {
  connection: { host: string; port: number; password?: string };
  prefix?: string;
}

/**
 * Construct a BullMQ-backed driver. bullmq + ioredis must be installed in the
 * consuming app for this to work.
 */
export async function createBullMqDriver(opts: BullMqDriverOptions): Promise<QueueDriver> {
  const { Queue, Worker } = await import("bullmq");
  type AnyQueue = InstanceType<typeof Queue>;
  type AnyWorker = InstanceType<typeof Worker>;
  const queues = new Map<string, AnyQueue>();
  const workers: AnyWorker[] = [];

  function getQueue(name: string): AnyQueue {
    let q = queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: opts.connection, prefix: opts.prefix });
      queues.set(name, q);
    }
    return q;
  }

  return {
    async enqueue(queue, payload) {
      const job = await getQueue(queue).add(queue, payload);
      return String(job.id);
    },
    async process(queue, handler) {
      const w = new Worker(
        queue,
        async (job) => {
          await handler(job.data as never);
        },
        { connection: opts.connection, prefix: opts.prefix },
      );
      workers.push(w);
    },
    async close() {
      await Promise.all(workers.map((w) => w.close()));
      await Promise.all(Array.from(queues.values()).map((q) => q.close()));
    },
  };
}
