import { requestUrl } from "obsidian";
import { createPaidEntitlementChecks, PaidEntitlementStatus } from "./paidEntitlement";

declare const PAID_ENTITLEMENT_API_URL: string;

const paidEntitlementChecks = createPaidEntitlementChecks({
  endpoint: PAID_ENTITLEMENT_API_URL,
  request: async (options) => requestUrl(options)
});

export function checkPaidEntitlement(activationCode: string): Promise<PaidEntitlementStatus> {
  return paidEntitlementChecks.forExport(activationCode);
}

export function checkPaidEntitlementManually(activationCode: string): Promise<PaidEntitlementStatus> {
  return paidEntitlementChecks.manually(activationCode);
}
