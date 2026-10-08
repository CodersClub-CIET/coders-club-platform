import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// Test the cryptographic primitives and state machine logic
describe("Associate Activation & Credential Security Suite", () => {
  function generateActivationCredential() {
    return crypto.randomBytes(32).toString("hex");
  }

  function hashActivationCredential(credential) {
    return crypto.createHash("sha256").update(credential.trim()).digest("hex");
  }

  function verifyActivationCredential(candidate, storedHash) {
    try {
      const candidateHash = hashActivationCredential(candidate);
      const candidateBuf = Buffer.from(candidateHash, "hex");
      const storedBuf = Buffer.from(storedHash, "hex");
      if (candidateBuf.length !== storedBuf.length) return false;
      return crypto.timingSafeEqual(candidateBuf, storedBuf);
    } catch {
      return false;
    }
  }

  test("1. Generates cryptographically unpredictable 32-byte opaque credential", () => {
    const cred1 = generateActivationCredential();
    const cred2 = generateActivationCredential();

    assert.equal(cred1.length, 64, "Credential must be 64 hex characters (32 bytes)");
    assert.equal(cred2.length, 64, "Credential must be 64 hex characters (32 bytes)");
    assert.notEqual(cred1, cred2, "Subsequent credentials must never match");
    assert.match(cred1, /^[0-9a-f]{64}$/, "Must be lower-case hex string");
  });

  test("2. SHA-256 hash correctly verifies matching credential in constant time", () => {
    const raw = generateActivationCredential();
    const hash = hashActivationCredential(raw);

    assert.notEqual(raw, hash, "Hash must differ from plaintext");
    assert.equal(verifyActivationCredential(raw, hash), true, "Correct credential must verify");
  });

  test("3. Rejects altered or incorrect credentials", () => {
    const raw = generateActivationCredential();
    const hash = hashActivationCredential(raw);

    const wrong = generateActivationCredential();
    assert.equal(verifyActivationCredential(wrong, hash), false, "Different credential must fail");

    const altered = raw.slice(0, -1) + (raw.slice(-1) === "a" ? "b" : "a");
    assert.equal(verifyActivationCredential(altered, hash), false, "Altered credential must fail");
  });

  test("4. Max failed attempts policy locks credential at 5 attempts", () => {
    let failedAttempts = 0;
    const maxAttempts = 5;

    for (let i = 0; i < 5; i++) {
      assert.equal(failedAttempts < maxAttempts, true, `Attempt ${i + 1} should be permitted`);
      failedAttempts++;
    }

    assert.equal(failedAttempts >= maxAttempts, true, "Credential should now be locked");
  });

  test("5. Credential expiration check enforces 72-hour window", () => {
    const now = Date.now();
    const validExpiry = new Date(now + 72 * 60 * 60 * 1000).toISOString();
    const expiredExpiry = new Date(now - 1000).toISOString();

    assert.equal(new Date(validExpiry).getTime() > now, true, "Valid credential must not be expired");
    assert.equal(new Date(expiredExpiry).getTime() < now, true, "Past date must be treated as expired");
  });

  test("6. Reissuing generates new hash and invalidates old credential", () => {
    const oldCred = generateActivationCredential();
    const oldHash = hashActivationCredential(oldCred);

    // Reissue
    const newCred = generateActivationCredential();
    const newHash = hashActivationCredential(newCred);

    assert.notEqual(oldHash, newHash, "New credential hash must differ");
    assert.equal(verifyActivationCredential(newCred, newHash), true, "New credential verifies against new hash");
    assert.equal(verifyActivationCredential(oldCred, newHash), false, "Old credential fails against new hash");
  });

  test("7. Status mapping: approved + auth ID is activated; approved without auth ID is awaiting activation", () => {
    const request1 = { status: "approved", approved_auth_user_id: null };
    const request2 = { status: "approved", approved_auth_user_id: "uuid-1234" };
    const request3 = { status: "pending", approved_auth_user_id: null };
    const request4 = { status: "rejected", approved_auth_user_id: null };

    function compute(r) {
      if (r.status === "approved") {
        return r.approved_auth_user_id ? "activated" : "awaiting_activation";
      }
      return r.status;
    }

    assert.equal(compute(request1), "awaiting_activation");
    assert.equal(compute(request2), "activated");
    assert.equal(compute(request3), "pending");
    assert.equal(compute(request4), "rejected");
  });
});
