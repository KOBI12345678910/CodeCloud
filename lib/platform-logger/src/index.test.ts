import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { pino } from "pino";
import { REDACTION_PATHS, createLogger } from "./index.js";

function captureLogger() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  const log = pino(
    {
      redact: { paths: REDACTION_PATHS, censor: "[REDACTED]" },
      base: null,
      timestamp: false,
    },
    stream,
  );
  return { log, chunks };
}

describe("@platform/logger", () => {
  it("creates a logger", () => {
    const log = createLogger({ service: "test" });
    expect(typeof log.info).toBe("function");
  });

  it("redacts secret-like fields and never writes raw values to stdout", () => {
    const { log, chunks } = captureLogger();
    log.info({ password: "hunter2", token: "abc123", apiKey: "xyz", user: "alice" }, "hi");
    const out = chunks.join("");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("xyz");
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("alice");
  });
});
