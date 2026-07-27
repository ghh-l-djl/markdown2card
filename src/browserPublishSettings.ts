import type { BrowserPublishPlatform } from "./types";

export function normalizeBrowserPublishPlatformIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

export function normalizeBrowserPublishPlatforms(value: unknown): BrowserPublishPlatform[] {
  return Array.isArray(value)
    ? value.filter((item): item is BrowserPublishPlatform => typeof item === "object" && item !== null && typeof (item as BrowserPublishPlatform).id === "string" && typeof (item as BrowserPublishPlatform).name === "string")
    : [];
}

export function createBrowserPublishToken(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
