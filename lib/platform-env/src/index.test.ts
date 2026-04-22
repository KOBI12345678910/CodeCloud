import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EnvValidationError, commonEnvSchema, loadEnv } from "./index.js";

describe("@platform/env", () => {
  it("parses valid env", () => {
    const env = loadEnv(commonEnvSchema, { NODE_ENV: "test" });
    expect(env.NODE_ENV).toBe("test");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("throws EnvValidationError on missing required vars", () => {
    const schema = z.object({ REQUIRED: z.string() });
    expect(() => loadEnv(schema, {})).toThrow(EnvValidationError);
  });
});
