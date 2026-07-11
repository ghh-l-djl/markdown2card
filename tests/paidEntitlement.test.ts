import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeActivationCode,
  recordSuccessfulExportWithEntitlement,
  validatePaidEntitlement
} from "../src/paidEntitlement";

test("normalizes activation codes without case, spaces, or hyphens", () => {
  assert.equal(
    normalizeActivationCode(" m2c-abcd2 efgh3-jkmn4 pqrst-uvwxy z6789 "),
    "M2CABCD2EFGH3JKMN4PQRSTUVWXYZ6789"
  );
});

test("sends every non-empty saved activation code for authoritative validation", async () => {
  let requested = false;
  const result = await validatePaidEntitlement("not-a-code", {
    endpoint: "https://example.invalid/validate",
    request: async () => {
      requested = true;
      return { status: 200, json: { valid: false } };
    }
  });
  assert.equal(result, "invalid");
  assert.equal(requested, true);
});

test("accepts only a strict boolean validity response", async () => {
  const request = async () => ({ status: 200, json: { valid: true } });
  assert.equal(await validatePaidEntitlement("M2C-ABCD2-EFGH3-JKMN4-PQRST-UVWXY", {
    endpoint: "https://example.invalid/validate",
    request
  }), "valid");

  const malformedRequest = async () => ({ status: 200, json: { valid: "true" } });
  assert.equal(await validatePaidEntitlement("M2C-ABCD2-EFGH3-JKMN4-PQRST-UVWXY", {
    endpoint: "https://example.invalid/validate",
    request: malformedRequest
  }), "unavailable");
});

test("maps request failures and timeouts to unavailable", async () => {
  const failedRequest = async (): Promise<never> => { throw new Error("secret code must not escape"); };
  assert.equal(await validatePaidEntitlement("M2C-ABCD2-EFGH3-JKMN4-PQRST-UVWXY", {
    endpoint: "https://example.invalid/validate",
    request: failedRequest
  }), "unavailable");

  const neverResolves = () => new Promise<{ status: number; json: unknown }>(() => undefined);
  assert.equal(await validatePaidEntitlement("M2C-ABCD2-EFGH3-JKMN4-PQRST-UVWXY", {
    endpoint: "https://example.invalid/validate",
    request: neverResolves,
    timeoutMs: 5
  }), "unavailable");
});

test("valid entitlement suppresses the reminder while retaining its cadence", () => {
  const paid = recordSuccessfulExportWithEntitlement({
    exportCount: 0,
    lastSupportReminderExportCount: 0
  }, "valid");
  assert.equal(paid.shouldRemind, false);
  assert.deepEqual(paid.nextState, {
    exportCount: 1,
    lastSupportReminderExportCount: 0
  });

  const revoked = recordSuccessfulExportWithEntitlement(paid.nextState, "invalid");
  assert.equal(revoked.shouldRemind, true);
  assert.deepEqual(revoked.nextState, {
    exportCount: 2,
    lastSupportReminderExportCount: 2
  });
});

test("invalid and unavailable checks use the local reminder cadence", () => {
  for (const status of ["invalid", "unavailable"] as const) {
    const result = recordSuccessfulExportWithEntitlement({
      exportCount: 0,
      lastSupportReminderExportCount: 0
    }, status);
    assert.equal(result.shouldRemind, true);
  }
});
