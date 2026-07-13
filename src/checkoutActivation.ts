import type { PaidEntitlementStatus } from "./paidEntitlement";

export interface CheckoutClaimResult {
  status: PaidEntitlementStatus;
  activationCode?: string;
}

interface ClaimCheckoutOptions {
  endpoint: string;
  request: (request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  }) => Promise<{ status: number; json: unknown }>;
}

const CHECKOUT_SESSION_PATTERN = /^cs_(test_|live_)[A-Za-z0-9]+$/;

export function isCheckoutSessionId(value: string): boolean {
  return CHECKOUT_SESSION_PATTERN.test(value);
}

export async function claimCheckoutActivation(
  sessionId: string,
  options: ClaimCheckoutOptions
): Promise<CheckoutClaimResult> {
  if (!isCheckoutSessionId(sessionId)) return { status: "invalid" };
  try {
    const response = await options.request({
      url: options.endpoint,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    const body = response.json as { status?: unknown; activationCode?: unknown } | null;
    if (response.status !== 200 || !body || body.status !== "paid" || typeof body.activationCode !== "string") {
      return {
        status: body?.status === "failed" || body?.status === "cancelled" || body?.status === "expired"
          ? "invalid"
          : "unavailable"
      };
    }
    return { status: "valid", activationCode: body.activationCode };
  } catch {
    return { status: "unavailable" };
  }
}
