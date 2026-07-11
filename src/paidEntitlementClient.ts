import { requestUrl } from "obsidian";
import { PaidEntitlementStatus, validatePaidEntitlement } from "./paidEntitlement";

declare const PAID_ENTITLEMENT_API_URL: string;

export function checkPaidEntitlement(activationCode: string): Promise<PaidEntitlementStatus> {
  return validatePaidEntitlement(activationCode, {
    endpoint: PAID_ENTITLEMENT_API_URL,
    request: async (options) => requestUrl(options),
    timeoutMs: 1500
  });
}
