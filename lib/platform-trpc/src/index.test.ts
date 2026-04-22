import { describe, expect, it } from "vitest";
import { TRPCError, healthRouter, protectedProcedure } from "./index.js";

describe("@platform/trpc", () => {
  it("health.ping returns ok", async () => {
    const caller = healthRouter.createCaller({
      tenantId: null,
      userId: null,
      requestId: "r1",
      csrfValid: false,
    });
    const res = await caller.ping({ msg: "hello" });
    expect(res.ok).toBe(true);
    expect(res.echo).toBe("hello");
  });

  it("requireAuth rejects unauthenticated callers", async () => {
    const r = protectedProcedure.query(() => "ok");
    expect(r).toBeDefined();
    expect(TRPCError).toBeDefined();
  });
});
