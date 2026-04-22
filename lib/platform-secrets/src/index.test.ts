import { describe, expect, it } from "vitest";
import { InMemorySecretVault, decrypt, deriveKey, encrypt } from "./index.js";

describe("@platform/secrets", () => {
  it("round-trips encrypted values", () => {
    const key = deriveKey("test-pass");
    const enc = encrypt("hello world", key);
    expect(enc).not.toContain("hello world");
    expect(decrypt(enc, key)).toBe("hello world");
  });

  it("vault stores, lists, and deletes secrets", async () => {
    const vault = new InMemorySecretVault("dev-pass");
    const ref = { projectId: "p1", key: "API_KEY" };
    await vault.set(ref, "sk_live_xyz");
    expect(await vault.get(ref)).toBe("sk_live_xyz");
    const listed = await vault.list("p1");
    expect(listed).toHaveLength(1);
    expect(listed[0].key).toBe("API_KEY");
    await vault.delete(ref);
    expect(await vault.get(ref)).toBeNull();
  });
});
