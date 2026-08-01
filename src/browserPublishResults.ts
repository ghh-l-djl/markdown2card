export function extractBrowserPublishResults(task: Record<string, unknown>): { successes: string[]; failures: string[] } {
  const states = Array.isArray(task.platformStates)
    ? task.platformStates
    : Array.isArray(task.results)
      ? task.results
      : Array.isArray(task.platforms)
        ? task.platforms
        : [];
  const successes: string[] = [];
  const failures: string[] = [];
  for (const item of states) {
    if (!isRecord(item)) continue;
    const platform = String(item.platform || item.id || "");
    if (!platform) continue;
    const status = String(item.status || "");
    if (item.success === true || status === "success") successes.push(platform);
    if (item.success === false || status === "failed") failures.push(platform);
  }
  return { successes, failures };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
