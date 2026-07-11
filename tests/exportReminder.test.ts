import assert from "node:assert/strict";
import test from "node:test";
import { recordSuccessfulExport } from "../src/exportReminder";

test("reminds on the tenth successful export", () => {
  const result = recordSuccessfulExport({
    exportCount: 9,
    lastSupportReminderExportCount: 0,
    supportReminderDismissed: false
  });
  assert.equal(result.shouldRemind, true);
  assert.equal(result.nextState.exportCount, 10);
  assert.equal(result.nextState.lastSupportReminderExportCount, 10);
});

test("waits twenty more exports before reminding again", () => {
  assert.equal(recordSuccessfulExport({ exportCount: 29, lastSupportReminderExportCount: 10, supportReminderDismissed: false }).shouldRemind, true);
  assert.equal(recordSuccessfulExport({ exportCount: 28, lastSupportReminderExportCount: 10, supportReminderDismissed: false }).shouldRemind, false);
});

test("never reminds after the user dismisses reminders", () => {
  const result = recordSuccessfulExport({
    exportCount: 99,
    lastSupportReminderExportCount: 90,
    supportReminderDismissed: true
  });
  assert.equal(result.shouldRemind, false);
  assert.equal(result.nextState.exportCount, 100);
});

test("recovers from invalid persisted counters", () => {
  const result = recordSuccessfulExport({
    exportCount: Number.NaN,
    lastSupportReminderExportCount: Number.POSITIVE_INFINITY,
    supportReminderDismissed: false
  });
  assert.equal(result.shouldRemind, false);
  assert.equal(result.nextState.exportCount, 1);
  assert.equal(result.nextState.lastSupportReminderExportCount, 0);
});
