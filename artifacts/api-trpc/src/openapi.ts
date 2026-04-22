import { z } from "zod";

/**
 * Hand-authored OpenAPI 3.1 spec for the public surface area of api-trpc.
 * Kept in sync with the tRPC router by the matching test in router.test.ts.
 *
 * For the foundation we publish a small spec covering health.ping +
 * health.enqueue + me, which is what consumers (and integration tests)
 * actually call. Generating the full spec from tRPC procedures is delegated
 * to a follow-up that wires `trpc-openapi` once the router stops growing.
 */
export const openapiSpec = {
  openapi: "3.1.0",
  info: { title: "Platform API (tRPC)", version: "0.0.0" },
  paths: {
    "/trpc/health.ping": {
      get: {
        operationId: "healthPing",
        responses: {
          "200": {
            description: "Liveness echo",
            content: {
              "application/json": {
                schema: { type: "object", properties: { ok: { type: "boolean" } } },
              },
            },
          },
        },
      },
    },
    "/trpc/health.enqueue": {
      post: {
        operationId: "healthEnqueue",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["msg"],
                properties: { msg: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Job enqueued" } },
      },
    },
    "/trpc/me": {
      get: {
        operationId: "me",
        responses: {
          "200": { description: "Current authenticated subject" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/healthz": {
      get: { operationId: "healthz", responses: { "200": { description: "OK" } } },
    },
    "/readyz": {
      get: { operationId: "readyz", responses: { "200": { description: "Ready" } } },
    },
    "/metrics": {
      get: {
        operationId: "metrics",
        responses: {
          "200": {
            description: "Prometheus exposition format",
            content: { "text/plain": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
} as const;

/** Zod schema mirroring the request body for health.enqueue. */
export const healthEnqueueRequest = z.object({ msg: z.string().min(1) });
