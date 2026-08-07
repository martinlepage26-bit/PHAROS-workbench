import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signSession,
  timingSafeEqualStr,
  verifySession,
} from "./auth.ts";

describe("timingSafeEqualStr", () => {
  it("accepts equal secrets", () => {
    assert.equal(timingSafeEqualStr("abc", "abc"), true);
  });
  it("rejects unequal secrets", () => {
    assert.equal(timingSafeEqualStr("abc", "abd"), false);
    assert.equal(timingSafeEqualStr("abc", "ab"), false);
  });
});

describe("session sign/verify", () => {
  it("round-trips a valid session for board id", async () => {
    const secret = "test-secret-value-not-real";
    const boardId = "main";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSession(secret, boardId, exp);
    assert.equal(await verifySession(secret, boardId, token), true);
  });

  it("rejects wrong board, expiry, and tampering", async () => {
    const secret = "test-secret-value-not-real";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSession(secret, "main", exp);
    assert.equal(await verifySession(secret, "other", token), false);
    assert.equal(await verifySession("other-secret", "main", token), false);
    assert.equal(await verifySession(secret, "main", token + "x"), false);
    const expired = await signSession(
      secret,
      "main",
      Math.floor(Date.now() / 1000) - 10
    );
    assert.equal(await verifySession(secret, "main", expired), false);
  });
});
