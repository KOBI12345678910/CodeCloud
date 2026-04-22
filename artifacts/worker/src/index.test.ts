import { describe, expect, it } from "vitest";
import { InMemoryQueueDriver } from "@platform/queue";

describe("worker smoke", () => {
  it("queues a health-check job end-to-end through the in-memory driver", async () => {
    const driver = new InMemoryQueueDriver();
    let processed = false;
    await driver.process("health", async () => {
      processed = true;
    });
    await driver.enqueue("health", { ping: "test", ts: Date.now() });
    await driver.drain();
    expect(processed).toBe(true);
    await driver.close();
  });
});
