import {
  TRPCError,
  middleware,
  mutatingProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  z,
  type PlatformContext,
} from "@platform/trpc";
import {
  InMemoryQueueDriver,
  createBullMqDriver,
  type QueueDriver,
} from "@platform/queue";
import {
  SessionManager,
  InMemorySessionAdapter,
  PostgresSessionAdapter,
  type SessionAdapter,
} from "@platform/auth";

/**
 * Mutable runtime singletons. They start with safe in-memory defaults
 * for tests; `configureRuntime()` swaps in production-grade Postgres
 * + Redis-backed implementations at server boot when DATABASE_URL /
 * REDIS_URL are present.
 */
export let queueDriver: QueueDriver = new InMemoryQueueDriver();
export const processedHealthJobs: Array<{ ping: string; ts: number }> = [];
export let sessions = new SessionManager(new InMemorySessionAdapter());

async function registerHealthHandler(driver: QueueDriver) {
  await driver.process("health", async (payload) => {
    processedHealthJobs.push(payload);
  });
}
await registerHealthHandler(queueDriver);

export interface RuntimeConfig {
  databaseUrl?: string;
  redisUrl?: string;
}

/**
 * Boot-time wiring. Pass DATABASE_URL / REDIS_URL from validated env to
 * upgrade the in-memory defaults to production-grade adapters:
 *
 *   - SessionManager → PostgresSessionAdapter (sessions survive restarts
 *     and scale across instances)
 *   - QueueDriver → BullMQ-over-Redis (cross-process API → worker)
 *
 * If either URL is omitted (e.g. tests), the in-memory default stays in
 * place. The function is idempotent and safe to call once at boot.
 */
export async function configureRuntime(cfg: RuntimeConfig): Promise<void> {
  if (cfg.databaseUrl) {
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: cfg.databaseUrl });
    // Bootstrap auth tables idempotently. In a richer setup these live
    // in @platform/db migrations; here we self-bootstrap so a fresh
    // `docker compose up` boots cleanly without a separate migrate step.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id text PRIMARY KEY,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        tenant_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        user_id_hash text NOT NULL,
        tenant_id text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
    `);
    const pgAdapter: SessionAdapter = new PostgresSessionAdapter({
      query: (text, params) => pool.query(text, params ? [...params] : []),
    });
    sessions = new SessionManager(pgAdapter);
  }

  if (cfg.redisUrl) {
    const url = new URL(cfg.redisUrl);
    const driver = await createBullMqDriver({
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
    });
    queueDriver = driver;
    // Register the API-side health handler on the new driver too so
    // jobs enqueued from the API are visible in this process's metrics
    // surface, while the dedicated worker also consumes them.
    await registerHealthHandler(driver);
  }
}

/**
 * DSAR-collected user data store. Real implementations route to background
 * jobs, but the contract is the same: gated by DSAR_ENABLED feature flag.
 */
export interface DsarConfig {
  enabled: boolean;
}
let dsarConfig: DsarConfig = { enabled: false };
export function configureDsar(c: DsarConfig) {
  dsarConfig = c;
}

export const appRouter = router({
  health: router({
    ping: publicProcedure
      .input(z.object({ msg: z.string().default("ping") }).optional())
      .query(({ input }) => ({ ok: true, echo: input?.msg ?? "ping", ts: Date.now() })),

    enqueue: mutatingProcedure
      .input(z.object({ msg: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const id = await queueDriver.enqueue("health", { ping: input.msg, ts: Date.now() });
        // Drain the in-memory driver so tests see deterministic state.
        // BullMQ workers run independently — drain is a no-op there.
        if (queueDriver instanceof InMemoryQueueDriver) await queueDriver.drain();
        return { jobId: id, processed: processedHealthJobs.length };
      }),
  }),

  auth: router({
    signup: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          tenantId: z.string().min(1),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.csrfValid) throw new TRPCError({ code: "FORBIDDEN", message: "CSRF" });
        try {
          const u = await sessions.signup(input);
          return { userId: u.id, tenantId: u.tenantId };
        } catch (err) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err instanceof Error ? err.message : "signup failed",
          });
        }
      }),
    signin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.csrfValid) throw new TRPCError({ code: "FORBIDDEN", message: "CSRF" });
        try {
          const { user, session } = await sessions.signin(input.email, input.password);
          return {
            sessionId: session.id,
            userId: user.id,
            tenantId: user.tenantId,
            expiresAt: session.expiresAt.toISOString(),
          };
        } catch {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "invalid credentials" });
        }
      }),
    // signout is state-changing → use mutatingProcedure so CSRF and
    // session validation are enforced by the same middleware as every
    // other mutation.
    signout: mutatingProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await sessions.signout(input.sessionId);
        return { ok: true };
      }),
  }),

  /**
   * GDPR / CCPA Data Subject Access Requests, gated by DSAR_ENABLED.
   * Real impls dispatch to the @platform/queue worker which streams to
   * S3-compatible storage; here we expose the contract.
   */
  dsar: router({
    export: mutatingProcedure.mutation(async ({ ctx }) => {
      if (!dsarConfig.enabled)
        throw new TRPCError({ code: "FORBIDDEN", message: "DSAR disabled" });
      const jobId = await queueDriver.enqueue("health", {
        ping: `dsar.export:${ctx.userId}`,
        ts: Date.now(),
      });
      return { ok: true, jobId };
    }),
    delete: mutatingProcedure.mutation(async ({ ctx }) => {
      if (!dsarConfig.enabled)
        throw new TRPCError({ code: "FORBIDDEN", message: "DSAR disabled" });
      if (ctx.userId) await sessions.signoutAll(ctx.userId);
      return { ok: true };
    }),
  }),

  me: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    requestId: ctx.requestId,
  })),
});

export type AppRouter = typeof appRouter;
export { TRPCError, middleware };
export type { PlatformContext };
