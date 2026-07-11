export const FIRST_SUPPORT_REMINDER_EXPORT = 10;
export const SUPPORT_REMINDER_INTERVAL = 20;

export interface ExportReminderState {
  exportCount: number;
  lastSupportReminderExportCount: number;
  supportReminderDismissed: boolean;
}

export function recordSuccessfulExport(state: ExportReminderState): {
  nextState: ExportReminderState;
  shouldRemind: boolean;
} {
  const previousExportCount = Number.isFinite(state.exportCount) ? Math.max(0, state.exportCount) : 0;
  const previousReminderCount = Number.isFinite(state.lastSupportReminderExportCount)
    ? Math.max(0, state.lastSupportReminderExportCount)
    : 0;
  const exportCount = previousExportCount + 1;
  const reachedFirstReminder = exportCount >= FIRST_SUPPORT_REMINDER_EXPORT;
  const exportsSinceReminder = exportCount - previousReminderCount;
  const shouldRemind = !state.supportReminderDismissed
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
