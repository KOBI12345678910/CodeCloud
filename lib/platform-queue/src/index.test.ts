import { describe, expect, it } from "vitest";
import { InMemoryQueueDriver } from "./index.js";

describe("@platform/queue", () => {
  it("delivers an enqueued job to the registered handler", async () => {
    const driver = new InMemoryQueueDriver();
    const received: string[] = [];
    await driver.process("health", async (p) => {
      received.push(p.ping);
    });
    await driver.enqueue("health", { ping: "hello", ts: Date.now() });
    await driver.drain();
    expect(received).toEqual(["hello"]);
    await driver.close();
  });
});
