import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedBody,
  checkOrigin,
  passwordSchema,
  tokenHash,
  newToken,
} from "@famvault/runtime/security";
import { validStorageKey } from "@famvault/runtime/storage";
test("storage keys reject traversal and unsupported namespaces", () => {
  for (const key of [
    "../secret",
    "originals/../secret",
    "originals\\secret",
    "public/a.jpg",
    "/originals/a.jpg",
  ])
    assert.equal(validStorageKey(key), false);
  assert.equal(validStorageKey("originals/2026/test.jpg"), true);
});
test("password limits respect bcrypt byte length", () => {
  assert.equal(passwordSchema.safeParse("short").success, false);
  assert.equal(passwordSchema.safeParse("😀".repeat(20)).success, false);
  assert.equal(
    passwordSchema.safeParse("a long test passphrase").success,
    true,
  );
});
test("token generation is unpredictable and hashing is deterministic", () => {
  const a = newToken(),
    b = newToken();
  assert.notEqual(a, b);
  assert.equal(tokenHash(a).length, 64);
  assert.notEqual(tokenHash(a), a);
});
test("body limits apply without content-length", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: "123456",
  });
  await assert.rejects(() => boundedBody(request, 5), /too large/);
});
test("mutation origin must match configured origin", () => {
  process.env.APP_URL = "http://localhost:3000";
  assert.throws(
    () =>
      checkOrigin(
        new Request("http://localhost:3000/api", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
      ),
    /origin/,
  );
  checkOrigin(
    new Request("http://localhost:3000/api", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
  );
});
