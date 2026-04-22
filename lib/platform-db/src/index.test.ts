import { describe, expect, it } from "vitest";
import { auditLog, secrets, sessions, tenants, users } from "./schema/index.js";

describe("@platform/db schema", () => {
  it("exports the expected tables", () => {
    for (const t of [tenants, users, sessions, auditLog, secrets]) {
      expect(t).toBeDefined();
    }
  });
});
