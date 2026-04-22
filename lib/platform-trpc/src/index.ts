import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

export interface PlatformContext {
  tenantId: string | null;
  userId: string | null;
  requestId: string;
  csrfValid: boolean;
}

const t = initTRPC.context<PlatformContext>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

export const requireAuth = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const requireCsrf = middleware(({ ctx, next }) => {
  if (!ctx.csrfValid) {
    throw new TRPCError({ code: "FORBIDDEN", message: "CSRF token missing or invalid" });
  }
  return next();
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const mutatingProcedure = protectedProcedure.use(requireCsrf);

export const healthRouter = router({
  ping: publicProcedure
    .input(z.object({ msg: z.string().default("ping") }).optional())
    .query(({ input }) => ({ ok: true, echo: input?.msg ?? "ping", ts: Date.now() })),
});

export type AppRouter = typeof healthRouter;
export { z, TRPCError };
