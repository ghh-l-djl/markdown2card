import assert from "node:assert/strict";
import test from "node:test";
import { claimCheckoutActivation, isCheckoutSessionId } from "../src/checkoutActivation";

test("accepts only Stripe Checkout Session identifiers", () => {
  assert.equal(isCheckoutSessionId("cs_test_abc123"), true);
  assert.equal(isCheckoutSessionId("cs_live_abc123"), true);
  assert.equal(isCheckoutSessionId("M2C-secret"), false);
});

test("claims a paid checkout without placing the activation code in the URI", async () => {
  const result = await claimCheckoutActivation("cs_test_abc123", {
    endpoint: "https://example.com/claim",
    request: async (request) => {
      assert.equal(request.body, JSON.stringify({ sessionId: "cs_test_abc123" }));
      return { status: 200, json: { status: "paid", activationCode: "M2C-TEST" } };
    }
  });
  assert.deepEqual(result, { status: "valid", activationCode: "M2C-TEST" });
});

test("does not activate pending or failed checkout sessions", async () => {
  for (const status of ["pending", "failed", "cancelled", "expired"]) {
    const result = await claimCheckoutActivation("cs_test_abc123", {
      endpoint: "https://example.com/claim",
      request: async () => ({ status: 200, json: { status } })
    });
    assert.equal(result.status, status === "pending" ? "unavailable" : "invalid");
  }
});
