import { ExportReminderState, recordSuccessfulExport } from "./exportReminder";

export type PaidEntitlementStatus = "valid" | "invalid" | "unavailable";
export type SavedPaidEntitlementStatus = PaidEntitlementStatus | "unchecked";

export function resolveSavedPaidEntitlementStatus(
  observedStatus: PaidEntitlementStatus,
  previousStatus: SavedPaidEntitlementStatus
): SavedPaidEntitlementStatus {
  return observedStatus === "unavailable" && previousStatus === "valid"
    ? "valid"
    : observedStatus;
}

interface EntitlementResponse {
  status: number;
  json: unknown;
}

interface ValidatePaidEntitlementOptions {
  endpoint: string;
  request: (request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  }) => Promise<EntitlementResponse>;
  timeoutMs?: number;
}

interface PaidEntitlementChecksOptions {
  endpoint: string;
  request: ValidatePaidEntitlementOptions["request"];
  exportTimeoutMs?: number;
  manualTimeoutMs?: number;
}

interface PaidEntitlementChecks {
  forExport: (activationCode: string) => Promise<PaidEntitlementStatus>;
  manually: (activationCode: string) => Promise<PaidEntitlementStatus>;
}

export function createPaidEntitlementChecks(
  options: PaidEntitlementChecksOptions
): PaidEntitlementChecks {
  const validateWithTimeout = (activationCode: string, timeoutMs: number) => validatePaidEntitlement(
    activationCode,
    {
      endpoint: options.endpoint,
      request: options.request,
      timeoutMs
    }
  );

  return {
    forExport: (activationCode) => validateWithTimeout(activationCode, options.exportTimeoutMs ?? 1500),
    manually: (activationCode) => validateWithTimeout(activationCode, options.manualTimeoutMs ?? 10000)
  };
}

const ACTIVATION_CODE_PATTERN = /^M2C[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{25}$/;

export function normalizeActivationCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}

export function isActivationCodeValid(value: string): boolean {
  return ACTIVATION_CODE_PATTERN.test(normalizeActivationCode(value));
}

export async function validatePaidEntitlement(
  activationCode: string,
  options: ValidatePaidEntitlementOptions
): Promise<PaidEntitlementStatus> {
  const normalizedCode = normalizeActivationCode(activationCode);
  if (!normalizedCode) return "invalid";

  const timeoutMs = options.timeoutMs ?? 1500;
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("entitlement request timed out")), timeoutMs);
  });

  try {
    const response = await Promise.race([
      options.request({
        url: options.endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationCode: normalizedCode })
      }),
      timeout
    ]);
    const valid = response.status === 200
      && typeof response.json === "object"
      && response.json !== null
      && typeof (response.json as { valid?: unknown }).valid === "boolean"
      ? (response.json as { valid: boolean }).valid
      : null;
    return valid === null ? "unavailable" : valid ? "valid" : "invalid";
  } catch {
    return "unavailable";
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export function recordSuccessfulExportWithEntitlement(
  state: ExportReminderState,
  entitlementStatus: PaidEntitlementStatus,
  previousValidationStatus: SavedPaidEntitlementStatus = "unchecked"
): ReturnType<typeof recordSuccessfulExport> & { nextValidationStatus: SavedPaidEntitlementStatus } {
  const suppressReminder = entitlementStatus === "valid"
    || (entitlementStatus === "unavailable" && previousValidationStatus === "valid");
  return {
    ...recordSuccessfulExport(state, suppressReminder),
    nextValidationStatus: resolveSavedPaidEntitlementStatus(entitlementStatus, previousValidationStatus)
  };
}
