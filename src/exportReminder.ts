export const FIRST_SUPPORT_REMINDER_EXPORT = 1;
export const SUPPORT_REMINDER_INTERVAL = 2;

export interface ExportReminderState {
  exportCount: number;
  lastSupportReminderExportCount: number;
}

export function recordSuccessfulExport(state: ExportReminderState, suppressReminder = false): {
  nextState: ExportReminderState;
  shouldRemind: boolean;
} {
  const previousExportCount = Number.isFinite(state.exportCount) ? Math.max(0, state.exportCount) : 0;
  const previousReminderCount = Number.isFinite(state.lastSupportReminderExportCount)
    ? Math.min(previousExportCount, Math.max(0, state.lastSupportReminderExportCount))
    : 0;
  const exportCount = previousExportCount + 1;
  const reachedFirstReminder = exportCount >= FIRST_SUPPORT_REMINDER_EXPORT;
  const exportsSinceReminder = exportCount - previousReminderCount;
  const shouldRemind = !suppressReminder
    && reachedFirstReminder
    && (previousReminderCount === 0 || exportsSinceReminder >= SUPPORT_REMINDER_INTERVAL);

  return {
    nextState: {
      ...state,
      exportCount,
      lastSupportReminderExportCount: shouldRemind ? exportCount : previousReminderCount
    },
    shouldRemind
  };
}
