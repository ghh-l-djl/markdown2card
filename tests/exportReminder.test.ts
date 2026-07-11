import assert from "node:assert/strict";
import test from "node:test";
import { recordSuccessfulExport } from "../src/exportReminder";

test("reminds on the first successful export", () => {
  const result = recordSuccessfulExport({
    exportCount: 0,
    lastSupportReminderExportCount: 0
  });
  assert.equal(result.shouldRemind, true);
  assert.equal(result.nextState.exportCount, 1);
  assert.equal(result.nextState.lastSupportReminderExportCount, 1);
});

test("waits two more successful exports before reminding again", () => {
  assert.equal(recordSuccessfulExport({ exportCount: 2, lastSupportReminderExportCount: 1 }).shouldRemind, true);
  assert.equal(recordSuccessfulExport({ exportCount: 1, lastSupportReminderExportCount: 1 }).shouldRemind, false);
});

test("recovers from invalid persisted counters", () => {
  const result = recordSuccessfulExport({
    exportCount: Number.NaN,
    lastSupportReminderExportCount: Number.POSITIVE_INFINITY
  });
  assert.equal(result.shouldRemind, true);
  assert.equal(result.nextState.exportCount, 1);
  assert.equal(result.nextState.lastSupportReminderExportCount, 1);
});

test("recovers when the persisted reminder count exceeds the export count", () => {
  const result = recordSuccessfulExport({
    exportCount: 4,
    lastSupportReminderExportCount: 99
  });
  assert.equal(result.shouldRemind, false);
  assert.equal(result.nextState.exportCount, 5);
  assert.equal(result.nextState.lastSupportReminderExportCount, 4);
});
